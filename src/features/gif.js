const {
  TOKEN,
  TARGET_USER_ID,
  TARGET_NICKNAME,
  ENABLE_NICKNAME_SYNC,
  TARGET_REPLY_CHANCE,
  TARGET_REACTION_EMOJI,
  NICKNAME_SYNC_INTERVAL_MS,
  LOG_ALL_MESSAGES,
  LOG_MESSAGE_CONTENT,
  DISCORD_USER_WHITELIST_IDS,
  USE_GEMMA,
  GEMMA_API_KEY,
  GEMMA_MODEL,
  GEMMA_API_BASE_URL,
  GEMMA_TEMPERATURE,
  GEMMA_MAX_OUTPUT_TOKENS,
  GEMMA_SYSTEM_PROMPT,
  GEMMA_STYLE_EXAMPLE_COUNT,
  ENABLE_TEST_COMMAND,
  TEST_COMMAND,
  TEST_COMMAND_REQUIRES_ADMIN,
  ENABLE_GIF_COMMAND,
  GIF_COMMAND,
  GIF_COMMAND_REQUIRES_ADMIN,
  GIPHY_API_KEY,
  GIPHY_API_BASE_URL,
  GIPHY_RATING,
  GIPHY_LANG,
  GIPHY_DEFAULT_QUERY,
  GIPHY_SEARCH_LIMIT,
  GIF_MAX_ATTEMPTS,
  GIF_USE_GEMMA_CONTEXT,
  GIF_CONTEXT_MESSAGE_LIMIT,
  GIF_CONTEXT_MAX_MESSAGE_CHARS,
  GIF_RECENT_FOCUS_MESSAGE_COUNT,
  GIF_ENABLE_CANDIDATE_RERANK,
  GIF_RERANK_CANDIDATE_COUNT,
  GIF_ENABLE_VISION_RERANK,
  GIF_VISION_CANDIDATE_COUNT,
  GIF_LLM_PROVIDER,
  GROQ_API_KEY,
  GROQ_API_BASE_URL,
  GIF_GROQ_MODEL,
  DEFAULT_GROQ_TEXT_FALLBACK_MODELS,
  GROQ_TEXT_FALLBACK_MODELS,
  ENABLE_GEMMA_LLM_FALLBACK,
  GIF_VISION_MODEL,
  ENABLE_ARGUE_COMMAND,
  ARGUE_COMMAND,
  ARGUE_COMMAND_REQUIRES_ADMIN,
  ARGUE_CONTEXT_MESSAGE_LIMIT,
  ARGUE_CONTEXT_MAX_MESSAGE_CHARS,
  ARGUE_INACTIVE_TIMEOUT_MS,
  ARGUE_REPLY_COOLDOWN_MS,
  ARGUE_MAX_BOT_REPLIES,
  ARGUE_MAX_SESSION_MS,
  ARGUE_RESPONSE_MAX_CHARS,
  ARGUE_MODEL,
  ARGUE_REQUESTER_ALIAS_TERMS,
  ARGUE_PERSONAL_ATTACK_TERMS,
  ENABLE_MIMIC_COMMAND,
  MIMIC_COMMAND,
  UNMIMIC_COMMAND,
  MIMIC_RATE_LIMIT_COMMAND,
  MIMIC_COMMAND_REQUIRES_ADMIN,
  MIMIC_DATA_DIR,
  MIMIC_DATA_DIR_ABSOLUTE,
  MIMIC_MODEL,
  MIMIC_MULTILINGUAL_MODEL,
  MIMIC_HISTORY_FETCH_LIMIT,
  MIMIC_CONTEXT_MESSAGE_LIMIT,
  MIMIC_RECENT_EXCHANGE_LIMIT,
  MIMIC_FOLLOWUP_WINDOW_MS,
  MIMIC_IMPLICIT_FOLLOWUP_WINDOW_MS,
  MIMIC_THREAD_LOCK_MS,
  MIMIC_REPLY_COOLDOWN_MS,
  MIMIC_REPLY_MAX_CHARS,
  MIMIC_TEMPERATURE,
  MIMIC_STYLE_MATCH_MIN,
  MIMIC_ORIGINALITY_MIN,
  MIMIC_AUTO_REPLY_CONFIDENCE_MIN,
  MIMIC_FOLLOWUP_REPLY_CONFIDENCE_MIN,
  MIMIC_MAX_EXAMPLES,
  MIMIC_PROFILE_UPDATE_EXAMPLE_COUNT,
  MIMIC_EARLY_PROFILE_EXAMPLE_COUNT,
  MIMIC_EARLY_PROFILE_UPDATE_EXAMPLE_COUNT,
  MIMIC_UNSTABLE_PROFILE_EXAMPLE_COUNT,
  MIMIC_DISCLOSURE_PREFIX,
  MIMIC_AUTO_REPLY_ENABLED
} = require("../config");
const { logEvent, logError } = require("../logger");
const { callGemmaJson, callGroqJson, getLlmMeta } = require("../llm");
const {
  containsNonEnglishScriptText,
  getMessageAuthorLabel,
  getMessageSummary
} = require("../utils");

const giphyRandomIdsByUserId = new Map();

function isGifCommandMessage(content) {
  if (!ENABLE_GIF_COMMAND) return false;
  if (!content?.trim()) return false;

  const normalizedContent = content.trim().toLowerCase();
  const normalizedCommand = GIF_COMMAND.toLowerCase();
  return (
    normalizedContent === normalizedCommand ||
    normalizedContent.startsWith(`${normalizedCommand} `)
  );
}

function parseGifCommandPrompt(content) {
  const inline = content.trim().slice(GIF_COMMAND.length).trim();
  return inline.replace(/\s+/g, " ").slice(0, 50) || null;
}

async function buildGifConversationTranscript(commandMessage) {
  const fetchedMessages = await commandMessage.channel.messages.fetch({
    before: commandMessage.id,
    limit: GIF_CONTEXT_MESSAGE_LIMIT
  });

  const messages = [...fetchedMessages.values()]
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
    .filter((recentMessage) => recentMessage.id !== commandMessage.id);

  if (messages.length === 0) {
    return {
      messageCount: 0,
      transcript: "No prior messages were available."
    };
  }

  return {
    messageCount: messages.length,
    transcript: messages
      .map((recentMessage, index) => {
        const authorLabel = getMessageAuthorLabel(recentMessage);
        const summary = getMessageSummary(recentMessage);
        const isRecentFocus =
          index >= messages.length - GIF_RECENT_FOCUS_MESSAGE_COUNT;
        const recencyLabels = [];
        if (index === messages.length - 1) {
          recencyLabels.push("[PRIMARY REACTION TARGET]");
        }
        if (isRecentFocus) {
          recencyLabels.push("[RECENT FOCUS]");
        }
        const recencyLabel =
          recencyLabels.length > 0 ? ` ${recencyLabels.join(" ")}` : "";
        return `${index + 1}.${recencyLabel} ${authorLabel}: ${summary}`;
      })
      .join("\n")
  };
}


function normalizeGifQuery(text) {
  const trimmed = text.trim();
  let candidate = trimmed;
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (typeof parsed?.query === "string") {
        candidate = parsed.query;
      }
    } catch {
      const queryMatch = jsonMatch[0].match(/"query"\s*:\s*"([^"]+)"/i);
      if (queryMatch) {
        candidate = queryMatch[1];
      }
    }
  } else {
    const backtickMatches = [...trimmed.matchAll(/`([^`]+)`/g)];
    const quotedMatches = [...trimmed.matchAll(/["“]([^"”]+)["”]/g)];
    const shortLine = trimmed
      .split(/\r?\n/)
      .reverse()
      .map((line) => line.replace(/^[-*]\s*/, "").trim())
      .find(
        (line) => line.length > 0 && line.length <= 50 && !line.includes(":")
      );

    if (backtickMatches.length > 0) {
      candidate = backtickMatches[backtickMatches.length - 1][1];
    } else if (quotedMatches.length > 0) {
      candidate = quotedMatches[quotedMatches.length - 1][1];
    } else if (shortLine) {
      candidate = shortLine;
    }
  }

  return candidate
    .replace(/[`"'“”‘’]/g, "")
    .replace(/^giphy query\s*:\s*/i, "")
    .replace(/^query\s*:\s*/i, "")
    .replace(/^[-*]\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);
}

function sanitizeGifSearchQuery(query) {
  const normalized = normalizeGifQuery(query);
  const lowerQuery = normalized.toLowerCase();
  const literalTauntQueries = [
    "shut up",
    "sybau",
    "stfu",
    "shut your",
    "be quiet"
  ];

  if (literalTauntQueries.some((taunt) => lowerQuery.includes(taunt))) {
    return "sassy reaction";
  }

  return normalized;
}

function buildGifQueryPrompt({ commandMessage, userPrompt, transcript }) {
  const requester = getMessageAuthorLabel(commandMessage);

  return [
    "Choose search terms for GIPHY.",
    "Usage context: the requester is reading the live chat and wants to send a GIF right now.",
    "Goal: pick the GIF search query most likely to find a GIF the requester would send as a natural reaction to the current conversation topic.",
    "The line marked [PRIMARY REACTION TARGET] is the most recent message before !gif and has overriding priority.",
    "If [PRIMARY REACTION TARGET] is a clear shift, jab, taunt, insult, command, punchline, or direct challenge, choose a GIF reacting to that message itself, not to the older topic.",
    "For example, if the primary target is someone telling the requester 'sybau' or otherwise telling them to shut up, choose a playful defiant/taunting/comeback reaction such as 'you thought', 'side eye', 'laughing reaction', 'sassy reaction', or 'no you'.",
    "Do not search for the literal insult or command text. Search for the requester's reaction back to it.",
    "Give very heavy weight to the newest messages, especially lines marked [RECENT FOCUS], even when the requester did not write them.",
    "Older messages are background only. Do not choose a query about an older topic if the newest messages have moved on.",
    "Use the requester's optional prompt as direction, but still anchor it to the newest relevant chat context.",
    "Match the conversation's register. If the newest messages are formal, philosophical, analytical, sincere, or serious, choose subtle/thoughtful searches like 'thoughtful reaction', 'deep thinking', 'contemplating', 'interesting point', or 'pondering'.",
    "Do not turn serious or philosophical discussion into goofy confusion, loud image macros, or childish meme reactions unless the newest messages are actually playful or chaotic.",
    "For formal/philosophical chats, favor queries about thinking, contemplation, nuance, agreement, uncertainty, or respect over jokes.",
    "Prefer common reaction GIF wording that GIPHY is likely to understand, such as 'confused reaction', 'awkward silence', 'dramatic gasp', 'side eye', or 'celebration'.",
    "Return exactly this JSON shape and nothing else: {\"query\":\"short search phrase\"}",
    "The query must be 2 to 6 words and max 50 characters.",
    "",
    `Requester: ${requester}`,
    `Optional requester prompt: ${userPrompt || "(none)"}`,
    "",
    "Recent conversation, oldest to newest:",
    transcript
  ].join("\n");
}

function buildGifRetryQueryPrompt({
  commandMessage,
  userPrompt,
  transcript,
  previousQueries,
  failureReason
}) {
  const requester = getMessageAuthorLabel(commandMessage);

  return [
    "Choose a new GIPHY search query for a Discord reaction GIF.",
    "The previous query attempt failed, so return a broader and more reliable reaction GIF query.",
    "Usage context: the requester is reacting to the live edge of the chat.",
    "The line marked [PRIMARY REACTION TARGET] is the most recent message before !gif and has overriding priority.",
    "If [PRIMARY REACTION TARGET] is a clear shift, jab, taunt, insult, command, punchline, or direct challenge, retry with a query reacting to that message itself, not to older context.",
    "For example, if the primary target is someone telling the requester 'sybau' or otherwise telling them to shut up, use a playful defiant/taunting/comeback query such as 'you thought', 'side eye', 'laughing reaction', 'sassy reaction', or 'no you'.",
    "Do not search for the literal insult or command text. Search for the requester's reaction back to it.",
    "Give very heavy weight to the newest messages, especially lines marked [RECENT FOCUS], even when the requester did not write them.",
    "Older messages are background only. Do not retry an older topic if the newest messages have moved on.",
    "Match the conversation's register. If the newest messages are formal, philosophical, analytical, sincere, or serious, use subtle/thoughtful searches like 'thoughtful reaction', 'deep thinking', 'contemplating', 'interesting point', or 'pondering'.",
    "Avoid goofy confusion, loud image macros, and childish meme reactions for serious or philosophical discussion.",
    "Use common GIPHY-friendly reaction terms. Avoid niche names, punctuation, or overly specific phrases.",
    "Return exactly this JSON shape and nothing else: {\"query\":\"short search phrase\"}",
    "The query must be 2 to 6 words and max 50 characters.",
    "",
    `Requester: ${requester}`,
    `Optional requester prompt: ${userPrompt || "(none)"}`,
    `Previous failed queries: ${previousQueries.join(", ") || "(none)"}`,
    `Last failure: ${failureReason || "(unknown)"}`,
    "",
    "Recent conversation, oldest to newest:",
    transcript
  ].join("\n");
}

async function generateContextualGifQuery({ commandMessage, userPrompt }) {
  if (GIF_LLM_PROVIDER === "groq") {
    return generateGroqGifQuery({ commandMessage, userPrompt });
  }

  return generateGemmaGifQuery({ commandMessage, userPrompt });
}

async function generateGemmaGifQuery({ commandMessage, userPrompt }) {
  const context = await buildGifConversationTranscript(commandMessage);
  const endpoint = `${GEMMA_API_BASE_URL}/models/${GEMMA_MODEL}:generateContent?key=${encodeURIComponent(
    GEMMA_API_KEY
  )}`;
  const promptText = buildGifQueryPrompt({
    commandMessage,
    userPrompt,
    transcript: context.transcript
  });

  const payload = {
    systemInstruction: {
      parts: [
        {
          text: "You are a precise Discord GIF search assistant. Return only a short GIPHY search query."
        }
      ]
    },
    contents: [
      {
        role: "user",
        parts: [{ text: promptText }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 32
    }
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(
      `Gemma GIF query request failed (${response.status}): ${bodyText.slice(
        0,
        300
      )}`
    );
  }

  const data = await response.json();
  const candidateText = data?.candidates
    ?.flatMap((candidate) => candidate?.content?.parts ?? [])
    .map((part) => part?.text)
    .find((text) => typeof text === "string" && text.trim());

  if (!candidateText) {
    throw new Error("Gemma returned no GIF query candidate.");
  }

  const query = sanitizeGifSearchQuery(candidateText);
  if (!query) {
    throw new Error("Gemma returned an empty GIF query after normalization.");
  }

  return {
    query,
    transcriptMessageCount: context.messageCount,
    provider: "gemma",
    model: GEMMA_MODEL
  };
}

async function generateGroqGifQuery({ commandMessage, userPrompt }) {
  const context = await buildGifConversationTranscript(commandMessage);
  const promptText = buildGifQueryPrompt({
    commandMessage,
    userPrompt,
    transcript: context.transcript
  });
  const parsed = await callGroqJson({
    model: GIF_GROQ_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a precise Discord GIF search assistant. Return only JSON with one short GIPHY search query."
      },
      {
        role: "user",
        content: promptText
      }
    ],
    temperature: 0.4,
    maxTokens: 32,
    timeoutMs: 8_000
  });

  const query = sanitizeGifSearchQuery(
    typeof parsed.query === "string" ? parsed.query : JSON.stringify(parsed)
  );
  if (!query) {
    throw new Error("Groq returned an empty GIF query after normalization.");
  }

  return {
    query,
    transcriptMessageCount: context.messageCount,
    provider: getLlmMeta(parsed).provider ?? "groq",
    model: getLlmMeta(parsed).model ?? GIF_GROQ_MODEL
  };
}

async function generateGroqRetryGifQuery({
  commandMessage,
  userPrompt,
  previousQueries,
  failureReason
}) {
  const context = await buildGifConversationTranscript(commandMessage);
  const promptText = buildGifRetryQueryPrompt({
    commandMessage,
    userPrompt,
    transcript: context.transcript,
    previousQueries,
    failureReason
  });

  const parsed = await callGroqJson({
    model: GIF_GROQ_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a precise Discord GIF search assistant. Return only JSON with one broader GIPHY search query."
      },
      {
        role: "user",
        content: promptText
      }
    ],
    temperature: 0.8,
    maxTokens: 32,
    timeoutMs: 8_000
  });

  const query = sanitizeGifSearchQuery(
    typeof parsed.query === "string" ? parsed.query : JSON.stringify(parsed)
  );
  if (!query) {
    throw new Error("Groq returned an empty retry GIF query after normalization.");
  }

  return {
    query,
    source:
      getLlmMeta(parsed).provider === "gemma"
        ? "gemma_retry_context_fallback"
        : getLlmMeta(parsed).model === GIF_GROQ_MODEL
          ? "groq_retry_context"
          : "groq_fallback_retry_context",
    provider: getLlmMeta(parsed).provider ?? "groq",
    model: getLlmMeta(parsed).model ?? GIF_GROQ_MODEL,
    contextMessageCount: context.messageCount
  };
}

function getGifCandidateMetadata(gif, index) {
  return {
    choice: index + 1,
    id: gif?.id ?? null,
    title: gif?.title || "Untitled GIF",
    rating: gif?.rating ?? null,
    url: selectGifUrl(gif),
    imageUrl: selectGifPreviewImageUrl(gif),
    username: gif?.username || null,
    source: gif?.source_tld || gif?.source_post_url || null
  };
}

function selectGifPreviewImageUrl(gif) {
  const animatedUrl =
    gif?.images?.fixed_height?.url ||
    gif?.images?.fixed_width?.url ||
    gif?.images?.fixed_height_small?.url ||
    gif?.images?.fixed_width_small?.url ||
    gif?.images?.original?.url ||
    gif?.images?.downsized?.url ||
    null;

  return (
    gif?.images?.fixed_height_still?.url ||
    gif?.images?.fixed_width_still?.url ||
    gif?.images?.downsized_still?.url ||
    gif?.images?.original_still?.url ||
    deriveGiphyStillUrl(animatedUrl) ||
    null
  );
}

function deriveGiphyStillUrl(animatedUrl) {
  if (!animatedUrl || typeof animatedUrl !== "string") return null;

  try {
    const url = new URL(animatedUrl);
    url.pathname = url.pathname.replace(
      /\/(giphy|200|100|200w|100w)\.gif$/i,
      "/$1_s.gif"
    );
    return url.toString();
  } catch {
    return animatedUrl.replace(
      /\/(giphy|200|100|200w|100w)\.gif$/i,
      "/$1_s.gif"
    );
  }
}

function buildGifCandidateSelectionPrompt({
  transcript,
  userPrompt,
  query,
  candidates
}) {
  return [
    "Choose the best GIPHY result for this Discord reaction.",
    "Usage context: the requester is reading the live chat and wants to send a GIF right now.",
    "Goal: select the GIF the requester would most likely send as a natural response to the current conversation topic.",
    "The line marked [PRIMARY REACTION TARGET] is the most recent message before !gif and has overriding priority.",
    "If [PRIMARY REACTION TARGET] is a clear shift, jab, taunt, insult, command, punchline, or direct challenge, choose the candidate that reacts to that message itself, not to older context.",
    "For example, if the primary target is someone telling the requester 'sybau' or otherwise telling them to shut up, prefer a playful defiant/taunting/comeback reaction over a philosophical or confused reaction.",
    "Do not choose candidates that simply restate the insult or command. Choose the requester's reaction back to it.",
    "Give very heavy weight to the newest messages, especially lines marked [RECENT FOCUS], even when the requester did not write them.",
    "Older messages are background only. Do not pick a candidate because it matches an older topic if the newest messages have moved on.",
    "Use the conversation, optional requester prompt, search query, and candidate metadata.",
    "Match the conversation's register. If the newest messages are formal, philosophical, analytical, sincere, or serious, reject goofy confusion, loud image macros, childish meme reactions, and candidates whose title sounds unserious.",
    "For formal/philosophical contexts, choose a candidate only if its title suggests a subtle/thoughtful reaction, such as thinking, pondering, contemplation, interesting point, agreement, uncertainty, or respectful nuance. If the candidates are mainly confusion memes, loud jokes, or image macros, return choice 0.",
    "Prefer candidates whose title clearly matches the intended reaction and tone. Avoid candidates that seem unrelated, too literal in the wrong way, tonally wrong, or unsafe.",
    "If none of the candidates fit both the topic and tone, return choice 0 with a better broad query.",
    "Return exactly this JSON shape and nothing else: {\"choice\":1,\"reason\":\"short reason\",\"betterQuery\":\"optional query if choice is 0\"}",
    "",
    `Optional requester prompt: ${userPrompt || "(none)"}`,
    `GIPHY search query: ${query}`,
    "",
    "Recent conversation, oldest to newest:",
    transcript,
    "",
    "Candidates:",
    candidates
      .map((candidate) =>
        [
          `${candidate.choice}. ${candidate.title}`,
          candidate.rating ? `rating: ${candidate.rating}` : null,
          candidate.username ? `username: ${candidate.username}` : null,
          candidate.source ? `source: ${candidate.source}` : null,
          candidate.url ? `url: ${candidate.url}` : null
        ]
          .filter(Boolean)
          .join(" | ")
      )
      .join("\n")
  ].join("\n");
}

function buildGifVisionSelectionPrompt({
  transcript,
  userPrompt,
  query,
  candidates
}) {
  return [
    "Choose the best visual GIF candidate for this Discord reaction.",
    "You will receive the recent conversation plus numbered candidate preview images.",
    "Usage context: the requester is reading the live chat and wants to send a GIF right now.",
    "Goal: select the GIF the requester would most likely send as a natural visual response to the current conversation topic.",
    "The line marked [PRIMARY REACTION TARGET] is the most recent message before !gif and has overriding priority.",
    "If [PRIMARY REACTION TARGET] is a clear shift, jab, taunt, insult, command, punchline, or direct challenge, choose the candidate that visually reacts to that message itself, not to older context.",
    "Do not choose candidates that simply restate the insult or command. Choose the requester's reaction back to it.",
    "Match the conversation's register. Reject visuals that are tonally wrong, too loud, too goofy, too generic, or visually unrelated.",
    "If none of the candidate images fit both the topic and tone, return choice 0 with a better broad query.",
    "Return exactly this JSON shape and nothing else: {\"choice\":1,\"reason\":\"short reason\",\"betterQuery\":\"optional query if choice is 0\"}",
    "",
    `Optional requester prompt: ${userPrompt || "(none)"}`,
    `GIPHY search query: ${query}`,
    "",
    "Recent conversation, oldest to newest:",
    transcript,
    "",
    "Candidate metadata:",
    candidates
      .map((candidate) =>
        [
          `${candidate.choice}. ${candidate.title}`,
          candidate.rating ? `rating: ${candidate.rating}` : null,
          candidate.username ? `username: ${candidate.username}` : null,
          candidate.source ? `source: ${candidate.source}` : null
        ]
          .filter(Boolean)
          .join(" | ")
      )
      .join("\n")
  ].join("\n");
}

function getPrimaryReactionTargetLine(transcript) {
  return (
    transcript
      .split(/\r?\n/)
      .find((line) => line.includes("[PRIMARY REACTION TARGET]")) ?? ""
  );
}

function isLikelyTauntOrAbruptShiftContext(transcript) {
  const primaryTargetLine = getPrimaryReactionTargetLine(transcript);
  const lowerPrimaryTarget = primaryTargetLine.toLowerCase();
  const tauntMarkers = [
    "shut up",
    "stfu",
    "sybau",
    "kys",
    "lmao",
    "lol",
    "bro",
    "no u",
    "no you",
    "ratio",
    "skill issue",
    "cope",
    "seethe"
  ];

  return tauntMarkers.some((marker) => lowerPrimaryTarget.includes(marker));
}

function isLikelyFormalOrPhilosophicalContext(transcript) {
  const primaryTargetLine = getPrimaryReactionTargetLine(transcript);
  const lowerPrimaryTarget = primaryTargetLine.toLowerCase();
  const formalMarkers = [
    "absolute",
    "alignment",
    "argument",
    "claim",
    "corollary",
    "deconstruction",
    "greater good",
    "logically",
    "merit",
    "nuance",
    "nuanced",
    "philosoph",
    "societal",
    "values"
  ];

  if (isLikelyTauntOrAbruptShiftContext(transcript)) {
    return false;
  }

  const primaryTargetHasFormalMarker = formalMarkers.some((marker) =>
    lowerPrimaryTarget.includes(marker)
  );

  if (
    lowerPrimaryTarget &&
    !primaryTargetHasFormalMarker &&
    lowerPrimaryTarget.length < 120
  ) {
    return false;
  }

  const recentFocusTranscript = transcript
    .split(/\r?\n/)
    .filter((line) => line.includes("[RECENT FOCUS]"))
    .join("\n")
    .toLowerCase();
  const lowerTranscript = recentFocusTranscript || transcript.toLowerCase();

  return formalMarkers.some((marker) => lowerTranscript.includes(marker));
}

function isThoughtfulGifCandidate(gif) {
  const title = (gif?.title ?? "").toLowerCase();
  const thoughtfulMarkers = [
    "agree",
    "contemplat",
    "deep",
    "hmm",
    "interesting",
    "listen",
    "nodding",
    "ponder",
    "serious",
    "think",
    "thought",
    "understand"
  ];
  const goofyMarkers = [
    "cartoon",
    "confused",
    "funny",
    "hold on",
    "huh",
    "lol",
    "meme",
    "panic",
    "shocked",
    "silly",
    "spongebob",
    "wait what",
    "what",
    "wtf"
  ];

  return (
    thoughtfulMarkers.some((marker) => title.includes(marker)) &&
    !goofyMarkers.some((marker) => title.includes(marker))
  );
}

function parseGifCandidateSelection(text, maxChoice) {
  const jsonMatch = text.trim().match(/\{[\s\S]*\}/);
  let rawChoice = null;
  let betterQuery = null;

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      rawChoice = parsed?.choice;
      betterQuery =
        typeof parsed?.betterQuery === "string" ? parsed.betterQuery : null;
    } catch {
      const choiceMatch = jsonMatch[0].match(/"choice"\s*:\s*(\d+)/i);
      rawChoice = choiceMatch ? choiceMatch[1] : null;
      const betterQueryMatch = jsonMatch[0].match(
        /"betterQuery"\s*:\s*"([^"]+)"/i
      );
      betterQuery = betterQueryMatch ? betterQueryMatch[1] : null;
    }
  } else {
    const choiceMatch = text.match(
      /\b(?:choice|candidate|index)\s*:?\s*(\d+)\b/i
    );
    rawChoice = choiceMatch ? choiceMatch[1] : null;
  }

  const choice = Number(rawChoice);
  if (!Number.isInteger(choice) || choice < 0 || choice > maxChoice) {
    throw new Error(`Invalid GIF candidate choice: ${String(rawChoice)}`);
  }

  return {
    index: choice === 0 ? null : choice - 1,
    betterQuery: betterQuery ? normalizeGifQuery(betterQuery) : null
  };
}

async function selectBestGifCandidateWithVision({
  commandMessage,
  userPrompt,
  query,
  candidateRows,
  context
}) {
  const visionRows = candidateRows
    .slice(0, Math.min(GIF_VISION_CANDIDATE_COUNT, candidateRows.length))
    .map(({ gif, originalIndex }) => ({
      gif,
      originalIndex,
      imageUrl: selectGifPreviewImageUrl(gif)
    }))
    .filter(({ imageUrl }) => Boolean(imageUrl));

  if (visionRows.length === 0) {
    throw new Error("No GIPHY candidates had preview image URLs for vision.");
  }

  const candidates = visionRows.map(({ gif, imageUrl }, index) => ({
    ...getGifCandidateMetadata(gif, index),
    imageUrl
  }));
  const promptText = buildGifVisionSelectionPrompt({
    transcript: context.transcript,
    userPrompt,
    query,
    candidates
  });
  const content = [{ type: "text", text: promptText }];

  candidates.forEach((candidate) => {
    content.push({
      type: "text",
      text: `Candidate ${candidate.choice} image: ${candidate.title}`
    });
    content.push({
      type: "image_url",
      image_url: { url: candidate.imageUrl }
    });
  });

  const payload = {
    model: GIF_VISION_MODEL,
    messages: [
      {
        role: "user",
        content
      }
    ],
    temperature: 0.1,
    max_tokens: 80,
    response_format: { type: "json_object" }
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  let response;
  try {
    response = await fetch(`${GROQ_API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(
      `Groq GIF vision selection failed (${response.status}): ${bodyText.slice(
        0,
        300
      )}`
    );
  }

  const data = await response.json();
  const candidateText = data?.choices
    ?.map((choice) => choice?.message?.content)
    .find((text) => typeof text === "string" && text.trim());

  if (!candidateText) {
    throw new Error("Groq vision returned no GIF candidate choice.");
  }

  const selection = parseGifCandidateSelection(candidateText, visionRows.length);
  const selectedRow =
    selection.index === null ? null : visionRows[selection.index];

  return {
    index: selectedRow?.originalIndex ?? null,
    retryQuery: selection.betterQuery,
    source:
      selection.index === null
        ? "groq_vision_candidate_rejected"
        : "groq_vision_candidate_rerank",
    candidateCount: visionRows.length
  };
}

async function selectBestGifCandidate({
  commandMessage,
  userPrompt,
  query,
  gifs
}) {
  if (
    !GIF_ENABLE_CANDIDATE_RERANK ||
    GIF_LLM_PROVIDER !== "groq" ||
    gifs.length <= 1
  ) {
    return {
      index: Math.floor(Math.random() * gifs.length),
      source: GIF_ENABLE_CANDIDATE_RERANK
        ? "random_fallback"
        : "random_disabled"
    };
  }

  const context = await buildGifConversationTranscript(commandMessage);
  const isSeriousContext = isLikelyFormalOrPhilosophicalContext(
    context.transcript
  );
  const candidateRows = gifs
    .slice(0, Math.min(GIF_RERANK_CANDIDATE_COUNT, gifs.length))
    .map((gif, originalIndex) => ({ gif, originalIndex }));
  const toneFilteredRows = isSeriousContext
    ? candidateRows.filter(({ gif }) => isThoughtfulGifCandidate(gif))
    : candidateRows;

  if (toneFilteredRows.length === 0) {
    return {
      index: null,
      retryQuery: "thoughtful reaction",
      source: "serious_context_rejected_candidates",
      candidateCount: candidateRows.length
    };
  }

  if (GIF_ENABLE_VISION_RERANK) {
    try {
      return await selectBestGifCandidateWithVision({
        commandMessage,
        userPrompt,
        query,
        candidateRows: toneFilteredRows,
        context
      });
    } catch (error) {
      logError("gif_vision_rerank_failed_title_rerank_used", error, {
        guildId: commandMessage.guild?.id ?? "dm",
        channelId: commandMessage.channel.id,
        authorId: commandMessage.author.id,
        query,
        model: GIF_VISION_MODEL
      });
    }
  }

  const candidates = toneFilteredRows.map(({ gif }, index) =>
    getGifCandidateMetadata(gif, index)
  );
  const promptText = buildGifCandidateSelectionPrompt({
    transcript: context.transcript,
    userPrompt,
    query,
    candidates
  });

  const parsed = await callGroqJson({
    model: GIF_GROQ_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You select the best GIF candidate for a Discord conversation. Return only JSON."
      },
      {
        role: "user",
        content: promptText
      }
    ],
    temperature: 0.2,
    maxTokens: 48,
    timeoutMs: 8_000
  });

  const selection = parseGifCandidateSelection(
    JSON.stringify(parsed),
    toneFilteredRows.length
  );
  const selectedRow =
    selection.index === null ? null : toneFilteredRows[selection.index];
  const llmMeta = getLlmMeta(parsed);
  return {
    index: selectedRow?.originalIndex ?? null,
    retryQuery: selection.betterQuery,
    source:
      selection.index === null
        ? llmMeta.provider === "gemma"
          ? "gemma_candidate_rejected"
          : llmMeta.model === GIF_GROQ_MODEL
            ? "groq_candidate_rejected"
            : "groq_fallback_candidate_rejected"
        : llmMeta.provider === "gemma"
          ? "gemma_candidate_rerank_fallback"
          : llmMeta.model === GIF_GROQ_MODEL
            ? "groq_candidate_rerank"
            : "groq_fallback_candidate_rerank",
    candidateCount: toneFilteredRows.length
  };
}

async function selectGifSearchQuery({ commandMessage, userPrompt }) {
  if (!GIF_USE_GEMMA_CONTEXT) {
    return {
      query: userPrompt || GIPHY_DEFAULT_QUERY,
      source: userPrompt ? "user_prompt" : "default"
    };
  }

  try {
    const result = await generateContextualGifQuery({
      commandMessage,
      userPrompt
    });

    logEvent("gif_context_query_generated", {
      guildId: commandMessage.guild?.id ?? "dm",
      channelId: commandMessage.channel.id,
      authorId: commandMessage.author.id,
      query: result.query,
      userPrompt,
      contextMessageCount: result.transcriptMessageCount,
      provider: result.provider ?? GIF_LLM_PROVIDER,
      model:
        result.model ??
        (GIF_LLM_PROVIDER === "groq" ? GIF_GROQ_MODEL : GEMMA_MODEL)
    });

    return {
      query: result.query,
      source:
        result.provider === "gemma" && GIF_LLM_PROVIDER === "groq"
          ? "gemma_context_fallback"
          : `${result.provider ?? GIF_LLM_PROVIDER}_context`
    };
  } catch (error) {
    const fallbackQuery = userPrompt || GIPHY_DEFAULT_QUERY;

    logError("gif_context_query_failed_fallback_used", error, {
      guildId: commandMessage.guild?.id ?? "dm",
      channelId: commandMessage.channel.id,
      authorId: commandMessage.author.id,
      fallbackQuery,
      userPrompt
    });

    return {
      query: fallbackQuery,
      source: userPrompt ? "user_prompt_fallback" : "default_fallback"
    };
  }
}

function buildGiphyUrl(path, params) {
  const url = new URL(`${GIPHY_API_BASE_URL}${path}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url;
}

async function getGiphyRandomId(userId) {
  if (giphyRandomIdsByUserId.has(userId)) {
    return giphyRandomIdsByUserId.get(userId);
  }

  const url = buildGiphyUrl("/randomid", { api_key: GIPHY_API_KEY });
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`GIPHY random_id failed (${response.status}).`);
  }

  const data = await response.json();
  const randomId = data?.data?.random_id;

  if (typeof randomId !== "string" || !randomId.trim()) {
    throw new Error("GIPHY random_id response did not include a random_id.");
  }

  giphyRandomIdsByUserId.set(userId, randomId);
  return randomId;
}

async function fireGiphySentAnalytics(gif, randomId) {
  const sentUrl = gif?.analytics?.onsent?.url;
  if (typeof sentUrl !== "string" || !sentUrl) return;

  const url = new URL(sentUrl);
  if (randomId) {
    url.searchParams.set("random_id", randomId);
  }
  url.searchParams.set("ts", String(Date.now()));

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GIPHY sent analytics failed (${response.status}).`);
  }
}

function selectGifUrl(gif) {
  return (
    gif?.url ||
    gif?.images?.original?.url ||
    gif?.images?.downsized?.url ||
    gif?.images?.fixed_height?.url ||
    null
  );
}

async function searchGiphyGifs({ query, randomId }) {
  const offset = Math.floor(Math.random() * 50);
  const url = buildGiphyUrl("/gifs/search", {
    api_key: GIPHY_API_KEY,
    q: query,
    limit: GIPHY_SEARCH_LIMIT,
    offset,
    rating: GIPHY_RATING,
    lang: GIPHY_LANG,
    random_id: randomId,
    bundle: "messaging_non_clips"
  });

  const response = await fetch(url);

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(
      `GIPHY search failed (${response.status}): ${bodyText.slice(0, 300)}`
    );
  }

  const data = await response.json();
  if (data?.meta?.status && data.meta.status !== 200) {
    throw new Error(`GIPHY search failed: ${data.meta.msg}`);
  }

  const gifs = Array.isArray(data?.data) ? data.data : [];
  if (gifs.length === 0) {
    throw new Error(`GIPHY returned no GIFs for "${query}".`);
  }

  return gifs;
}

async function fetchGiphyGif({ commandMessage, userPrompt, query, userId }) {
  let randomId = null;
  try {
    randomId = await getGiphyRandomId(userId);
  } catch (error) {
    logError("giphy_random_id_failed_continuing", error, { userId });
  }

  const gifs = await searchGiphyGifs({ query, randomId });

  let selection;
  try {
    selection = await selectBestGifCandidate({
      commandMessage,
      userPrompt,
      query,
      gifs
    });
  } catch (error) {
    logError("gif_candidate_rerank_failed_random_used", error, {
      guildId: commandMessage.guild?.id ?? "dm",
      channelId: commandMessage.channel.id,
      authorId: userId,
      query
    });

    selection = {
      index: Math.floor(Math.random() * gifs.length),
      source: "random_rerank_failed"
    };
  }

  const gif = gifs[selection.index];
  const gifUrl = selectGifUrl(gif);

  if (!gifUrl) {
    throw new Error("GIPHY result did not include a sendable URL.");
  }

  return {
    id: gif.id ?? null,
    prompt: query,
    randomId,
    title: gif.title ?? null,
    selectionSource: selection.source,
    selectionIndex: selection.index,
    candidateCount: selection.candidateCount ?? gifs.length,
    url: gifUrl,
    analyticsGif: gif
  };
}

async function buildGifAttemptQueries({
  commandMessage,
  userPrompt,
  firstQuery,
  firstQuerySource,
  failedAttempts
}) {
  const queries = [
    {
      query: firstQuery,
      source: firstQuerySource
    }
  ];
  const seenQueries = new Set(
    queries.map((attemptQuery) => attemptQuery.query.toLowerCase())
  );

  while (queries.length < GIF_MAX_ATTEMPTS) {
    let nextQuery = null;
    let source = "fallback";
    const previousQueries = [
      ...queries.map((attemptQuery) => attemptQuery.query),
      ...failedAttempts.map((attempt) => attempt.query)
    ];
    const failureReason = failedAttempts.at(-1)?.error ?? null;
    const previousRetryQuery = failedAttempts.at(-1)?.retryQuery ?? null;

    if (previousRetryQuery && !seenQueries.has(previousRetryQuery.toLowerCase())) {
      nextQuery = previousRetryQuery;
      source = "candidate_rejection_retry";
    }

    if (!nextQuery && GIF_LLM_PROVIDER === "groq" && GROQ_API_KEY) {
      try {
        const retryQuery = await generateGroqRetryGifQuery({
          commandMessage,
          userPrompt,
          previousQueries,
          failureReason
        });
        nextQuery = sanitizeGifSearchQuery(retryQuery.query);
        source = retryQuery.source;
      } catch (error) {
        logError("gif_retry_query_generation_failed", error, {
          guildId: commandMessage.guild?.id ?? "dm",
          channelId: commandMessage.channel.id,
          authorId: commandMessage.author.id,
          previousQueries
        });
      }
    }

    if (!nextQuery) {
      const context = await buildGifConversationTranscript(commandMessage);
      const isTauntContext = isLikelyTauntOrAbruptShiftContext(
        context.transcript
      );
      const fallbackQueries = [
        userPrompt,
        ...(isTauntContext
          ? [
              "sassy reaction",
              "side eye",
              "laughing reaction",
              "you thought",
              "no you"
            ]
          : [
              "thoughtful reaction",
              "deep thinking",
              "contemplating",
              "interesting point",
              "pondering"
            ]),
        "funny reaction",
        "shocked reaction",
        "awkward reaction",
        "facepalm reaction",
        GIPHY_DEFAULT_QUERY,
        "reaction gif"
      ].filter(Boolean);

      nextQuery = fallbackQueries.find(
        (fallbackQuery) => !seenQueries.has(fallbackQuery.toLowerCase())
      );
      source = "static_retry_fallback";
    }

    if (!nextQuery) break;

    const normalizedQuery =
      sanitizeGifSearchQuery(nextQuery) || GIPHY_DEFAULT_QUERY;
    const queryKey = normalizedQuery.toLowerCase();
    if (seenQueries.has(queryKey)) {
      const broaderFallback = "funny reaction";
      if (seenQueries.has(broaderFallback)) break;
      queries.push({ query: broaderFallback, source: "static_retry_fallback" });
      seenQueries.add(broaderFallback);
      continue;
    }

    queries.push({ query: normalizedQuery, source });
    seenQueries.add(queryKey);
  }

  return queries;
}

async function fetchGiphyGifWithRetries({
  commandMessage,
  userPrompt,
  firstQuery,
  firstQuerySource,
  userId
}) {
  let randomId = null;
  try {
    randomId = await getGiphyRandomId(userId);
  } catch (error) {
    logError("giphy_random_id_failed_continuing", error, { userId });
  }

  const failedAttempts = [];

  while (failedAttempts.length < GIF_MAX_ATTEMPTS) {
    const attemptQueries = await buildGifAttemptQueries({
      commandMessage,
      userPrompt,
      firstQuery,
      firstQuerySource,
      failedAttempts
    });
    const currentAttemptQuery = attemptQueries[failedAttempts.length];

    if (!currentAttemptQuery) break;

    try {
      const gifs = await searchGiphyGifs({
        query: currentAttemptQuery.query,
        randomId
      });

      let selection;
      try {
        selection = await selectBestGifCandidate({
          commandMessage,
          userPrompt,
          query: currentAttemptQuery.query,
          gifs
        });
      } catch (error) {
        logError("gif_candidate_rerank_failed_random_used", error, {
          guildId: commandMessage.guild?.id ?? "dm",
          channelId: commandMessage.channel.id,
          authorId: userId,
          query: currentAttemptQuery.query,
          attemptNumber: failedAttempts.length + 1
        });

        selection = {
          index: Math.floor(Math.random() * gifs.length),
          source: "random_rerank_failed"
        };
      }

      if (selection.index === null) {
        const rejectionError = new Error(
          "Groq rejected all GIF candidates as a poor topic or tone match."
        );
        rejectionError.retryQuery = selection.retryQuery;
        throw rejectionError;
      }

      const gif = gifs[selection.index];
      const gifUrl = selectGifUrl(gif);

      if (!gifUrl) {
        throw new Error("GIPHY result did not include a sendable URL.");
      }

      return {
        id: gif.id ?? null,
        prompt: currentAttemptQuery.query,
        randomId,
        title: gif.title ?? null,
        querySource: currentAttemptQuery.source,
        selectionSource: selection.source,
        selectionIndex: selection.index,
        candidateCount: selection.candidateCount ?? gifs.length,
        attemptNumber: failedAttempts.length + 1,
        failedAttempts,
        url: gifUrl,
        analyticsGif: gif
      };
    } catch (error) {
      const failedAttempt = {
        attemptNumber: failedAttempts.length + 1,
        query: currentAttemptQuery.query,
        querySource: currentAttemptQuery.source,
        retryQuery:
          error instanceof Error && error.retryQuery
            ? error.retryQuery
            : undefined,
        error: error instanceof Error ? error.message : String(error)
      };

      failedAttempts.push(failedAttempt);
      logEvent("gif_attempt_failed_retrying", {
        guildId: commandMessage.guild?.id ?? "dm",
        channelId: commandMessage.channel.id,
        authorId: userId,
        ...failedAttempt,
        willRetry: failedAttempts.length < GIF_MAX_ATTEMPTS
      });
    }
  }

  throw new Error(
    `All GIF attempts failed: ${failedAttempts
      .map((attempt) => `${attempt.query}: ${attempt.error}`)
      .join(" | ")}`
  );
}

module.exports = {
  fetchGiphyGifWithRetries,
  fireGiphySentAnalytics,
  isGifCommandMessage,
  parseGifCommandPrompt,
  selectGifSearchQuery
};
