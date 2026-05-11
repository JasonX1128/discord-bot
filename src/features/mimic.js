const fs = require("fs");
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
const { callGroqJson, getLlmMeta } = require("../llm");
const {
  asStringOrNull,
  containsNonEnglishScriptText,
  contentIncludesTerm,
  getArgumentMessageSummary,
  getMessageAuthorLabel,
  getMessageAuthorName,
  normalizeArgumentReplyText,
  parseModelBoolean,
  parseModelConfidence
} = require("../utils");

function createMimicFeature({ client }) {
  const activeMimicSessions = new Map();

  function isMimicCommandMessage(content) {
    if (!ENABLE_MIMIC_COMMAND) return false;
    if (!content?.trim()) return false;

    const normalizedContent = content.trim().toLowerCase();
    const normalizedCommand = MIMIC_COMMAND.toLowerCase();
    return (
      normalizedContent === normalizedCommand ||
      normalizedContent.startsWith(`${normalizedCommand} `)
    );
  }

  function isUnmimicCommandMessage(content) {
    if (!ENABLE_MIMIC_COMMAND) return false;
    if (!content?.trim()) return false;

    const normalizedContent = content.trim().toLowerCase();
    const normalizedCommand = UNMIMIC_COMMAND.toLowerCase();
    return (
      normalizedContent === normalizedCommand ||
      normalizedContent.startsWith(`${normalizedCommand} `)
    );
  }

  function isMimicRateLimitCommandMessage(content) {
    if (!ENABLE_MIMIC_COMMAND) return false;
    if (!content?.trim()) return false;

    const normalizedContent = content.trim().toLowerCase();
    const normalizedCommand = MIMIC_RATE_LIMIT_COMMAND.toLowerCase();
    return (
      normalizedContent === normalizedCommand ||
      normalizedContent.startsWith(`${normalizedCommand} `)
    );
  }

  function parseMimicCommandInput(content) {
    return content.trim().slice(MIMIC_COMMAND.length).trim();
  }

  function parseUnmimicCommandInput(content) {
    return content.trim().slice(UNMIMIC_COMMAND.length).trim();
  }

  function parseMimicRateLimitCommandInput(content) {
    return content.trim().slice(MIMIC_RATE_LIMIT_COMMAND.length).trim();
  }

  function getMimicSessionKey(channelId) {
    return channelId;
  }

  function getMimicProfilePath(guildId, userId) {
    return path.join(MIMIC_DATA_DIR_ABSOLUTE, `${guildId}_${userId}.json`);
  }

  async function ensureMimicDataDir() {
    await fs.promises.mkdir(MIMIC_DATA_DIR_ABSOLUTE, { recursive: true });
  }

  function createDefaultMimicProfile({ guildId, userId, username, displayName }) {
    const now = new Date().toISOString();
    return {
      schemaVersion: 1,
      guildId,
      userId,
      username,
      displayName,
      createdAt: now,
      updatedAt: now,
      profileUpdatedAt: null,
      profileExampleCountAtLastUpdate: 0,
      profileSummary: "",
      styleNotes: [],
      orthographyNotes: [],
      punctuationNotes: [],
      interests: [],
      recurringPhrases: [],
      doNotOverdo: [],
      examplesSinceProfileUpdate: 0,
      examples: []
    };
  }

  async function loadMimicProfile({ guildId, user, displayName }) {
    await ensureMimicDataDir();

    const profilePath = getMimicProfilePath(guildId, user.id);
    let profile = null;

    try {
      profile = JSON.parse(await fs.promises.readFile(profilePath, "utf8"));
    } catch (error) {
      if (error?.code !== "ENOENT") {
        logError("mimic_profile_load_failed_new_profile_used", error, {
          guildId,
          userId: user.id
        });
      }
    }

    if (!profile || typeof profile !== "object") {
      profile = createDefaultMimicProfile({
        guildId,
        userId: user.id,
        username: user.username,
        displayName
      });
    }

    profile.guildId = guildId;
    profile.userId = user.id;
    profile.username = user.username;
    profile.displayName = displayName;
    profile.updatedAt = new Date().toISOString();
    profile.examples = Array.isArray(profile.examples) ? profile.examples : [];
    profile.styleNotes = Array.isArray(profile.styleNotes)
      ? profile.styleNotes
      : [];
    profile.orthographyNotes = Array.isArray(profile.orthographyNotes)
      ? profile.orthographyNotes
      : [];
    profile.punctuationNotes = Array.isArray(profile.punctuationNotes)
      ? profile.punctuationNotes
      : [];
    profile.interests = Array.isArray(profile.interests) ? profile.interests : [];
    profile.recurringPhrases = Array.isArray(profile.recurringPhrases)
      ? profile.recurringPhrases
      : [];
    profile.doNotOverdo = Array.isArray(profile.doNotOverdo)
      ? profile.doNotOverdo
      : [];
    profile.examplesSinceProfileUpdate = Number(
      profile.examplesSinceProfileUpdate ?? 0
    );
    const profileExampleCountAtLastUpdate = Number(
      profile.profileExampleCountAtLastUpdate
    );
    profile.profileExampleCountAtLastUpdate = Number.isFinite(
      profileExampleCountAtLastUpdate
    )
      ? profileExampleCountAtLastUpdate
      : 0;

    return profile;
  }

  async function saveMimicProfile(profile) {
    await ensureMimicDataDir();
    profile.updatedAt = new Date().toISOString();
    const profilePath = getMimicProfilePath(profile.guildId, profile.userId);
    await fs.promises.writeFile(
      profilePath,
      `${JSON.stringify(profile, null, 2)}\n`,
      "utf8"
    );
    return profilePath;
  }

  function normalizeMimicExampleFromMessage(message) {
    const content = message.content?.replace(/\s+/g, " ").trim() || "";
    const attachmentSummary =
      message.attachments.size > 0
        ? ` [${message.attachments.size} attachment(s)]`
        : "";
    const stickerSummary =
      message.stickers.size > 0 ? ` [${message.stickers.size} sticker(s)]` : "";
    const text = `${content}${attachmentSummary}${stickerSummary}`.trim();

    if (!text || text.startsWith("!")) return null;

    return {
      id: message.id,
      channelId: message.channel.id,
      guildId: message.guild?.id ?? "dm",
      content: text.slice(0, 1200),
      createdTimestamp: message.createdTimestamp,
      createdAt: new Date(message.createdTimestamp).toISOString()
    };
  }

  function addMimicExamplesToProfile(profile, messages) {
    const existingIds = new Set(profile.examples.map((example) => example.id));
    let addedCount = 0;

    messages.forEach((message) => {
      const example = normalizeMimicExampleFromMessage(message);
      if (!example || existingIds.has(example.id)) return;

      profile.examples.push(example);
      existingIds.add(example.id);
      addedCount += 1;
    });

    profile.examples.sort(
      (a, b) => Number(a.createdTimestamp ?? 0) - Number(b.createdTimestamp ?? 0)
    );
    if (profile.examples.length > MIMIC_MAX_EXAMPLES) {
      profile.examples = profile.examples.slice(-MIMIC_MAX_EXAMPLES);
    }
    profile.examplesSinceProfileUpdate += addedCount;

    return addedCount;
  }

  async function collectRecentMimicExamples(commandMessage, targetUserId) {
    const fetchedMessages = await commandMessage.channel.messages.fetch({
      limit: MIMIC_HISTORY_FETCH_LIMIT
    });

    return [...fetchedMessages.values()]
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
      .filter(
        (recentMessage) =>
          recentMessage.author.id === targetUserId && !recentMessage.author.bot
      );
  }

  function extractDiscordUserIdFromText(text) {
    const match = String(text ?? "").match(/<@!?(\d{17,22})>|(\d{17,22})/);
    return match ? match[1] || match[2] : null;
  }

  async function resolveMimicTarget(message, inlineInput) {
    let targetUser = message.mentions.users.first() ?? null;
    let referencedMessage = null;

    if (!targetUser && message.reference?.messageId) {
      referencedMessage = await message.fetchReference().catch(() => null);
      targetUser = referencedMessage?.author ?? null;
    }

    if (!targetUser) {
      const targetUserId = extractDiscordUserIdFromText(inlineInput);
      if (targetUserId) {
        targetUser = await client.users.fetch(targetUserId).catch(() => null);
      }
    }

    if (!targetUser && message.guild && inlineInput?.trim()) {
      const normalizedQuery = inlineInput
        .replace(/<@!?\d{17,22}>/g, "")
        .trim()
        .toLowerCase();

      if (normalizedQuery) {
        const cachedMember = message.guild.members.cache.find((member) => {
          const displayName = member.displayName?.toLowerCase() ?? "";
          const username = member.user.username?.toLowerCase() ?? "";
          return displayName === normalizedQuery || username === normalizedQuery;
        });
        targetUser = cachedMember?.user ?? null;
      }
    }

    if (!targetUser) {
      return {
        error:
          "Tell me who to mimic with a mention, user ID, exact cached username, or by replying to one of their messages."
      };
    }

    if (targetUser.bot) {
      return { error: "I won't mimic bot accounts." };
    }

    const targetMember = message.guild
      ? await message.guild.members.fetch(targetUser.id).catch(() => null)
      : null;
    const displayName =
      targetMember?.displayName || targetUser.globalName || targetUser.username;

    return { user: targetUser, member: targetMember, displayName, referencedMessage };
  }

  function normalizeStringArray(value, maxItems = 12) {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => String(item).replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, maxItems);
  }

  function getMimicProfileStyleMetrics(profileOrExamples) {
    const examples = Array.isArray(profileOrExamples)
      ? profileOrExamples
      : profileOrExamples?.examples;
    const texts = (Array.isArray(examples) ? examples : [])
      .map((example) => String(example?.content ?? "").trim())
      .filter(Boolean)
      .filter((text) => !/^\[\d+ attachment\(s\)\]$/i.test(text));

    const metrics = {
      messageCount: texts.length,
      avgChars: 0,
      apostropheMessages: 0,
      gDroppedMessages: 0,
      terminalPeriodMessages: 0,
      terminalPunctuationMessages: 0,
      formalPunctuationMarks: 0,
      lowercaseStartMessages: 0,
      allCapsMessages: 0,
      exampleApostrophes: [],
      exampleGDrops: []
    };

    if (texts.length === 0) return metrics;

    let charTotal = 0;
    for (const text of texts) {
      const withoutUrls = text.replace(/https?:\/\/\S+/gi, "").trim();
      charTotal += withoutUrls.length;

      const apostrophes = [
        ...withoutUrls.matchAll(/\b[\p{L}\p{N}]+['’][\p{L}\p{N}]+\b/gu)
      ].map((match) => match[0]);
      if (apostrophes.length > 0) {
        metrics.apostropheMessages += 1;
        metrics.exampleApostrophes.push(...apostrophes.slice(0, 3));
      }

      const gDrops = [
        ...withoutUrls.matchAll(
          /\b(?:[a-z]{3,}in['’]|goin|doin|sayin|thinkin|talkin|lookin|workin|playin|tryin|somethin|nothin|anythin|everythin)\b/giu
        )
      ].map((match) => match[0]);
      if (gDrops.length > 0) {
        metrics.gDroppedMessages += 1;
        metrics.exampleGDrops.push(...gDrops.slice(0, 3));
      }

      if (/[.]$/.test(withoutUrls)) metrics.terminalPeriodMessages += 1;
      if (/[.!?。！？]$/.test(withoutUrls)) {
        metrics.terminalPunctuationMessages += 1;
      }

      metrics.formalPunctuationMarks += (
        withoutUrls.match(/[.,;:]/g) ?? []
      ).length;

      const firstLetter = withoutUrls.match(/\p{L}/u)?.[0] ?? "";
      if (firstLetter && firstLetter === firstLetter.toLowerCase()) {
        metrics.lowercaseStartMessages += 1;
      }

      const letters = withoutUrls.match(/\p{L}/gu) ?? [];
      if (
        letters.length >= 3 &&
        letters.every((letter) => letter === letter.toUpperCase())
      ) {
        metrics.allCapsMessages += 1;
      }
    }

    metrics.avgChars = Math.round(charTotal / texts.length);
    metrics.apostropheRatio = metrics.apostropheMessages / texts.length;
    metrics.gDropRatio = metrics.gDroppedMessages / texts.length;
    metrics.terminalPeriodRatio = metrics.terminalPeriodMessages / texts.length;
    metrics.terminalPunctuationRatio =
      metrics.terminalPunctuationMessages / texts.length;
    metrics.formalPunctuationPerMessage =
      metrics.formalPunctuationMarks / texts.length;
    metrics.lowercaseStartRatio = metrics.lowercaseStartMessages / texts.length;
    metrics.allCapsRatio = metrics.allCapsMessages / texts.length;
    metrics.exampleApostrophes = [...new Set(metrics.exampleApostrophes)].slice(
      0,
      8
    );
    metrics.exampleGDrops = [...new Set(metrics.exampleGDrops)].slice(0, 8);

    return metrics;
  }

  function formatRatio(value) {
    return `${Math.round(Number(value ?? 0) * 100)}%`;
  }

  function formatMimicStyleMetrics(metrics) {
    if (!metrics.messageCount) return "No measured writing-style examples yet.";

    return [
      `messages=${metrics.messageCount}`,
      `avgChars=${metrics.avgChars}`,
      `lowercaseStart=${formatRatio(metrics.lowercaseStartRatio)}`,
      `apostropheContractions=${metrics.apostropheMessages}/${metrics.messageCount} (${formatRatio(metrics.apostropheRatio)})`,
      `gDropping=${metrics.gDroppedMessages}/${metrics.messageCount} (${formatRatio(metrics.gDropRatio)})`,
      `terminalPeriods=${metrics.terminalPeriodMessages}/${metrics.messageCount} (${formatRatio(metrics.terminalPeriodRatio)})`,
      `anyTerminalPunctuation=${metrics.terminalPunctuationMessages}/${metrics.messageCount} (${formatRatio(metrics.terminalPunctuationRatio)})`,
      `formalPunctuationMarksPerMessage=${metrics.formalPunctuationPerMessage.toFixed(2)}`,
      `apostropheExamples=${metrics.exampleApostrophes.join(", ") || "(none)"}`,
      `gDropExamples=${metrics.exampleGDrops.join(", ") || "(none)"}`
    ].join("; ");
  }

  function buildMimicProfileUpdatePrompt(profile) {
    const newExampleCount = Math.max(0, Number(profile.examplesSinceProfileUpdate ?? 0));
    const newestExamples = profile.examples
      .slice(-Math.min(Math.max(newExampleCount, 1), 40))
      .map((example, index) => `${index + 1}. ${example.content}`)
      .join("\n");
    const broadExamples = profile.examples
      .slice(-100)
      .map((example, index) => `${index + 1}. ${example.content}`)
      .join("\n");
    const examplesAtLastUpdate = Number(
      profile.profileExampleCountAtLastUpdate ?? 0
    );
    const styleMetrics = getMimicProfileStyleMetrics(profile);

    return [
      "Build or update a persistent Discord style profile from these messages.",
      "Focus on tone, pacing, humor, interests, recurring phrases, conversational habits, and things to avoid overdoing.",
      "Be specific about mechanics: typical length, lowercase/all-caps habits, typo/slang density, punctuation, directness, when they joke, and when they sound sincere.",
      "Pay special attention to orthography: apostrophes, contractions, missing apostrophes, dropped g endings, spelling shortcuts, capitalization, and emoji habits.",
      "Pay special attention to punctuation: whether they use periods, commas, semicolons, question marks, or mostly bare sentence fragments.",
      "Do not invent dialect spelling like goin, doin, somethin, or somethin' unless the examples clearly show it.",
      "Do not add polished punctuation, commas, semicolons, or sentence-ending periods if examples usually avoid them.",
      "Do not write generic traits like 'sarcastic and humorous' unless examples strongly support them; explain the exact flavor.",
      "Treat the previous profile as a provisional hypothesis, not as ground truth.",
      "If the previous profile was built from only a few examples, revise it aggressively when newer examples contradict it.",
      "Do not let a small early cluster of weird, prompted, test-like, or uncharacteristic messages dominate the profile once broader evidence exists.",
      "Newest examples have override priority for correcting stale or bad notes, but use the broader sample to avoid overfitting to one moment.",
      "Recurring phrases are evidence, not commands. Mark phrases that would sound fake if overused in doNotOverdo.",
      "Do not infer sensitive traits. Do not include private or identifying secrets.",
      "Return exactly this JSON shape and nothing else:",
      "{\"profileSummary\":\"short paragraph\",\"styleNotes\":[\"note\"],\"orthographyNotes\":[\"note\"],\"punctuationNotes\":[\"note\"],\"interests\":[\"topic\"],\"recurringPhrases\":[\"phrase\"],\"doNotOverdo\":[\"warning\"]}",
      "",
      `User: ${profile.displayName} (@${profile.username})`,
      `Total stored examples: ${profile.examples.length}`,
      `Examples added since last profile update: ${newExampleCount}`,
      `Examples available at last profile update: ${examplesAtLastUpdate}`,
      `Measured writing style: ${formatMimicStyleMetrics(styleMetrics)}`,
      `Previous profile summary: ${profile.profileSummary || "(none)"}`,
      `Previous style notes: ${profile.styleNotes.join("; ") || "(none)"}`,
      `Previous orthography notes: ${profile.orthographyNotes.join("; ") || "(none)"}`,
      `Previous punctuation notes: ${profile.punctuationNotes.join("; ") || "(none)"}`,
      `Previous interests: ${profile.interests.join("; ") || "(none)"}`,
      "",
      "Newest examples since the last update. Use these to correct drift:",
      newestExamples || "(none)",
      "",
      "Broader recent sample, oldest to newest:",
      broadExamples || "(none)"
    ].join("\n");
  }

  function getMimicProfileUpdateThreshold(profile) {
    const examplesAtLastUpdate = Number(
      profile.profileExampleCountAtLastUpdate ?? 0
    );

    if (
      !profile.profileSummary ||
      examplesAtLastUpdate < MIMIC_UNSTABLE_PROFILE_EXAMPLE_COUNT
    ) {
      return 1;
    }

    if (profile.examples.length < MIMIC_EARLY_PROFILE_EXAMPLE_COUNT) {
      return MIMIC_EARLY_PROFILE_UPDATE_EXAMPLE_COUNT;
    }

    return MIMIC_PROFILE_UPDATE_EXAMPLE_COUNT;
  }

  async function refreshMimicProfile(
    profile,
    { force = false, reason = null } = {}
  ) {
    const updateThreshold = getMimicProfileUpdateThreshold(profile);

    if (
      !force &&
      (profile.profileSummary || profile.styleNotes.length > 0) &&
      profile.examplesSinceProfileUpdate < updateThreshold
    ) {
      return profile;
    }

    if (profile.examples.length < 3) {
      return profile;
    }

    try {
      const parsed = await callGroqJson({
        model: MIMIC_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You summarize Discord writing style for a disclosed mimic bot. Return only strict JSON."
          },
          {
            role: "user",
            content: buildMimicProfileUpdatePrompt(profile)
          }
        ],
        temperature: 0.2,
        maxTokens: 700,
        timeoutMs: 12_000
      });

      profile.profileSummary =
        asStringOrNull(parsed.profileSummary) || profile.profileSummary || "";
      profile.styleNotes = normalizeStringArray(parsed.styleNotes, 14);
      profile.orthographyNotes = normalizeStringArray(
        parsed.orthographyNotes,
        12
      );
      profile.punctuationNotes = normalizeStringArray(
        parsed.punctuationNotes,
        12
      );
      profile.interests = normalizeStringArray(parsed.interests, 14);
      profile.recurringPhrases = normalizeStringArray(
        parsed.recurringPhrases,
        12
      );
      profile.doNotOverdo = normalizeStringArray(parsed.doNotOverdo, 10);
      profile.examplesSinceProfileUpdate = 0;
      profile.profileUpdatedAt = new Date().toISOString();
      profile.profileExampleCountAtLastUpdate = profile.examples.length;

      logEvent("mimic_profile_updated", {
        guildId: profile.guildId,
        userId: profile.userId,
        displayName: profile.displayName,
        exampleCount: profile.examples.length,
        profileExampleCountAtLastUpdate: profile.profileExampleCountAtLastUpdate,
        updateThreshold,
        force,
        reason,
        model: MIMIC_MODEL
      });
    } catch (error) {
      logError("mimic_profile_update_failed", error, {
        guildId: profile.guildId,
        userId: profile.userId,
        displayName: profile.displayName,
        exampleCount: profile.examples.length,
        updateThreshold,
        force,
        reason,
        model: MIMIC_MODEL
      });
    }

    return profile;
  }

  function tokenizeForSimilarity(text) {
    return new Set(
      String(text ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((token) => token.length > 2)
    );
  }

  function selectMimicStyleExamples(profile, contextText, limit = 12) {
    const contextTokens = tokenizeForSimilarity(contextText);

    return profile.examples
      .map((example, index) => {
        const exampleTokens = tokenizeForSimilarity(example.content);
        let overlap = 0;
        exampleTokens.forEach((token) => {
          if (contextTokens.has(token)) overlap += 1;
        });

        return {
          example,
          score: overlap * 10 + index / Math.max(profile.examples.length, 1)
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ example }) => example)
      .sort(
        (a, b) => Number(a.createdTimestamp ?? 0) - Number(b.createdTimestamp ?? 0)
      );
  }

  function trimMimicMemoryText(text, maxChars = 700) {
    const normalized = String(text ?? "").replace(/\s+/g, " ").trim();
    if (!normalized) return "(empty)";
    if (normalized.length <= maxChars) return normalized;
    return `${normalized.slice(0, Math.max(0, maxChars - 3)).trim()}...`;
  }

  function ensureMimicSessionMemory(session) {
    if (!Array.isArray(session.recentExchanges)) {
      session.recentExchanges = [];
    }

    if (!(session.recentRepliesByUserId instanceof Map)) {
      session.recentRepliesByUserId = new Map();
    }

    if (!session.activeMimicThread || typeof session.activeMimicThread !== "object") {
      session.activeMimicThread = null;
    }
  }

  function buildMimicRecentExchangeTranscript(session, currentMessage) {
    ensureMimicSessionMemory(session);

    if (session.recentExchanges.length === 0) {
      return "(none)";
    }

    return session.recentExchanges
      .slice(-MIMIC_RECENT_EXCHANGE_LIMIT)
      .map((exchange, index) => {
        const labels = [];
        if (exchange.triggerUserId === currentMessage.author.id) {
          labels.push("same user");
        }
        if (exchange.directMimicReply) labels.push("direct reply");
        if (exchange.followupToPrevious) labels.push("follow-up");
        const labelText =
          labels.length > 0 ? ` [${labels.join(", ")}]` : "";

        return [
          `${index + 1}.${labelText} ${exchange.triggerUserName}: ${trimMimicMemoryText(
            exchange.triggerText,
            360
          )}`,
          `   bot as ${session.targetDisplayName}: ${trimMimicMemoryText(
            exchange.replyText,
            360
          )}`
        ].join("\n");
      })
      .join("\n");
  }

  function getRecentMimicReplyForUser(session, userId, now = Date.now()) {
    ensureMimicSessionMemory(session);

    const exchange = session.recentRepliesByUserId.get(userId);
    if (!exchange) return null;

    if (now - Number(exchange.ts ?? 0) > MIMIC_FOLLOWUP_WINDOW_MS) {
      session.recentRepliesByUserId.delete(userId);
      return null;
    }

    return exchange;
  }

  function isLowContentMimicFollowupText(content) {
    const normalized = String(content ?? "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    if (!normalized) return true;
    if (/^[!?.,;:()\[\]{}'"“”‘’\-\s]+$/.test(normalized)) return true;

    const lowContentPhrases = new Set([
      "lol",
      "lmao",
      "lmfao",
      "wtf",
      "bro",
      "bruh",
      "huh",
      "what",
      "ok",
      "okay",
      "nvm",
      "nevermind",
      "real",
      "true",
      "same",
      "????",
      "??",
      "!!"
    ]);

    return lowContentPhrases.has(normalized);
  }

  function messageLooksLikeImplicitMimicFollowup(message, exchange, session) {
    const content = message.content?.replace(/\s+/g, " ").trim() ?? "";
    if (isLowContentMimicFollowupText(content)) return false;

    const lowerContent = content.toLowerCase();
    const previousReply = String(exchange?.replyText ?? "").toLowerCase();

    if (
      message.mentions.users.has(client.user.id) ||
      message.mentions.users.has(session.targetUserId) ||
      contentIncludesTerm(lowerContent, session.targetDisplayName) ||
      contentIncludesTerm(lowerContent, session.targetUsername)
    ) {
      return true;
    }

    if (
      /\b(what about|wdym|what do you mean|what do u mean|why|how|explain|elaborate|answer|respond|reply)\b/i.test(
        content
      )
    ) {
      return true;
    }

    if (
      /\?$/.test(content) &&
      !/\b(this bot|the bot|ur bot|your bot|mimic model|rate limit|reduce|unmimic|mimicrate)\b/i.test(
        content
      )
    ) {
      return true;
    }

    const contentTokens = tokenizeForSimilarity(content);
    const previousTokens = tokenizeForSimilarity(previousReply);
    let shared = 0;
    contentTokens.forEach((token) => {
      if (previousTokens.has(token)) shared += 1;
    });

    return shared >= 2 && content.length <= 220;
  }

  function getEligibleImplicitMimicFollowup(session, message) {
    const exchange = getRecentMimicReplyForUser(session, message.author.id);
    if (!exchange) return null;

    const ageMs = Date.now() - Number(exchange.ts ?? 0);
    if (ageMs > Math.min(MIMIC_FOLLOWUP_WINDOW_MS, MIMIC_IMPLICIT_FOLLOWUP_WINDOW_MS)) {
      return null;
    }

    return messageLooksLikeImplicitMimicFollowup(message, exchange, session)
      ? exchange
      : null;
  }

  function getActiveMimicThread(session, now = Date.now()) {
    ensureMimicSessionMemory(session);

    const activeThread = session.activeMimicThread;
    if (!activeThread) return null;
    if (MIMIC_THREAD_LOCK_MS === 0) return null;
    if (now - Number(activeThread.updatedAt ?? 0) > MIMIC_THREAD_LOCK_MS) {
      session.activeMimicThread = null;
      return null;
    }

    return activeThread;
  }

  function messageCanInterruptActiveMimicThread(message, session) {
    return (
      message.mentions.users.has(client.user.id) ||
      message.mentions.users.has(session.targetUserId) ||
      messageLooksLikeMimicTrigger(message, session)
    );
  }

  function messageLooksLikeMimicManagementChatter(message) {
    const content = message.content?.replace(/\s+/g, " ").trim().toLowerCase();
    if (!content) return false;

    return /\b(bot|mimic|miic|model|rate limit|cooldown|unmimic|mimicrate|spam|spamming|annoying|unusable|responds|responses)\b/i.test(
      content
    ) || /\breduce\b.*\b(respond|reply|rate|cooldown)\b/i.test(content);
  }

  function updateActiveMimicThread(session, exchange) {
    ensureMimicSessionMemory(session);
    session.activeMimicThread = {
      userId: exchange.triggerUserId,
      userName: exchange.triggerUserName,
      updatedAt: exchange.ts,
      replyMessageId: exchange.replyMessageId
    };
  }

  function rememberMimicExchange({
    session,
    triggerMessage,
    replyText,
    sentMessage,
    directMimicReply = false,
    followupToPrevious = false,
    reason = null
  }) {
    ensureMimicSessionMemory(session);

    const exchange = {
      ts: Date.now(),
      triggerUserId: triggerMessage.author.id,
      triggerUserName: getMessageAuthorLabel(triggerMessage),
      triggerMessageId: triggerMessage.id,
      triggerText: getArgumentMessageSummary(triggerMessage),
      replyMessageId: sentMessage.id,
      replyText: trimMimicMemoryText(replyText, MIMIC_REPLY_MAX_CHARS),
      directMimicReply,
      followupToPrevious,
      reason: asStringOrNull(reason)
    };

    session.recentExchanges.push(exchange);
    if (session.recentExchanges.length > MIMIC_RECENT_EXCHANGE_LIMIT) {
      session.recentExchanges = session.recentExchanges.slice(
        -MIMIC_RECENT_EXCHANGE_LIMIT
      );
    }

    session.recentRepliesByUserId.set(triggerMessage.author.id, exchange);
    updateActiveMimicThread(session, exchange);
    return exchange;
  }

  async function buildMimicConversationContext(
    message,
    referencedMimicBotMessage = null,
    session = null,
    recentUserFollowup = null
  ) {
    const fetchedMessages = await message.channel.messages.fetch({
      before: message.id,
      limit: Math.max(0, MIMIC_CONTEXT_MESSAGE_LIMIT - 1)
    });
    const messages = [...fetchedMessages.values(), message]
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
      .filter((recentMessage) => !recentMessage.author.bot);
    const currentMessageText = getArgumentMessageSummary(message);
    const currentMessageUsesNonEnglishScript =
      containsNonEnglishScriptText(currentMessageText);
    const transcriptUsesNonEnglishScript = messages.some((recentMessage) =>
      containsNonEnglishScriptText(getArgumentMessageSummary(recentMessage))
    );

    return {
      messageCount: messages.length,
      currentMessageUsesNonEnglishScript,
      transcriptUsesNonEnglishScript,
      transcript:
        messages
          .map((recentMessage, index) => {
            const labels = [];
            if (recentMessage.id === message.id) labels.push("[NEW]");
            const labelText = labels.length > 0 ? ` ${labels.join(" ")}` : "";
            return `${index + 1}.${labelText} ${getMessageAuthorLabel(
              recentMessage
            )}: ${getArgumentMessageSummary(recentMessage)}`;
          })
          .join("\n") || "No recent human messages.",
      plainText: messages
        .map((recentMessage) => getArgumentMessageSummary(recentMessage))
        .join("\n"),
      referencedMimicBotMessage,
      recentUserFollowup,
      currentAuthorIsTarget:
        session?.targetUserId === message.author.id,
      activeMimicThread: session ? getActiveMimicThread(session) : null,
      recentExchangeTranscript: session
        ? buildMimicRecentExchangeTranscript(session, message)
        : "(none)"
    };
  }

  async function getReferencedMimicBotMessage(message, session) {
    if (!message.reference?.messageId) return null;

    const referencedMessage = await message.fetchReference().catch(() => null);
    if (!referencedMessage || referencedMessage.author.id !== client.user.id) {
      return null;
    }

    const knownMimicMessage =
      session.mimicReplyMessageIds?.has(referencedMessage.id) ?? false;
    const hasMimicPrefix = referencedMessage.content?.startsWith(
      getMimicDisclosurePrefix(session.targetDisplayName)
    );

    return knownMimicMessage || hasMimicPrefix ? referencedMessage : null;
  }

  function messageLooksLikeMimicTrigger(message, session) {
    const content = message.content?.toLowerCase() ?? "";
    const displayName = session.targetDisplayName.toLowerCase();
    const username = session.targetUsername.toLowerCase();

    return (
      message.mentions.users.has(session.targetUserId) ||
      contentIncludesTerm(content, displayName) ||
      contentIncludesTerm(content, username) ||
      /\b(what would|where is|someone ask|any thoughts|thoughts)\b/i.test(
        content
      )
    );
  }

  function buildMimicDecisionPrompt({
    session,
    profile,
    context,
    examples,
    extraInstruction = null
  }) {
    const prefix = getMimicDisclosurePrefix(session.targetDisplayName);
    const referencedMimicBotMessage = context.referencedMimicBotMessage;
    const recentUserFollowup = context.recentUserFollowup;
    const styleMetrics = getMimicProfileStyleMetrics(profile);

    return [
      "You are a disclosed Discord style-simulation engine.",
      `The bot may post a message prefixed with ${JSON.stringify(prefix)}.`,
      "Never claim to be the real person, never imply the real person said this, and never reveal private facts.",
      "Decide whether a simulated contribution would naturally help the active conversation.",
      "Reply only when there is an active conversational opening: a question, direct prompt, joke setup, disagreement, or a moment where this user's style would add something.",
      "Default to staying quiet. A real person does not answer every nearby message or every topic shift.",
      "Participate in one conversational lane at a time. Do not chase multiple unrelated subthreads in the same minute.",
      "Natural pivoting means waiting until the current thread has gone quiet or the new message directly invites this persona. Do not pivot just because a new topic appeared.",
      "If people are discussing the bot, the mimic model, rate limits, commands, or how annoying the bot is, usually stay quiet unless directly addressed by reply or mention.",
      "Have some agency: if replying, make a fresh conversational move. React, answer, tease, disagree, ask a short follow-up, or add a relevant opinion the target user might plausibly add.",
      "Do not merely retrieve an old example, summarize the chat, or parrot a catchphrase. Style examples are evidence, not templates.",
      "Tone fit matters more than topic fit: match their usual brevity, lowercase/all-caps habits, typo/slang density, punctuation, directness, and emotional intensity.",
      "Orthography fit is mandatory: do not invent dropped-g spellings like goin/doin/somethin/somethin' unless measured examples show the target uses them.",
      "Apostrophe fit is mandatory: if examples mostly omit apostrophes in casual contractions, do not polish them into don't/it's/I'm style. Match the target's actual habit.",
      "Punctuation fit is mandatory: if examples mostly avoid terminal periods, commas, semicolons, or formal punctuation, write short bare fragments instead of polished sentences.",
      "Use at most one recurring phrase or slang marker, and only if it fits naturally. Never force 'bro', 'holy slop', or any other phrase just because it appears in examples.",
      "Avoid generic assistant diction, complete explanatory sentences, and polished corporate tone.",
      "Do not reproduce hateful or protected-class insults from examples; keep the target's vibe without copying that content.",
      referencedMimicBotMessage
        ? "The newest message is directly replying to the previous mimic-bot message shown below. Treat this as a direct prompt and answer it in the target user's style."
        : "No direct reply to a previous mimic-bot message is present.",
      recentUserFollowup
        ? "The newest message passed a strict implicit follow-up filter for a user the mimic bot recently answered. It may be a continuing thread, but still reply only if the target user would naturally answer."
        : "No eligible same-user implicit follow-up to a mimic-bot answer is present.",
      context.currentAuthorIsTarget
        ? "The newest message is from the real target user being simulated. You may still reply to them as a normal participant; do not ignore them just because they are the target."
        : "The newest message is not from the real target user.",
      context.currentMessageUsesNonEnglishScript
        ? "The newest message uses a non-English script. Understand it directly and usually reply in the same language/script unless the target user's style clearly code-switches."
        : "The newest message does not appear to use a non-English script.",
      "Do not answer multilingual messages with generic English filler just because you are uncertain. If a message asks a clear question in Chinese or another language, answer that question in a natural version of the target user's style.",
      "Use the recent mimic-bot exchanges as memory of what the bot has already said. Continue the conversation coherently, avoid contradicting yourself, and do not repeat the same joke or answer.",
      "If the same user is asking follow-up questions across multiple messages, answer the newest message while preserving the thread from the prior bot answer.",
      extraInstruction
        ? `Correction for this attempt: ${extraInstruction}`
        : "No additional correction for this attempt.",
      "Do not ramble, do not monologue, do not reply just because messages exist, and do not answer bot messages.",
      "The real target user may be part of the conversation. Treat their messages like anyone else's while being careful not to claim the bot is the real user.",
      `If replying, keep it under ${MIMIC_REPLY_MAX_CHARS} characters before the disclosure prefix.`,
      "Before returning, silently revise the reply until it is both original and recognizably in the target's tone.",
      "Return exactly this JSON shape and nothing else:",
      "{\"shouldReply\":true,\"confidence\":0.75,\"styleFit\":0.85,\"originality\":0.8,\"reply\":\"short message\",\"reason\":\"short reason\"}",
      "",
      `Target user to stylistically simulate: ${profile.displayName} (@${profile.username}) [id=${profile.userId}]`,
      `Newest message uses non-English script: ${context.currentMessageUsesNonEnglishScript ? "yes" : "no"}`,
      `Recent transcript uses non-English script: ${context.transcriptUsesNonEnglishScript ? "yes" : "no"}`,
      `Active mimic thread: ${
        context.activeMimicThread
          ? `${context.activeMimicThread.userName} [id=${context.activeMimicThread.userId}]`
          : "(none)"
      }`,
      `Measured writing style: ${formatMimicStyleMetrics(styleMetrics)}`,
      `Persistent profile: ${profile.profileSummary || "(not enough data yet)"}`,
      `Style notes: ${profile.styleNotes.join("; ") || "(none)"}`,
      `Orthography notes: ${profile.orthographyNotes.join("; ") || "(none)"}`,
      `Punctuation notes: ${profile.punctuationNotes.join("; ") || "(none)"}`,
      `Interests: ${profile.interests.join("; ") || "(none)"}`,
      `Recurring phrases: ${profile.recurringPhrases.join("; ") || "(none)"}`,
      `Do not overdo: ${profile.doNotOverdo.join("; ") || "(none)"}`,
      "",
      "Style evidence from this user. Do not copy these lines directly:",
      examples.map((example, index) => `${index + 1}. ${example.content}`).join("\n") ||
        "(few examples available; be cautious and generic)",
      "",
      "Previous mimic-bot message being replied to:",
      referencedMimicBotMessage
        ? referencedMimicBotMessage.content.slice(0, 1200)
        : "(none)",
      "",
      "Most recent mimic-bot reply to this same user:",
      recentUserFollowup
        ? [
            `${recentUserFollowup.triggerUserName}: ${trimMimicMemoryText(
              recentUserFollowup.triggerText,
              500
            )}`,
            `bot as ${session.targetDisplayName}: ${trimMimicMemoryText(
              recentUserFollowup.replyText,
              500
            )}`
          ].join("\n")
        : "(none)",
      "",
      "Recent mimic-bot exchanges in this channel, oldest to newest:",
      context.recentExchangeTranscript || "(none)",
      "",
      "Recent conversation, oldest to newest:",
      context.transcript
    ].join("\n");
  }

  function normalizeMimicReplyText(text) {
    const normalized = String(text ?? "")
      .replace(/^\[mimic:[^\]]+\]\s*/i, "")
      .replace(/<@!?\d+>/g, "")
      .replace(/@everyone/gi, "everyone")
      .replace(/@here/gi, "here")
      .replace(/\s+/g, " ")
      .trim();

    if (!normalized) return null;
    if (normalized.length <= MIMIC_REPLY_MAX_CHARS) return normalized;
    return `${normalized.slice(0, MIMIC_REPLY_MAX_CHARS - 3).trim()}...`;
  }

  function getMimicDisclosurePrefix(displayName) {
    const prefix = MIMIC_DISCLOSURE_PREFIX.replace("{name}", displayName).trim();
    return prefix ? `${prefix} ` : "";
  }

  function formatMimicReply(session, replyText) {
    const prefix = getMimicDisclosurePrefix(session.targetDisplayName);
    return `${prefix}${replyText}`.slice(0, 2000);
  }

  function getMimicReplyCooldownMs(session) {
    const sessionCooldown = Number(session?.replyCooldownMs);
    return Number.isFinite(sessionCooldown)
      ? sessionCooldown
      : MIMIC_REPLY_COOLDOWN_MS;
  }

  function parseDurationMs(input) {
    const raw = String(input ?? "").trim().toLowerCase();
    if (!raw) return null;
    if (["off", "none", "disable", "disabled", "no", "0"].includes(raw)) {
      return 0;
    }

    const match = raw.match(/^(\d+(?:\.\d+)?)\s*(ms|msec|millisecond|milliseconds|s|sec|second|seconds|m|min|minute|minutes)?$/i);
    if (!match) return null;

    const amount = Number(match[1]);
    if (!Number.isFinite(amount) || amount < 0) return null;

    const unit = match[2] ?? "ms";
    const minuteUnits = new Set(["m", "min", "minute", "minutes"]);
    const secondUnits = new Set(["s", "sec", "second", "seconds"]);
    const multiplier = minuteUnits.has(unit)
      ? 60_000
      : secondUnits.has(unit)
        ? 1_000
        : 1;

    return Math.round(amount * multiplier);
  }

  function formatDuration(ms) {
    if (ms === 0) return "off";
    if (ms % 60_000 === 0) return `${ms / 60_000}m`;
    if (ms % 1_000 === 0) return `${ms / 1_000}s`;
    return `${ms}ms`;
  }

  async function setMimicRateLimit(message) {
    const session = activeMimicSessions.get(getMimicSessionKey(message.channel.id));
    const inlineInput = parseMimicRateLimitCommandInput(message.content);

    if (!session) {
      await message.reply({
        content: "Mimic mode is not active in this channel.",
        allowedMentions: { parse: [], repliedUser: false }
      });
      return;
    }

    if (!inlineInput) {
      await message.reply({
        content: `Current mimic cooldown is \`${formatDuration(
          getMimicReplyCooldownMs(session)
        )}\`. Set it with \`${MIMIC_RATE_LIMIT_COMMAND} 5s\`, \`${MIMIC_RATE_LIMIT_COMMAND} 2500ms\`, or \`${MIMIC_RATE_LIMIT_COMMAND} off\`.`,
        allowedMentions: { parse: [], repliedUser: false }
      });
      return;
    }

    const cooldownMs = parseDurationMs(inlineInput);
    if (
      cooldownMs === null ||
      cooldownMs < 0 ||
      cooldownMs > 3_600_000
    ) {
      await message.reply({
        content:
          "Use a cooldown from `0` to `60m`, like `500ms`, `5s`, `2m`, or `off`.",
        allowedMentions: { parse: [], repliedUser: false }
      });
      return;
    }

    session.replyCooldownMs = cooldownMs;
    logEvent("mimic_rate_limit_updated", {
      guildId: session.guildId,
      channelId: session.channelId,
      targetUserId: session.targetUserId,
      updatedByUserId: message.author.id,
      cooldownMs
    });

    await message.reply({
      content: `Mimic cooldown is now \`${formatDuration(cooldownMs)}\` for \`${session.targetDisplayName}\` in this channel.`,
      allowedMentions: { parse: [], repliedUser: false }
    });
  }

  function normalizeMimicRepetitionText(text) {
    return String(text ?? "")
      .replace(/^\[mimic:[^\]]+\]\s*/i, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isMimicReplyRepetitive(session, replyText) {
    ensureMimicSessionMemory(session);

    const candidate = normalizeMimicRepetitionText(replyText);
    if (candidate.length < 3) return false;
    const candidateTokens = new Set(candidate.split(/\s+/).filter(Boolean));

    return session.recentExchanges
      .slice(-MIMIC_RECENT_EXCHANGE_LIMIT)
      .some((exchange) => {
        const previous = normalizeMimicRepetitionText(exchange.replyText);
        if (!previous) return false;
        if (candidate === previous) return true;

        const previousTokens = new Set(previous.split(/\s+/).filter(Boolean));
        if (candidateTokens.size === 0 || previousTokens.size === 0) return false;

        let shared = 0;
        candidateTokens.forEach((token) => {
          if (previousTokens.has(token)) shared += 1;
        });

        const unionSize = new Set([...candidateTokens, ...previousTokens]).size;
        const overlap = unionSize > 0 ? shared / unionSize : 0;
        return candidate.length <= 80 && previous.length <= 80 && overlap >= 0.8;
      });
  }

  function getMimicReplyStyleIssue(profile, replyText) {
    const reply = String(replyText ?? "").trim();
    if (!reply) return null;

    const metrics = getMimicProfileStyleMetrics(profile);
    if (metrics.messageCount < 8) return null;

    const hasGDroppedSpelling =
      /\b(?:[a-z]{3,}in['’]|goin|doin|sayin|thinkin|talkin|lookin|workin|playin|tryin|somethin|nothin|anythin|everythin)\b/iu.test(
        reply
      );
    if (hasGDroppedSpelling && metrics.gDropRatio < 0.05) {
      return "The reply uses dropped-g/dialect spellings, but this target's examples almost never do. Rewrite with the target's actual spelling habits; do not use goin, doin, somethin, or -in' endings.";
    }

    const apostropheContractions = [
      ...reply.matchAll(/\b[\p{L}\p{N}]+['’][\p{L}\p{N}]+\b/gu)
    ].map((match) => match[0]);
    if (apostropheContractions.length > 0 && metrics.apostropheRatio < 0.08) {
      return `The reply uses apostrophe contractions (${apostropheContractions
        .slice(0, 5)
        .join(", ")}), but this target rarely writes apostrophes. Rewrite without polishing casual contractions unless an exact example supports it.`;
    }

    const hasFormalPunctuation = /[.;:]/.test(reply) || /,(?=\s)/.test(reply);
    if (hasFormalPunctuation && metrics.formalPunctuationPerMessage < 0.25) {
      return "The reply uses formal punctuation, but this target's examples mostly avoid commas, semicolons, colons, and polished sentence structure. Rewrite as a casual fragment with minimal punctuation.";
    }

    if (/[.]$/.test(reply) && metrics.terminalPeriodRatio < 0.1) {
      return "The reply ends with a period, but this target almost never ends chat messages with periods. Remove sentence-ending formality.";
    }

    return null;
  }

  function selectMimicDecisionModel(context) {
    return context.currentMessageUsesNonEnglishScript
      ? MIMIC_MULTILINGUAL_MODEL
      : MIMIC_MODEL;
  }

  async function generateMimicDecision({
    session,
    profile,
    context,
    extraInstruction = null
  }) {
    const examples = selectMimicStyleExamples(profile, context.plainText, 12);
    const model = selectMimicDecisionModel(context);
    const parsed = await callGroqJson({
      model,
      messages: [
        {
          role: "system",
          content:
            "You decide whether a disclosed multilingual mimic bot should contribute to Discord chat. Return only strict JSON."
        },
        {
          role: "user",
          content: buildMimicDecisionPrompt({
            session,
            profile,
            context,
            examples,
            extraInstruction
          })
        }
      ],
      temperature: MIMIC_TEMPERATURE,
      maxTokens: 500,
      timeoutMs: 12_000
    });

    return {
      shouldReply: parseModelBoolean(parsed.shouldReply),
      confidence: parseModelConfidence(parsed.confidence),
      styleFit:
        parsed.styleFit === undefined ? 0.7 : parseModelConfidence(parsed.styleFit),
      originality:
        parsed.originality === undefined
          ? 0.7
          : parseModelConfidence(parsed.originality),
      reply: normalizeMimicReplyText(parsed.reply),
      reason: asStringOrNull(parsed.reason),
      provider: getLlmMeta(parsed).provider ?? "groq",
      model: getLlmMeta(parsed).model ?? model
    };
  }

  async function startMimicSession(message) {
    const inlineInput = parseMimicCommandInput(message.content);
    const target = await resolveMimicTarget(message, inlineInput);

    if (target.error) {
      await message.reply({
        content: target.error,
        allowedMentions: { parse: [], repliedUser: false }
      });
      return;
    }

    const guildId = message.guild?.id ?? "dm";
    const profile = await loadMimicProfile({
      guildId,
      user: target.user,
      displayName: target.displayName
    });
    const recentExamples = await collectRecentMimicExamples(
      message,
      target.user.id
    );
    const addedExampleCount = addMimicExamplesToProfile(profile, recentExamples);
    const forceProfileRefresh =
      !profile.profileSummary ||
      addedExampleCount >= MIMIC_EARLY_PROFILE_UPDATE_EXAMPLE_COUNT;
    await refreshMimicProfile(profile, {
      force: forceProfileRefresh,
      reason: "mimic_session_start"
    });
    const profilePath = await saveMimicProfile(profile);

    const session = {
      guildId,
      channelId: message.channel.id,
      targetUserId: target.user.id,
      targetUsername: target.user.username,
      targetDisplayName: target.displayName,
      startedByUserId: message.author.id,
      startedAt: Date.now(),
      lastReplyAt: 0,
      replyCooldownMs: MIMIC_REPLY_COOLDOWN_MS,
      mimicReplyMessageIds: new Set(),
      recentExchanges: [],
      recentRepliesByUserId: new Map(),
      activeMimicThread: null,
      profilePath
    };

    activeMimicSessions.set(getMimicSessionKey(message.channel.id), session);

    logEvent("mimic_session_started", {
      guildId,
      channelId: message.channel.id,
      targetUserId: target.user.id,
      targetDisplayName: target.displayName,
      startedByUserId: message.author.id,
      addedExampleCount,
      storedExampleCount: profile.examples.length,
      profilePath
    });

    await message.reply({
      content: `Mimic mode started for \`${target.displayName}\` in this channel. I will label generated replies with \`${getMimicDisclosurePrefix(
        target.displayName
      ).trim()}\`. Stored ${profile.examples.length} example(s) in \`${MIMIC_DATA_DIR}\`.`,
      allowedMentions: { parse: [], repliedUser: false }
    });
  }

  async function stopMimicSession(message) {
    const key = getMimicSessionKey(message.channel.id);
    const session = activeMimicSessions.get(key);

    if (!session) {
      await message.reply({
        content: "Mimic mode is not active in this channel.",
        allowedMentions: { parse: [], repliedUser: false }
      });
      return;
    }

    const inlineInput = parseUnmimicCommandInput(message.content);
    const requestedUserId = extractDiscordUserIdFromText(inlineInput);
    if (requestedUserId && requestedUserId !== session.targetUserId) {
      await message.reply({
        content: `Mimic mode is active for \`${session.targetDisplayName}\`, not that user.`,
        allowedMentions: { parse: [], repliedUser: false }
      });
      return;
    }

    activeMimicSessions.delete(key);
    logEvent("mimic_session_stopped", {
      guildId: session.guildId,
      channelId: session.channelId,
      targetUserId: session.targetUserId,
      targetDisplayName: session.targetDisplayName,
      stoppedByUserId: message.author.id
    });

    await message.reply({
      content: `Mimic mode stopped for \`${session.targetDisplayName}\`. Stored profile data stays in \`${MIMIC_DATA_DIR}\`.`,
      allowedMentions: { parse: [], repliedUser: false }
    });
  }

  async function learnFromMimicTargetMessage(session, message) {
    const profile = await loadMimicProfile({
      guildId: session.guildId,
      user: message.author,
      displayName: getMessageAuthorName(message)
    });
    const addedCount = addMimicExamplesToProfile(profile, [message]);
    if (addedCount > 0) {
      await refreshMimicProfile(profile, {
        reason: "target_message_learned"
      });
      await saveMimicProfile(profile);
      logEvent("mimic_target_message_learned", {
        guildId: session.guildId,
        channelId: session.channelId,
        targetUserId: session.targetUserId,
        targetDisplayName: session.targetDisplayName,
        addedCount,
        storedExampleCount: profile.examples.length
      });
    }
  }

  async function handleActiveMimicSession(message) {
    if (!ENABLE_MIMIC_COMMAND || !MIMIC_AUTO_REPLY_ENABLED) return false;

    const session = activeMimicSessions.get(getMimicSessionKey(message.channel.id));
    if (!session) return false;

    const currentAuthorIsTarget = message.author.id === session.targetUserId;

    if (currentAuthorIsTarget) {
      await learnFromMimicTargetMessage(session, message).catch((error) => {
        logError("mimic_target_learning_failed", error, {
          guildId: session.guildId,
          channelId: session.channelId,
          targetUserId: session.targetUserId
        });
      });
    }

    const referencedMimicBotMessage = await getReferencedMimicBotMessage(
      message,
      session
    );
    const isDirectMimicReply = Boolean(referencedMimicBotMessage);
    const recentUserFollowup = isDirectMimicReply
      ? getRecentMimicReplyForUser(session, message.author.id)
      : getEligibleImplicitMimicFollowup(session, message);
    const isRecentUserFollowup = Boolean(recentUserFollowup);
    const isDirectTrigger =
      isDirectMimicReply ||
      isRecentUserFollowup ||
      messageLooksLikeMimicTrigger(message, session);
    if (
      !isDirectMimicReply &&
      !message.mentions.users.has(session.targetUserId) &&
      messageLooksLikeMimicManagementChatter(message)
    ) {
      logEvent("mimic_reply_skipped_management_chatter", {
        guildId: session.guildId,
        channelId: session.channelId,
        targetUserId: session.targetUserId,
        authorId: message.author.id,
        currentAuthorIsTarget
      });
      return false;
    }

    const activeThread = getActiveMimicThread(session);
    if (
      activeThread &&
      activeThread.userId !== message.author.id &&
      !isDirectTrigger &&
      !messageCanInterruptActiveMimicThread(message, session)
    ) {
      logEvent("mimic_reply_skipped_thread_lock", {
        guildId: session.guildId,
        channelId: session.channelId,
        targetUserId: session.targetUserId,
        activeThreadUserId: activeThread.userId,
        activeThreadUserName: activeThread.userName,
        messageAuthorId: message.author.id,
        currentAuthorIsTarget
      });
      return false;
    }

    const replyCooldownMs = getMimicReplyCooldownMs(session);
    const cooldownRemainingMs =
      replyCooldownMs - (Date.now() - session.lastReplyAt);
    if (!isDirectTrigger && cooldownRemainingMs > 0) {
      logEvent("mimic_reply_skipped_cooldown", {
        guildId: session.guildId,
        channelId: session.channelId,
        targetUserId: session.targetUserId,
        currentAuthorIsTarget,
        replyCooldownMs,
        cooldownRemainingMs
      });
      return false;
    }

    let profile;
    let context;
    let decision;
    try {
      profile = await loadMimicProfile({
        guildId: session.guildId,
        user: {
          id: session.targetUserId,
          username: session.targetUsername
        },
        displayName: session.targetDisplayName
      });
      context = await buildMimicConversationContext(
        message,
        referencedMimicBotMessage,
        session,
        recentUserFollowup
      );
      decision = await generateMimicDecision({ session, profile, context });
    } catch (error) {
      logError("mimic_decision_failed", error, {
        guildId: session.guildId,
        channelId: session.channelId,
        targetUserId: session.targetUserId,
        model: MIMIC_MODEL
      });
      return false;
    }

    if (decision.reply && isMimicReplyRepetitive(session, decision.reply)) {
      const repeatedReply = decision.reply;
      try {
        decision = await generateMimicDecision({
          session,
          profile,
          context,
          extraInstruction: `The proposed reply ${JSON.stringify(
            repeatedReply
          )} is too similar to a recent mimic-bot reply. Choose a different, context-specific response, or set shouldReply to false if there is no good response.`
        });

        logEvent("mimic_repetitive_reply_retried", {
          guildId: session.guildId,
          channelId: session.channelId,
          targetUserId: session.targetUserId,
          repeatedReply,
          replacementReply: decision.reply,
          model: decision.model,
          provider: decision.provider
        });
      } catch (error) {
        logError("mimic_repetitive_reply_retry_failed", error, {
          guildId: session.guildId,
          channelId: session.channelId,
          targetUserId: session.targetUserId,
          repeatedReply,
          model: MIMIC_MODEL
        });
      }
    }

    if (decision.reply && isMimicReplyRepetitive(session, decision.reply)) {
      logEvent("mimic_reply_skipped_repetitive", {
        guildId: session.guildId,
        channelId: session.channelId,
        targetUserId: session.targetUserId,
        currentAuthorIsTarget,
        reply: decision.reply,
        confidence: decision.confidence,
        styleFit: decision.styleFit,
        originality: decision.originality,
        reason: decision.reason,
        model: decision.model,
        provider: decision.provider,
        contextMessageCount: context.messageCount
      });
      return false;
    }

    const styleIssue = decision.reply
      ? getMimicReplyStyleIssue(profile, decision.reply)
      : null;
    if (styleIssue) {
      const rejectedReply = decision.reply;
      try {
        decision = await generateMimicDecision({
          session,
          profile,
          context,
          extraInstruction: `${styleIssue} Re-answer the current message with the same topic intent but stricter orthography and punctuation fit.`
        });

        logEvent("mimic_style_reply_retried", {
          guildId: session.guildId,
          channelId: session.channelId,
          targetUserId: session.targetUserId,
          rejectedReply,
          styleIssue,
          replacementReply: decision.reply,
          model: decision.model,
          provider: decision.provider
        });
      } catch (error) {
        logError("mimic_style_reply_retry_failed", error, {
          guildId: session.guildId,
          channelId: session.channelId,
          targetUserId: session.targetUserId,
          rejectedReply,
          styleIssue,
          model: MIMIC_MODEL
        });
      }
    }

    const remainingStyleIssue = decision.reply
      ? getMimicReplyStyleIssue(profile, decision.reply)
      : null;
    if (remainingStyleIssue) {
      logEvent("mimic_reply_skipped_style_mismatch", {
        guildId: session.guildId,
        channelId: session.channelId,
        targetUserId: session.targetUserId,
        currentAuthorIsTarget,
        reply: decision.reply,
        styleIssue: remainingStyleIssue,
        confidence: decision.confidence,
        styleFit: decision.styleFit,
        originality: decision.originality,
        reason: decision.reason,
        model: decision.model,
        provider: decision.provider,
        contextMessageCount: context.messageCount
      });
      return false;
    }

    if (decision.reply && isMimicReplyRepetitive(session, decision.reply)) {
      logEvent("mimic_reply_skipped_repetitive", {
        guildId: session.guildId,
        channelId: session.channelId,
        targetUserId: session.targetUserId,
        currentAuthorIsTarget,
        reply: decision.reply,
        confidence: decision.confidence,
        styleFit: decision.styleFit,
        originality: decision.originality,
        reason: decision.reason,
        model: decision.model,
        provider: decision.provider,
        contextMessageCount: context.messageCount
      });
      return false;
    }

    if (
      !isDirectMimicReply &&
      !isRecentUserFollowup &&
      (!decision.shouldReply ||
        decision.confidence < MIMIC_AUTO_REPLY_CONFIDENCE_MIN ||
        decision.styleFit < MIMIC_STYLE_MATCH_MIN ||
        decision.originality < MIMIC_ORIGINALITY_MIN ||
        !decision.reply)
    ) {
      logEvent("mimic_reply_skipped_by_model", {
        guildId: session.guildId,
        channelId: session.channelId,
        targetUserId: session.targetUserId,
        currentAuthorIsTarget,
        confidence: decision.confidence,
        styleFit: decision.styleFit,
        originality: decision.originality,
        reason: decision.reason,
        model: decision.model,
        provider: decision.provider,
        contextMessageCount: context.messageCount
      });
      return false;
    }

    if (
      isRecentUserFollowup &&
      !isDirectMimicReply &&
      (!decision.shouldReply ||
        decision.confidence < MIMIC_FOLLOWUP_REPLY_CONFIDENCE_MIN ||
        decision.styleFit < MIMIC_STYLE_MATCH_MIN ||
        decision.originality < MIMIC_ORIGINALITY_MIN ||
        !decision.reply)
    ) {
      logEvent("mimic_followup_skipped_by_model", {
        guildId: session.guildId,
        channelId: session.channelId,
        targetUserId: session.targetUserId,
        currentAuthorIsTarget,
        followupUserId: message.author.id,
        previousReplyMessageId: recentUserFollowup.replyMessageId,
        confidence: decision.confidence,
        styleFit: decision.styleFit,
        originality: decision.originality,
        reason: decision.reason,
        model: decision.model,
        provider: decision.provider,
        contextMessageCount: context.messageCount
      });
      return false;
    }

    if (isDirectMimicReply) {
      if (!decision.reply) {
        logEvent("mimic_direct_reply_missing_model_text", {
          guildId: session.guildId,
          channelId: session.channelId,
          targetUserId: session.targetUserId,
          currentAuthorIsTarget,
          confidence: decision.confidence,
          reason: decision.reason,
          model: decision.model,
          provider: decision.provider
        });
        return false;
      }

      decision.shouldReply = true;
      decision.confidence = Math.max(decision.confidence, 0.95);
      decision.styleFit = Math.max(decision.styleFit, MIMIC_STYLE_MATCH_MIN);
      decision.originality = Math.max(
        decision.originality,
        MIMIC_ORIGINALITY_MIN
      );
    }

    try {
      await message.channel.sendTyping().catch(() => null);
      const sentMessage = await message.channel.send({
        content: formatMimicReply(session, decision.reply),
        allowedMentions: { parse: [] }
      });
      session.mimicReplyMessageIds.add(sentMessage.id);
      rememberMimicExchange({
        session,
        triggerMessage: message,
        replyText: decision.reply,
        sentMessage,
        directMimicReply: isDirectMimicReply,
        followupToPrevious: isRecentUserFollowup,
        reason: decision.reason
      });
      session.lastReplyAt = Date.now();
      logEvent("mimic_reply_sent", {
        guildId: session.guildId,
        channelId: session.channelId,
        targetUserId: session.targetUserId,
        directMimicReply: isDirectMimicReply,
        followupToPrevious: isRecentUserFollowup,
        followupUserId: isRecentUserFollowup ? message.author.id : null,
        currentAuthorIsTarget,
        confidence: decision.confidence,
        styleFit: decision.styleFit,
        originality: decision.originality,
        reason: decision.reason,
        model: decision.model,
        provider: decision.provider
      });
      return true;
    } catch (error) {
      logError("mimic_reply_send_failed", error, {
        guildId: session.guildId,
        channelId: session.channelId,
        targetUserId: session.targetUserId
      });
      return false;
    }
  }

  return {
    handleActiveMimicSession,
    isMimicCommandMessage,
    isMimicRateLimitCommandMessage,
    isUnmimicCommandMessage,
    setMimicRateLimit,
    startMimicSession,
    stopMimicSession
  };
}

module.exports = { createMimicFeature };
