const {
  ARGUE_COMMAND,
  ARGUE_CONTEXT_MESSAGE_LIMIT,
  ARGUE_INACTIVE_TIMEOUT_MS,
  ARGUE_MAX_BOT_REPLIES,
  ARGUE_MAX_SESSION_MS,
  ARGUE_MODEL,
  ARGUE_PERSONAL_ATTACK_TERMS,
  ARGUE_REPLY_COOLDOWN_MS,
  ARGUE_REQUESTER_ALIAS_TERMS,
  ARGUE_RESPONSE_MAX_CHARS,
  ENABLE_ARGUE_COMMAND
} = require("../config");
const { logEvent, logError } = require("../logger");
const { callGroqJson } = require("../llm");
const {
  asStringOrNull,
  contentIncludesTerm,
  getArgumentMessageSummary,
  getMessageAuthorLabel,
  getMessageAuthorName,
  normalizeArgumentReplyText,
  parseModelBoolean,
  parseModelConfidence
} = require("../utils");

const activeArgueSessions = new Map();

function isArgueCommandMessage(content) {
  if (!ENABLE_ARGUE_COMMAND) return false;
  if (!content?.trim()) return false;

  const normalizedContent = content.trim().toLowerCase();
  const normalizedCommand = ARGUE_COMMAND.toLowerCase();
  return (
    normalizedContent === normalizedCommand ||
    normalizedContent.startsWith(`${normalizedCommand} `)
  );
}

function parseArgueCommandInput(content) {
  const inline = content.trim().slice(ARGUE_COMMAND.length).trim();
  const inputParts = inline.split(/\s+/).filter(Boolean);
  const firstWord = inputParts[0]?.toLowerCase() ?? "";
  const stopWords = new Set(["stop", "end", "cancel", "quit"]);

  return {
    action: stopWords.has(firstWord) ? "stop" : "start",
    sessionId: stopWords.has(firstWord)
      ? normalizeArgueSessionId(inputParts[1])
      : null,
    prompt: inline.replace(/\s+/g, " ").slice(0, 500) || null
  };
}

function getArgueSessionKey(channelId, requesterId) {
  return `${channelId}:${requesterId}`;
}

function normalizeArgueSessionId(value) {
  const match = String(value ?? "")
    .trim()
    .match(/[a-z0-9][a-z0-9_-]{1,31}/i);
  return match ? match[0].toLowerCase() : null;
}

function generateArgueSessionId() {
  let sessionId;

  do {
    sessionId = Math.random().toString(36).slice(2, 8);
  } while (
    [...activeArgueSessions.values()].some(
      (session) => session.sessionId === sessionId
    )
  );

  return sessionId;
}

function findArgueSessionById(sessionId, channelId = null) {
  const normalizedSessionId = normalizeArgueSessionId(sessionId);
  if (!normalizedSessionId) return null;

  return (
    [...activeArgueSessions.entries()].find(
      ([, session]) =>
        session.sessionId === normalizedSessionId &&
        (!channelId || session.channelId === channelId)
    ) ?? null
  );
}

function isHardcodedRequesterAliasAttack(message) {
  const content = message.content?.replace(/\s+/g, " ").trim() ?? "";
  if (!content) return false;

  const mentionsRequesterAlias = ARGUE_REQUESTER_ALIAS_TERMS.some((alias) =>
    contentIncludesTerm(content, alias)
  );
  const includesAttack = ARGUE_PERSONAL_ATTACK_TERMS.some((attackTerm) =>
    contentIncludesTerm(content, attackTerm)
  );

  return mentionsRequesterAlias && includesAttack;
}

function buildAliasAttackReply(session) {
  const claim = session.requesterClaim || "the actual point";
  return normalizeArgumentReplyText(
    `Calling Jason stupid is not an argument. If you disagree, answer the point instead: ${claim}`,
    "Calling Jason stupid is not an argument. Answer the actual point."
  );
}

function getArgueOpponentListText(session) {
  const opponentNames = [...session.opponentLabelsById.values()];
  return opponentNames.length > 0 ? opponentNames.join(", ") : "(none yet)";
}

async function addArgueOpponentFromMessage({
  session,
  message,
  reason,
  announce = true
}) {
  if (message.author.id === session.requesterId) return false;
  if (session.opponentUserIds.has(message.author.id)) return false;

  const opponentName = getMessageAuthorName(message);
  session.opponentUserIds.add(message.author.id);
  session.opponentLabelsById.set(message.author.id, opponentName);

  logEvent("argue_opponent_added", {
    guildId: session.guildId,
    channelId: session.channelId,
    sessionId: session.sessionId,
    requesterId: session.requesterId,
    opponentUserId: message.author.id,
    opponentName,
    reason,
    opponents: [...session.opponentLabelsById.values()]
  });

  if (announce) {
    await message.channel
      .send({
        content: `Argument session \`${session.sessionId}\`: added opponent \`${opponentName}\`. Opponents: ${getArgueOpponentListText(session)}.`,
        allowedMentions: { parse: [] }
      })
      .catch((error) => {
        logError("argue_opponent_announce_failed", error, {
          guildId: session.guildId,
          channelId: session.channelId,
          sessionId: session.sessionId,
          opponentUserId: message.author.id
        });
      });
  }

  return true;
}

async function buildArgumentConversationContext(commandMessage) {
  const fetchedMessages = await commandMessage.channel.messages.fetch({
    before: commandMessage.id,
    limit: ARGUE_CONTEXT_MESSAGE_LIMIT
  });

  const messages = [...fetchedMessages.values()]
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
    .filter(
      (recentMessage) =>
        recentMessage.id !== commandMessage.id && !recentMessage.author.bot
    );
  const participantsById = new Map();

  messages.forEach((recentMessage) => {
    if (!participantsById.has(recentMessage.author.id)) {
      participantsById.set(recentMessage.author.id, {
        id: recentMessage.author.id,
        label: getMessageAuthorName(recentMessage)
      });
    }
  });

  if (messages.length === 0) {
    return {
      messageCount: 0,
      participants: [...participantsById.values()],
      transcript: "No prior human messages were available."
    };
  }

  const recentFocusStart = Math.max(0, messages.length - 10);
  return {
    messageCount: messages.length,
    participants: [...participantsById.values()],
    transcript: messages
      .map((recentMessage, index) => {
        const labels = [];
        if (recentMessage.author.id === commandMessage.author.id) {
          labels.push("[REQUESTER]");
        }
        if (index >= recentFocusStart) {
          labels.push("[RECENT]");
        }
        if (index === messages.length - 1) {
          labels.push("[LATEST]");
        }

        const labelText = labels.length > 0 ? ` ${labels.join(" ")}` : "";
        return `${index + 1}.${labelText} ${getMessageAuthorLabel(
          recentMessage
        )} [id=${recentMessage.author.id}]: ${getArgumentMessageSummary(
          recentMessage
        )}`;
      })
      .join("\n")
  };
}

function buildArgueStartPrompt({ commandMessage, userPrompt, context }) {
  const requester = getMessageAuthorLabel(commandMessage);
  const participantList =
    context.participants
      .map((participant) => `${participant.label} [id=${participant.id}]`)
      .join("\n") || "(none)";

  return [
    "You are powering a Discord !argue feature.",
    "Task: decide whether the requester was recently arguing with someone, identify the opponent, and draft one message defending the requester's claim.",
    "The requester explicitly asked for help by sending !argue. Still, only start if the transcript or optional prompt gives you enough context to know what claim to defend.",
    "Give heavy weight to messages marked [RECENT] and [LATEST]. Older messages are background.",
    "The requester must have made or clearly endorsed a claim, unless the optional requester prompt states the claim.",
    "Identify opponents by exact numeric user ID from the participant list. Do not choose random bystanders.",
    "If the requester has not participated and did not include an optional claim, return shouldStart=false.",
    "The opening reply should sound like a person backing up the requester: concise, direct, fair, and grounded in the actual claim.",
    "Do not invent facts, use slurs, target protected traits, use @mentions, ping anyone, or escalate into threats. It can be pointed, but keep it civil.",
    `Keep openingReply under ${ARGUE_RESPONSE_MAX_CHARS} characters.`,
    "Return exactly this JSON shape and nothing else:",
    "{\"shouldStart\":true,\"confidence\":0.85,\"opponentUserIds\":[\"123\"],\"opponentLabels\":[\"name\"],\"argumentTopic\":\"topic\",\"requesterClaim\":\"claim\",\"opponentClaim\":\"claim\",\"openingReply\":\"message\"}",
    "",
    `Requester: ${requester} [id=${commandMessage.author.id}]`,
    `Optional requester prompt: ${userPrompt || "(none)"}`,
    "",
    "Participants:",
    participantList,
    "",
    "Recent conversation, oldest to newest:",
    context.transcript
  ].join("\n");
}

async function analyzeArgueStart({ commandMessage, userPrompt }) {
  const context = await buildArgumentConversationContext(commandMessage);
  const parsed = await callGroqJson({
    model: ARGUE_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You analyze Discord arguments and return only strict JSON for the !argue feature."
      },
      {
        role: "user",
        content: buildArgueStartPrompt({ commandMessage, userPrompt, context })
      }
    ],
    temperature: 0.25,
    maxTokens: 420,
    timeoutMs: 10_000
  });

  const participantIds = new Set(
    context.participants.map((participant) => participant.id)
  );
  const participantLabelsById = new Map(
    context.participants.map((participant) => [
      participant.id,
      participant.label
    ])
  );
  const parsedOpponentLabels = Array.isArray(parsed.opponentLabels)
    ? parsed.opponentLabels.map(String).filter(Boolean).slice(0, 4)
    : [];
  const opponentUserIds = Array.isArray(parsed.opponentUserIds)
    ? parsed.opponentUserIds
        .map((id) => String(id).trim())
        .filter(
          (id) =>
            participantIds.has(id) && id !== String(commandMessage.author.id)
        )
    : [];
  const opponentLabelsById = Object.fromEntries(
    opponentUserIds.map((id, index) => [
      id,
      participantLabelsById.get(id) || parsedOpponentLabels[index] || id
    ])
  );

  return {
    shouldStart: parseModelBoolean(parsed.shouldStart),
    confidence: parseModelConfidence(parsed.confidence),
    opponentUserIds,
    opponentLabelsById,
    argumentTopic: asStringOrNull(parsed.argumentTopic) || "the recent argument",
    requesterClaim:
      asStringOrNull(parsed.requesterClaim) ||
      userPrompt ||
      "the requester's point",
    opponentClaim: asStringOrNull(parsed.opponentClaim) || "the opposing point",
    openingReply: normalizeArgumentReplyText(
      parsed.openingReply,
      "I think they have a point here, and the stronger version of it is worth taking seriously."
    ),
    contextMessageCount: context.messageCount
  };
}

function addArgueSessionHistory(session, actor, text) {
  session.history.push(`${actor}: ${String(text).replace(/\s+/g, " ").trim()}`);
  if (session.history.length > 18) {
    session.history = session.history.slice(-18);
  }
}

function endArgueSession(key, reason, details = {}) {
  const session = activeArgueSessions.get(key);
  if (!session) return;

  activeArgueSessions.delete(key);
  logEvent("argue_session_ended", {
    guildId: session.guildId,
    channelId: session.channelId,
    sessionId: session.sessionId,
    requesterId: session.requesterId,
    opponentNames: session.opponentLabelsById
      ? [...session.opponentLabelsById.values()]
      : [],
    reason,
    botReplyCount: session.botReplyCount,
    ...details
  });
}

function cleanupExpiredArgueSessions(now = Date.now()) {
  for (const [key, session] of activeArgueSessions) {
    if (now - session.lastRelevantAt > ARGUE_INACTIVE_TIMEOUT_MS) {
      endArgueSession(key, "inactive_timeout");
      continue;
    }

    if (now - session.startedAt > ARGUE_MAX_SESSION_MS) {
      endArgueSession(key, "max_session_age");
    }
  }
}

function buildArgueContinuationPrompt({ session, message, elapsedMs }) {
  const speakerLabel = getMessageAuthorLabel(message);
  const speakerId = message.author.id;
  const knownOpponentIds = [...session.opponentUserIds].join(", ") || "(none)";
  const knownOpponentNames = getArgueOpponentListText(session);

  return [
    "You are continuing a Discord !argue session.",
    "Task: decide whether the new message belongs to the same argument. If it does and it challenges the requester's side, write one reply defending the requester.",
    "Ignore random interjections, new topics, memes, logistics, reactions, or side chatter that do not engage the active argument.",
    "Treat messages from known opponent IDs as more likely relevant when they address the topic. Treat other users as bystanders unless they clearly take a side in the same argument.",
    "speakerRole must be one of: requester, opponent, bystander, unrelated.",
    "Only reply when the new message advances or challenges the argument against the requester's claim, or when a bystander clearly takes the opponent's side.",
    "Never write a reply to the requester. If the requester speaks, only update the claim or mark relevance.",
    "If the message indicates the argument is over, return argumentOver=true.",
    "Keep replies concise, civil, and grounded. No @mentions, no pings, no slurs, no threats, no protected-trait attacks, and no invented facts.",
    `Keep reply under ${ARGUE_RESPONSE_MAX_CHARS} characters.`,
    "Return exactly this JSON shape and nothing else:",
    "{\"isRelevant\":true,\"confidence\":0.8,\"speakerRole\":\"opponent\",\"argumentOver\":false,\"shouldReply\":true,\"updatedRequesterClaim\":\"optional\",\"updatedOpponentClaim\":\"optional\",\"reply\":\"message\",\"reason\":\"short\"}",
    "",
    `Requester: ${session.requesterLabel} [id=${session.requesterId}]`,
    `Known opponent IDs: ${knownOpponentIds}`,
    `Known opponent names: ${knownOpponentNames}`,
    `Argument topic: ${session.argumentTopic}`,
    `Requester claim: ${session.requesterClaim}`,
    `Opponent claim: ${session.opponentClaim}`,
    `Seconds since last relevant argument message: ${Math.round(elapsedMs / 1000)}`,
    "",
    "Recent argument exchange since !argue:",
    session.history.join("\n") || "(none)",
    "",
    "New message:",
    `${speakerLabel} [id=${speakerId}]: ${getArgumentMessageSummary(message)}`
  ].join("\n");
}

async function analyzeArgueContinuation({ session, message, elapsedMs }) {
  const parsed = await callGroqJson({
    model: ARGUE_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You classify active Discord arguments and return only strict JSON for the !argue feature."
      },
      {
        role: "user",
        content: buildArgueContinuationPrompt({ session, message, elapsedMs })
      }
    ],
    temperature: 0.3,
    maxTokens: 420,
    timeoutMs: 10_000
  });

  const speakerRole = (
    asStringOrNull(parsed.speakerRole) || "unrelated"
  ).toLowerCase();
  return {
    isRelevant: parseModelBoolean(parsed.isRelevant),
    confidence: parseModelConfidence(parsed.confidence),
    speakerRole,
    argumentOver: parseModelBoolean(parsed.argumentOver),
    shouldReply: parseModelBoolean(parsed.shouldReply),
    updatedRequesterClaim: asStringOrNull(parsed.updatedRequesterClaim),
    updatedOpponentClaim: asStringOrNull(parsed.updatedOpponentClaim),
    reply: normalizeArgumentReplyText(
      parsed.reply,
      "That does not really answer the point they were making."
    ),
    reason: asStringOrNull(parsed.reason)
  };
}

async function startArgueSession(commandMessage, userPrompt) {
  const analysis = await analyzeArgueStart({ commandMessage, userPrompt });
  const canStart =
    analysis.shouldStart &&
    analysis.confidence >= 0.45 &&
    analysis.opponentUserIds.length > 0;

  if (!canStart) {
    logEvent("argue_command_no_clear_argument", {
      guildId: commandMessage.guild?.id ?? "dm",
      channelId: commandMessage.channel.id,
      authorId: commandMessage.author.id,
      confidence: analysis.confidence,
      opponentUserIds: analysis.opponentUserIds,
      contextMessageCount: analysis.contextMessageCount
    });

    await commandMessage.reply({
      content:
        "I can't tell which argument to jump into from the recent messages.",
      allowedMentions: { parse: [], repliedUser: false }
    });
    return;
  }

  const key = getArgueSessionKey(
    commandMessage.channel.id,
    commandMessage.author.id
  );
  const now = Date.now();
  const sessionId = generateArgueSessionId();
  const session = {
    key,
    sessionId,
    guildId: commandMessage.guild?.id ?? "dm",
    channelId: commandMessage.channel.id,
    requesterId: commandMessage.author.id,
    requesterLabel: getMessageAuthorLabel(commandMessage),
    opponentUserIds: new Set(analysis.opponentUserIds),
    opponentLabelsById: new Map(Object.entries(analysis.opponentLabelsById)),
    argumentTopic: analysis.argumentTopic,
    requesterClaim: analysis.requesterClaim,
    opponentClaim: analysis.opponentClaim,
    startedAt: now,
    lastRelevantAt: now,
    lastBotReplyAt: 0,
    botReplyCount: 0,
    history: []
  };

  addArgueSessionHistory(
    session,
    "session",
    `topic=${session.argumentTopic}; requesterClaim=${session.requesterClaim}; opponentClaim=${session.opponentClaim}`
  );

  await commandMessage.channel.send({
    content: `Starting argument session \`${session.sessionId}\`. Opponents: ${getArgueOpponentListText(session)}. Stop it with \`${ARGUE_COMMAND} stop ${session.sessionId}\`.`,
    allowedMentions: { parse: [] }
  });

  await commandMessage.channel.send({
    content: analysis.openingReply,
    allowedMentions: { parse: [] }
  });
  session.botReplyCount += 1;
  session.lastBotReplyAt = Date.now();
  addArgueSessionHistory(session, "bot", analysis.openingReply);
  if (activeArgueSessions.has(key)) {
    endArgueSession(key, "replaced_by_new_argue_command");
  }
  activeArgueSessions.set(key, session);

  logEvent("argue_session_started", {
    guildId: commandMessage.guild?.id ?? "dm",
    channelId: commandMessage.channel.id,
    sessionId: session.sessionId,
    requesterId: commandMessage.author.id,
    opponentUserIds: analysis.opponentUserIds,
    opponentNames: [...session.opponentLabelsById.values()],
    confidence: analysis.confidence,
    argumentTopic: analysis.argumentTopic,
    contextMessageCount: analysis.contextMessageCount,
    model: ARGUE_MODEL
  });
}

async function stopArgueSessionForMessage(message, sessionId = null) {
  const matchedSession = sessionId
    ? findArgueSessionById(sessionId, message.channel.id)
    : null;
  const key = matchedSession
    ? matchedSession[0]
    : getArgueSessionKey(message.channel.id, message.author.id);
  const session = activeArgueSessions.get(key);

  if (session) {
    endArgueSession(key, sessionId ? "manual_stop_by_id" : "manual_stop", {
      stoppedByUserId: message.author.id
    });
  }

  await message.reply({
    content: session
      ? `Argument session \`${session.sessionId}\` stopped.`
      : sessionId
        ? `I couldn't find an active argument session with id \`${sessionId}\` in this channel.`
        : "You don't have an active argument session in this channel.",
    allowedMentions: { parse: [], repliedUser: false }
  });
}

async function handleActiveArgueSessions(message) {
  if (!ENABLE_ARGUE_COMMAND || activeArgueSessions.size === 0) return false;

  cleanupExpiredArgueSessions(message.createdTimestamp || Date.now());

  for (const [key, session] of activeArgueSessions) {
    if (session.channelId !== message.channel.id) continue;

    const now = message.createdTimestamp || Date.now();
    const elapsedMs = now - session.lastRelevantAt;
    if (elapsedMs > ARGUE_INACTIVE_TIMEOUT_MS) {
      endArgueSession(key, "inactive_before_message", {
        elapsedMs
      });
      continue;
    }

    if (now - session.startedAt > ARGUE_MAX_SESSION_MS) {
      endArgueSession(key, "max_session_age_before_message");
      continue;
    }

    if (message.author.id === session.requesterId) {
      session.lastRelevantAt = now;
      addArgueSessionHistory(
        session,
        `${getMessageAuthorLabel(message)} [requester]`,
        getArgumentMessageSummary(message)
      );
      logEvent("argue_requester_message_tracked_no_reply", {
        guildId: message.guild?.id ?? "dm",
        channelId: message.channel.id,
        sessionId: session.sessionId,
        requesterId: session.requesterId
      });
      return true;
    }

    const aliasAttack = isHardcodedRequesterAliasAttack(message);
    let decision;
    try {
      decision = await analyzeArgueContinuation({
        session,
        message,
        elapsedMs
      });
    } catch (error) {
      if (aliasAttack) {
        decision = {
          isRelevant: true,
          confidence: 1,
          speakerRole: "opponent",
          argumentOver: false,
          shouldReply: true,
          updatedRequesterClaim: null,
          updatedOpponentClaim: null,
          reply: buildAliasAttackReply(session),
          reason: "hardcoded requester alias attack"
        };
      } else {
        logError("argue_continuation_analysis_failed", error, {
          guildId: message.guild?.id ?? "dm",
          channelId: message.channel.id,
          authorId: message.author.id,
          requesterId: session.requesterId,
          model: ARGUE_MODEL
        });
        continue;
      }
    }

    if (aliasAttack) {
      decision = {
        ...decision,
        isRelevant: true,
        confidence: Math.max(decision.confidence, 0.95),
        speakerRole: "opponent",
        argumentOver: false,
        shouldReply: true,
        reply: buildAliasAttackReply(session),
        reason: decision.reason
          ? `hardcoded requester alias attack; ${decision.reason}`
          : "hardcoded requester alias attack"
      };
    }

    if (decision.argumentOver) {
      endArgueSession(key, "model_detected_argument_over", {
        speakerRole: decision.speakerRole,
        confidence: decision.confidence,
        reason: decision.reason
      });
      return decision.isRelevant;
    }

    if (!decision.isRelevant || decision.confidence < 0.4) {
      logEvent("argue_message_ignored_unrelated", {
        guildId: message.guild?.id ?? "dm",
        channelId: message.channel.id,
        authorId: message.author.id,
        requesterId: session.requesterId,
        speakerRole: decision.speakerRole,
        confidence: decision.confidence,
        reason: decision.reason
      });
      continue;
    }

    session.lastRelevantAt = now;
    if (decision.updatedRequesterClaim) {
      session.requesterClaim = decision.updatedRequesterClaim;
    }
    if (decision.updatedOpponentClaim) {
      session.opponentClaim = decision.updatedOpponentClaim;
    }
    addArgueSessionHistory(
      session,
      `${getMessageAuthorLabel(message)} [${decision.speakerRole}]`,
      getArgumentMessageSummary(message)
    );

    if (
      aliasAttack ||
      decision.speakerRole === "opponent" ||
      (decision.shouldReply && decision.speakerRole === "bystander")
    ) {
      await addArgueOpponentFromMessage({
        session,
        message,
        reason: aliasAttack ? "requester_alias_attack" : decision.speakerRole
      });
    }

    if (!decision.shouldReply) {
      logEvent("argue_message_relevant_no_reply", {
        guildId: message.guild?.id ?? "dm",
        channelId: message.channel.id,
        authorId: message.author.id,
        requesterId: session.requesterId,
        speakerRole: decision.speakerRole,
        confidence: decision.confidence,
        reason: decision.reason
      });
      return true;
    }

    if (session.botReplyCount >= ARGUE_MAX_BOT_REPLIES) {
      endArgueSession(key, "max_bot_replies");
      return true;
    }

    const cooldownRemainingMs =
      ARGUE_REPLY_COOLDOWN_MS - (Date.now() - session.lastBotReplyAt);
    if (!aliasAttack && cooldownRemainingMs > 0) {
      logEvent("argue_reply_skipped_cooldown", {
        guildId: message.guild?.id ?? "dm",
        channelId: message.channel.id,
        authorId: message.author.id,
        requesterId: session.requesterId,
        cooldownRemainingMs,
        speakerRole: decision.speakerRole
      });
      return true;
    }

    try {
      await message.channel.sendTyping().catch(() => null);
      await message.reply({
        content: decision.reply,
        allowedMentions: { parse: [], repliedUser: false }
      });
      session.botReplyCount += 1;
      session.lastBotReplyAt = Date.now();
      addArgueSessionHistory(session, "bot", decision.reply);

      logEvent("argue_reply_sent", {
        guildId: message.guild?.id ?? "dm",
        channelId: message.channel.id,
        authorId: message.author.id,
        requesterId: session.requesterId,
        speakerRole: decision.speakerRole,
        botReplyCount: session.botReplyCount,
        confidence: decision.confidence,
        reason: decision.reason
      });
    } catch (error) {
      logError("argue_reply_send_failed", error, {
        guildId: message.guild?.id ?? "dm",
        channelId: message.channel.id,
        authorId: message.author.id,
        requesterId: session.requesterId
      });
    }

    return true;
  }

  return false;
}

module.exports = {
  cleanupExpiredArgueSessions,
  handleActiveArgueSessions,
  isArgueCommandMessage,
  parseArgueCommandInput,
  startArgueSession,
  stopArgueSessionForMessage
};
