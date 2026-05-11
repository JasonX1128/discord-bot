require("dotenv").config();
const fs = require("fs");
const path = require("path");
const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits
} = require("discord.js");
const { messages: RANDOM_MESSAGES } = require("./messages.json");

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const TARGET_USER_ID = process.env.TARGET_USER_ID;
const TARGET_NICKNAME = process.env.TARGET_NICKNAME;
const ENABLE_NICKNAME_SYNC =
  (process.env.ENABLE_NICKNAME_SYNC ?? "true") === "true";
const TARGET_REPLY_CHANCE = Number(process.env.TARGET_REPLY_CHANCE ?? "1");
const TARGET_REACTION_EMOJI = process.env.TARGET_REACTION_EMOJI ?? "🍆";
const NICKNAME_SYNC_INTERVAL_MS = 60_000;
const LOG_ALL_MESSAGES = (process.env.LOG_ALL_MESSAGES ?? "true") === "true";
const LOG_MESSAGE_CONTENT =
  (process.env.LOG_MESSAGE_CONTENT ?? "false") === "true";
const DISCORD_USER_WHITELIST_IDS = parseCommaSeparatedSet(
  process.env.DISCORD_USER_WHITELIST_IDS
);
const USE_GEMMA = (process.env.USE_GEMMA ?? "false") === "true";
const GEMMA_API_KEY = process.env.GEMMA_API_KEY;
const GEMMA_MODEL = process.env.GEMMA_MODEL ?? "gemma-4-26b-a4b-it";
const GEMMA_API_BASE_URL =
  process.env.GEMMA_API_BASE_URL ??
  "https://generativelanguage.googleapis.com/v1beta";
const GEMMA_TEMPERATURE = Number(process.env.GEMMA_TEMPERATURE ?? "1.1");
const GEMMA_MAX_OUTPUT_TOKENS = Number(
  process.env.GEMMA_MAX_OUTPUT_TOKENS ?? "80"
);
const GEMMA_SYSTEM_PROMPT =
  process.env.GEMMA_SYSTEM_PROMPT ??
  "You are a Discord banter writer. Write punchy, playful one-liners that feel human and varied. Keep it cheeky, not hateful. The core inside joke is that the target user is a smut reader, so every reply should imply that in a playful way. Return plain text only.";
const GEMMA_STYLE_EXAMPLE_COUNT = Number(
  process.env.GEMMA_STYLE_EXAMPLE_COUNT ?? "8"
);
const ENABLE_TEST_COMMAND =
  (process.env.ENABLE_TEST_COMMAND ?? "true") === "true";
const TEST_COMMAND = (process.env.TEST_COMMAND ?? "!testreply").trim();
const TEST_COMMAND_REQUIRES_ADMIN =
  (process.env.TEST_COMMAND_REQUIRES_ADMIN ?? "true") === "true";
const ENABLE_GIF_COMMAND =
  (process.env.ENABLE_GIF_COMMAND ?? "false") === "true";
const GIF_COMMAND = (process.env.GIF_COMMAND ?? "!gif").trim();
const GIF_COMMAND_REQUIRES_ADMIN =
  (process.env.GIF_COMMAND_REQUIRES_ADMIN ?? "false") === "true";
const GIPHY_API_KEY = process.env.GIPHY_API_KEY;
const GIPHY_API_BASE_URL =
  process.env.GIPHY_API_BASE_URL ?? "https://api.giphy.com/v1";
const GIPHY_RATING = process.env.GIPHY_RATING ?? "pg-13";
const GIPHY_LANG = process.env.GIPHY_LANG ?? "en";
const GIPHY_DEFAULT_QUERY = process.env.GIPHY_DEFAULT_QUERY ?? "reaction";
const GIPHY_SEARCH_LIMIT = Number(process.env.GIPHY_SEARCH_LIMIT ?? "20");
const GIF_MAX_ATTEMPTS = Number(process.env.GIF_MAX_ATTEMPTS ?? "3");
const GIF_USE_GEMMA_CONTEXT =
  (process.env.GIF_USE_GEMMA_CONTEXT ?? "true") === "true";
const GIF_CONTEXT_MESSAGE_LIMIT = Number(
  process.env.GIF_CONTEXT_MESSAGE_LIMIT ?? "10"
);
const GIF_CONTEXT_MAX_MESSAGE_CHARS = Number(
  process.env.GIF_CONTEXT_MAX_MESSAGE_CHARS ?? "240"
);
const GIF_RECENT_FOCUS_MESSAGE_COUNT = Number(
  process.env.GIF_RECENT_FOCUS_MESSAGE_COUNT ?? "3"
);
const GIF_ENABLE_CANDIDATE_RERANK =
  (process.env.GIF_ENABLE_CANDIDATE_RERANK ?? "true") === "true";
const GIF_RERANK_CANDIDATE_COUNT = Number(
  process.env.GIF_RERANK_CANDIDATE_COUNT ?? "8"
);
const GIF_ENABLE_VISION_RERANK =
  (process.env.GIF_ENABLE_VISION_RERANK ?? "true") === "true";
const GIF_VISION_CANDIDATE_COUNT = Number(
  process.env.GIF_VISION_CANDIDATE_COUNT ?? "5"
);
const GIF_LLM_PROVIDER = (process.env.GIF_LLM_PROVIDER ?? "gemma")
  .trim()
  .toLowerCase();
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_BASE_URL =
  process.env.GROQ_API_BASE_URL ?? "https://api.groq.com/openai/v1";
const GIF_GROQ_MODEL = process.env.GIF_GROQ_MODEL ?? "openai/gpt-oss-120b";
const DEFAULT_GROQ_TEXT_FALLBACK_MODELS = [
  "openai/gpt-oss-120b",
  "llama-3.3-70b-versatile",
  "qwen/qwen3-32b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "openai/gpt-oss-20b",
  "llama-3.1-8b-instant",
  "allam-2-7b"
];
const GROQ_TEXT_FALLBACK_MODELS =
  parseCommaSeparatedList(process.env.GROQ_TEXT_FALLBACK_MODELS).length > 0
    ? parseCommaSeparatedList(process.env.GROQ_TEXT_FALLBACK_MODELS)
    : DEFAULT_GROQ_TEXT_FALLBACK_MODELS;
const ENABLE_GEMMA_LLM_FALLBACK =
  (process.env.ENABLE_GEMMA_LLM_FALLBACK ?? "true") === "true";
const GIF_VISION_MODEL =
  process.env.GIF_VISION_MODEL ??
  "meta-llama/llama-4-scout-17b-16e-instruct";
const ENABLE_ARGUE_COMMAND =
  (process.env.ENABLE_ARGUE_COMMAND ?? "false") === "true";
const ARGUE_COMMAND = (process.env.ARGUE_COMMAND ?? "!argue").trim();
const ARGUE_COMMAND_REQUIRES_ADMIN =
  (process.env.ARGUE_COMMAND_REQUIRES_ADMIN ?? "false") === "true";
const ARGUE_CONTEXT_MESSAGE_LIMIT = Number(
  process.env.ARGUE_CONTEXT_MESSAGE_LIMIT ?? "40"
);
const ARGUE_CONTEXT_MAX_MESSAGE_CHARS = Number(
  process.env.ARGUE_CONTEXT_MAX_MESSAGE_CHARS ?? "500"
);
const ARGUE_INACTIVE_TIMEOUT_MS = Number(
  process.env.ARGUE_INACTIVE_TIMEOUT_MS ?? "180000"
);
const ARGUE_REPLY_COOLDOWN_MS = Number(
  process.env.ARGUE_REPLY_COOLDOWN_MS ?? "12000"
);
const ARGUE_MAX_BOT_REPLIES = Number(process.env.ARGUE_MAX_BOT_REPLIES ?? "8");
const ARGUE_MAX_SESSION_MS = Number(
  process.env.ARGUE_MAX_SESSION_MS ?? "600000"
);
const ARGUE_RESPONSE_MAX_CHARS = Number(
  process.env.ARGUE_RESPONSE_MAX_CHARS ?? "700"
);
const ARGUE_MODEL = process.env.ARGUE_MODEL ?? GIF_GROQ_MODEL;
const ARGUE_REQUESTER_ALIAS_TERMS = ["jason", "json", "jsn"];
const ARGUE_PERSONAL_ATTACK_TERMS = [
  "stupid",
  "dumb",
  "idiot",
  "moron",
  "clown",
  "loser",
  "braindead",
  "brain dead",
  "dumbass",
  "trash",
  "garbage",
  "awful"
];
const ENABLE_MIMIC_COMMAND =
  (process.env.ENABLE_MIMIC_COMMAND ?? "false") === "true";
const MIMIC_COMMAND = (process.env.MIMIC_COMMAND ?? "!mimic").trim();
const UNMIMIC_COMMAND = (process.env.UNMIMIC_COMMAND ?? "!unmimic").trim();
const MIMIC_COMMAND_REQUIRES_ADMIN =
  (process.env.MIMIC_COMMAND_REQUIRES_ADMIN ?? "false") === "true";
const MIMIC_DATA_DIR = process.env.MIMIC_DATA_DIR ?? "mimic_data";
const MIMIC_DATA_DIR_ABSOLUTE = path.resolve(process.cwd(), MIMIC_DATA_DIR);
const MIMIC_MODEL = process.env.MIMIC_MODEL ?? GIF_GROQ_MODEL;
const MIMIC_MULTILINGUAL_MODEL =
  process.env.MIMIC_MULTILINGUAL_MODEL ?? "qwen/qwen3-32b";
const MIMIC_HISTORY_FETCH_LIMIT = Number(
  process.env.MIMIC_HISTORY_FETCH_LIMIT ?? "100"
);
const MIMIC_CONTEXT_MESSAGE_LIMIT = Number(
  process.env.MIMIC_CONTEXT_MESSAGE_LIMIT ?? "14"
);
const MIMIC_RECENT_EXCHANGE_LIMIT = Number(
  process.env.MIMIC_RECENT_EXCHANGE_LIMIT ?? "8"
);
const MIMIC_FOLLOWUP_WINDOW_MS = Number(
  process.env.MIMIC_FOLLOWUP_WINDOW_MS ?? "180000"
);
const MIMIC_REPLY_COOLDOWN_MS = Number(
  process.env.MIMIC_REPLY_COOLDOWN_MS ?? "5000"
);
const MIMIC_REPLY_MAX_CHARS = Number(
  process.env.MIMIC_REPLY_MAX_CHARS ?? "500"
);
const MIMIC_TEMPERATURE = Number(process.env.MIMIC_TEMPERATURE ?? "0.75");
const MIMIC_STYLE_MATCH_MIN = Number(
  process.env.MIMIC_STYLE_MATCH_MIN ?? "0.65"
);
const MIMIC_ORIGINALITY_MIN = Number(
  process.env.MIMIC_ORIGINALITY_MIN ?? "0.45"
);
const MIMIC_MAX_EXAMPLES = Number(process.env.MIMIC_MAX_EXAMPLES ?? "250");
const MIMIC_PROFILE_UPDATE_EXAMPLE_COUNT = Number(
  process.env.MIMIC_PROFILE_UPDATE_EXAMPLE_COUNT ?? "12"
);
const MIMIC_EARLY_PROFILE_EXAMPLE_COUNT = Number(
  process.env.MIMIC_EARLY_PROFILE_EXAMPLE_COUNT ?? "50"
);
const MIMIC_EARLY_PROFILE_UPDATE_EXAMPLE_COUNT = Number(
  process.env.MIMIC_EARLY_PROFILE_UPDATE_EXAMPLE_COUNT ?? "3"
);
const MIMIC_UNSTABLE_PROFILE_EXAMPLE_COUNT = Number(
  process.env.MIMIC_UNSTABLE_PROFILE_EXAMPLE_COUNT ?? "8"
);
const MIMIC_DISCLOSURE_PREFIX =
  process.env.MIMIC_DISCLOSURE_PREFIX ?? "[mimic: {name}] ";
const MIMIC_AUTO_REPLY_ENABLED =
  (process.env.MIMIC_AUTO_REPLY_ENABLED ?? "true") === "true";

function parseCommaSeparatedSet(value) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function parseCommaSeparatedList(value) {
  return [
    ...new Set(
      (value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ];
}

function logEvent(event, details = {}) {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      event,
      ...details
    })
  );
}

function logError(event, error, details = {}) {
  logEvent(event, {
    ...details,
    error: error instanceof Error ? error.message : String(error)
  });
}

if (!TOKEN || !TARGET_USER_ID) {
  console.error(
    "Missing DISCORD_BOT_TOKEN or TARGET_USER_ID in your .env file."
  );
  process.exit(1);
}

if (ENABLE_NICKNAME_SYNC && !TARGET_NICKNAME) {
  console.error(
    "ENABLE_NICKNAME_SYNC is true but TARGET_NICKNAME is missing in your .env file."
  );
  process.exit(1);
}

if (
  Number.isNaN(TARGET_REPLY_CHANCE) ||
  TARGET_REPLY_CHANCE < 0 ||
  TARGET_REPLY_CHANCE > 1
) {
  console.error("TARGET_REPLY_CHANCE must be a number between 0 and 1.");
  process.exit(1);
}

if (USE_GEMMA && !GEMMA_API_KEY) {
  console.error("USE_GEMMA is true but GEMMA_API_KEY is missing.");
  process.exit(1);
}

if (USE_GEMMA && typeof fetch !== "function") {
  console.error(
    "This Node.js runtime does not support fetch. Use Node 18+ for Gemma API mode."
  );
  process.exit(1);
}

if (
  Number.isNaN(GEMMA_TEMPERATURE) ||
  Number.isNaN(GEMMA_MAX_OUTPUT_TOKENS) ||
  GEMMA_MAX_OUTPUT_TOKENS <= 0 ||
  Number.isNaN(GEMMA_STYLE_EXAMPLE_COUNT) ||
  GEMMA_STYLE_EXAMPLE_COUNT <= 0
) {
  console.error(
    "Invalid GEMMA_TEMPERATURE, GEMMA_MAX_OUTPUT_TOKENS, or GEMMA_STYLE_EXAMPLE_COUNT in your .env file."
  );
  process.exit(1);
}

if (ENABLE_TEST_COMMAND && !TEST_COMMAND) {
  console.error("ENABLE_TEST_COMMAND is true but TEST_COMMAND is empty.");
  process.exit(1);
}

if (ENABLE_GIF_COMMAND && !GIF_COMMAND) {
  console.error("ENABLE_GIF_COMMAND is true but GIF_COMMAND is empty.");
  process.exit(1);
}

if (ENABLE_GIF_COMMAND && !GIPHY_API_KEY) {
  console.error("ENABLE_GIF_COMMAND is true but GIPHY_API_KEY is missing.");
  process.exit(1);
}

if (
  ENABLE_GIF_COMMAND &&
  GIF_USE_GEMMA_CONTEXT &&
  GIF_LLM_PROVIDER === "gemma" &&
  !GEMMA_API_KEY
) {
  console.error(
    "GIF_LLM_PROVIDER is gemma but GEMMA_API_KEY is missing."
  );
  process.exit(1);
}

if (!["gemma", "groq"].includes(GIF_LLM_PROVIDER)) {
  console.error("GIF_LLM_PROVIDER must be either 'gemma' or 'groq'.");
  process.exit(1);
}

if (
  ENABLE_GIF_COMMAND &&
  (GIF_USE_GEMMA_CONTEXT ||
    GIF_ENABLE_CANDIDATE_RERANK ||
    GIF_ENABLE_VISION_RERANK) &&
  GIF_LLM_PROVIDER === "groq" &&
  !GROQ_API_KEY
) {
  console.error(
    "GIF_LLM_PROVIDER is groq but GROQ_API_KEY is missing."
  );
  process.exit(1);
}

if (
  ENABLE_GIF_COMMAND &&
  GIF_ENABLE_VISION_RERANK &&
  !GROQ_API_KEY
) {
  console.error(
    "GIF_ENABLE_VISION_RERANK is true but GROQ_API_KEY is missing."
  );
  process.exit(1);
}

if (ENABLE_GIF_COMMAND && typeof fetch !== "function") {
  console.error(
    "This Node.js runtime does not support fetch. Use Node 18+ for GIPHY API mode."
  );
  process.exit(1);
}

if (
  Number.isNaN(GIPHY_SEARCH_LIMIT) ||
  GIPHY_SEARCH_LIMIT <= 0 ||
  GIPHY_SEARCH_LIMIT > 50
) {
  console.error("GIPHY_SEARCH_LIMIT must be a number between 1 and 50.");
  process.exit(1);
}

if (
  Number.isNaN(GIF_MAX_ATTEMPTS) ||
  GIF_MAX_ATTEMPTS < 1 ||
  GIF_MAX_ATTEMPTS > 5
) {
  console.error("GIF_MAX_ATTEMPTS must be a number between 1 and 5.");
  process.exit(1);
}

if (
  Number.isNaN(GIF_CONTEXT_MESSAGE_LIMIT) ||
  GIF_CONTEXT_MESSAGE_LIMIT < 1 ||
  GIF_CONTEXT_MESSAGE_LIMIT > 25 ||
  Number.isNaN(GIF_CONTEXT_MAX_MESSAGE_CHARS) ||
  GIF_CONTEXT_MAX_MESSAGE_CHARS < 40 ||
  GIF_CONTEXT_MAX_MESSAGE_CHARS > 1000
) {
  console.error(
    "GIF_CONTEXT_MESSAGE_LIMIT must be 1-25 and GIF_CONTEXT_MAX_MESSAGE_CHARS must be 40-1000."
  );
  process.exit(1);
}

if (
  Number.isNaN(GIF_RECENT_FOCUS_MESSAGE_COUNT) ||
  GIF_RECENT_FOCUS_MESSAGE_COUNT < 1 ||
  GIF_RECENT_FOCUS_MESSAGE_COUNT > 10
) {
  console.error(
    "GIF_RECENT_FOCUS_MESSAGE_COUNT must be a number between 1 and 10."
  );
  process.exit(1);
}

if (
  Number.isNaN(GIF_RERANK_CANDIDATE_COUNT) ||
  GIF_RERANK_CANDIDATE_COUNT < 1 ||
  GIF_RERANK_CANDIDATE_COUNT > 10
) {
  console.error("GIF_RERANK_CANDIDATE_COUNT must be a number between 1 and 10.");
  process.exit(1);
}

if (
  Number.isNaN(GIF_VISION_CANDIDATE_COUNT) ||
  GIF_VISION_CANDIDATE_COUNT < 1 ||
  GIF_VISION_CANDIDATE_COUNT > 5
) {
  console.error(
    "GIF_VISION_CANDIDATE_COUNT must be a number between 1 and 5."
  );
  process.exit(1);
}

if (ENABLE_ARGUE_COMMAND && !ARGUE_COMMAND) {
  console.error("ENABLE_ARGUE_COMMAND is true but ARGUE_COMMAND is empty.");
  process.exit(1);
}

if (ENABLE_ARGUE_COMMAND && !GROQ_API_KEY) {
  console.error("ENABLE_ARGUE_COMMAND is true but GROQ_API_KEY is missing.");
  process.exit(1);
}

if (ENABLE_ARGUE_COMMAND && typeof fetch !== "function") {
  console.error(
    "This Node.js runtime does not support fetch. Use Node 18+ for !argue mode."
  );
  process.exit(1);
}

if (
  Number.isNaN(ARGUE_CONTEXT_MESSAGE_LIMIT) ||
  ARGUE_CONTEXT_MESSAGE_LIMIT < 5 ||
  ARGUE_CONTEXT_MESSAGE_LIMIT > 100 ||
  Number.isNaN(ARGUE_CONTEXT_MAX_MESSAGE_CHARS) ||
  ARGUE_CONTEXT_MAX_MESSAGE_CHARS < 80 ||
  ARGUE_CONTEXT_MAX_MESSAGE_CHARS > 2000
) {
  console.error(
    "ARGUE_CONTEXT_MESSAGE_LIMIT must be 5-100 and ARGUE_CONTEXT_MAX_MESSAGE_CHARS must be 80-2000."
  );
  process.exit(1);
}

if (
  Number.isNaN(ARGUE_INACTIVE_TIMEOUT_MS) ||
  ARGUE_INACTIVE_TIMEOUT_MS < 30_000 ||
  ARGUE_INACTIVE_TIMEOUT_MS > 3_600_000 ||
  Number.isNaN(ARGUE_REPLY_COOLDOWN_MS) ||
  ARGUE_REPLY_COOLDOWN_MS < 0 ||
  ARGUE_REPLY_COOLDOWN_MS > 120_000 ||
  Number.isNaN(ARGUE_MAX_BOT_REPLIES) ||
  ARGUE_MAX_BOT_REPLIES < 1 ||
  ARGUE_MAX_BOT_REPLIES > 25 ||
  Number.isNaN(ARGUE_MAX_SESSION_MS) ||
  ARGUE_MAX_SESSION_MS < 60_000 ||
  ARGUE_MAX_SESSION_MS > 7_200_000 ||
  Number.isNaN(ARGUE_RESPONSE_MAX_CHARS) ||
  ARGUE_RESPONSE_MAX_CHARS < 80 ||
  ARGUE_RESPONSE_MAX_CHARS > 1800
) {
  console.error(
    "Invalid ARGUE_* timing, reply count, or response length setting in your .env file."
  );
  process.exit(1);
}

if (ENABLE_MIMIC_COMMAND && (!MIMIC_COMMAND || !UNMIMIC_COMMAND)) {
  console.error(
    "ENABLE_MIMIC_COMMAND is true but MIMIC_COMMAND or UNMIMIC_COMMAND is empty."
  );
  process.exit(1);
}

if (ENABLE_MIMIC_COMMAND && !GROQ_API_KEY) {
  console.error("ENABLE_MIMIC_COMMAND is true but GROQ_API_KEY is missing.");
  process.exit(1);
}

if (ENABLE_MIMIC_COMMAND && typeof fetch !== "function") {
  console.error(
    "This Node.js runtime does not support fetch. Use Node 18+ for mimic mode."
  );
  process.exit(1);
}

if (
  Number.isNaN(MIMIC_HISTORY_FETCH_LIMIT) ||
  MIMIC_HISTORY_FETCH_LIMIT < 10 ||
  MIMIC_HISTORY_FETCH_LIMIT > 100 ||
  Number.isNaN(MIMIC_CONTEXT_MESSAGE_LIMIT) ||
  MIMIC_CONTEXT_MESSAGE_LIMIT < 4 ||
  MIMIC_CONTEXT_MESSAGE_LIMIT > 30 ||
  Number.isNaN(MIMIC_RECENT_EXCHANGE_LIMIT) ||
  MIMIC_RECENT_EXCHANGE_LIMIT < 1 ||
  MIMIC_RECENT_EXCHANGE_LIMIT > 30 ||
  Number.isNaN(MIMIC_FOLLOWUP_WINDOW_MS) ||
  MIMIC_FOLLOWUP_WINDOW_MS < 10_000 ||
  MIMIC_FOLLOWUP_WINDOW_MS > 3_600_000 ||
  Number.isNaN(MIMIC_REPLY_COOLDOWN_MS) ||
  MIMIC_REPLY_COOLDOWN_MS < 5_000 ||
  MIMIC_REPLY_COOLDOWN_MS > 600_000 ||
  Number.isNaN(MIMIC_REPLY_MAX_CHARS) ||
  MIMIC_REPLY_MAX_CHARS < 80 ||
  MIMIC_REPLY_MAX_CHARS > 1800 ||
  Number.isNaN(MIMIC_TEMPERATURE) ||
  MIMIC_TEMPERATURE < 0 ||
  MIMIC_TEMPERATURE > 2 ||
  Number.isNaN(MIMIC_STYLE_MATCH_MIN) ||
  MIMIC_STYLE_MATCH_MIN < 0 ||
  MIMIC_STYLE_MATCH_MIN > 1 ||
  Number.isNaN(MIMIC_ORIGINALITY_MIN) ||
  MIMIC_ORIGINALITY_MIN < 0 ||
  MIMIC_ORIGINALITY_MIN > 1 ||
  Number.isNaN(MIMIC_MAX_EXAMPLES) ||
  MIMIC_MAX_EXAMPLES < 20 ||
  MIMIC_MAX_EXAMPLES > 2000 ||
  Number.isNaN(MIMIC_PROFILE_UPDATE_EXAMPLE_COUNT) ||
  MIMIC_PROFILE_UPDATE_EXAMPLE_COUNT < 3 ||
  MIMIC_PROFILE_UPDATE_EXAMPLE_COUNT > 100 ||
  Number.isNaN(MIMIC_EARLY_PROFILE_EXAMPLE_COUNT) ||
  MIMIC_EARLY_PROFILE_EXAMPLE_COUNT < 8 ||
  MIMIC_EARLY_PROFILE_EXAMPLE_COUNT > 500 ||
  Number.isNaN(MIMIC_EARLY_PROFILE_UPDATE_EXAMPLE_COUNT) ||
  MIMIC_EARLY_PROFILE_UPDATE_EXAMPLE_COUNT < 1 ||
  MIMIC_EARLY_PROFILE_UPDATE_EXAMPLE_COUNT > 50 ||
  Number.isNaN(MIMIC_UNSTABLE_PROFILE_EXAMPLE_COUNT) ||
  MIMIC_UNSTABLE_PROFILE_EXAMPLE_COUNT < 3 ||
  MIMIC_UNSTABLE_PROFILE_EXAMPLE_COUNT > 100
) {
  console.error(
    "Invalid MIMIC_* history, context, follow-up, cooldown, length, or profile setting in your .env file."
  );
  process.exit(1);
}

if (
  !Array.isArray(RANDOM_MESSAGES) ||
  RANDOM_MESSAGES.length === 0 ||
  RANDOM_MESSAGES.some(
    (messageText) => typeof messageText !== "string" || !messageText.trim()
  )
) {
  console.error(
    "messages.json must contain a non-empty 'messages' array of non-empty strings."
  );
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const warnedGuildIds = new Set();
const giphyRandomIdsByUserId = new Map();
const activeArgueSessions = new Map();
const activeMimicSessions = new Map();
let nicknameSyncInProgress = false;

function pickRandomFallbackReply() {
  const randomIndex = Math.floor(Math.random() * RANDOM_MESSAGES.length);
  return RANDOM_MESSAGES[randomIndex];
}

function normalizeReplyText(text) {
  return text.replace(/\s+/g, " ").trim().slice(0, 2000);
}

function buildGemmaUserPrompt(message, overrideTargetText = null) {
  const targetMessage =
    overrideTargetText?.trim() ||
    message.content?.trim() ||
    `User sent a message with ${
      message.attachments.size
    } attachment(s) and no text content.`;

  const styleExamples = RANDOM_MESSAGES.slice(0, GEMMA_STYLE_EXAMPLE_COUNT)
    .map((sample, index) => `${index + 1}. ${sample}`)
    .join("\n");

  return [
    `Target user tag: ${message.author.tag}`,
    "Target user's latest message (verbatim):",
    `"""${targetMessage.slice(0, 1200)}"""`,
    "Style examples to mimic tone:",
    styleExamples || "1. Keep it short and witty.",
    "Task: Write exactly one reply to that message.",
    "Rules: one line, under 160 characters, directly reference the message topic, imply they are a smut reader as an inside joke, no @mentions, no surrounding quotes, no labels."
  ].join("\n\n");
}

async function generateGemmaReply(message, overrideTargetText = null) {
  const endpoint = `${GEMMA_API_BASE_URL}/models/${GEMMA_MODEL}:generateContent?key=${encodeURIComponent(
    GEMMA_API_KEY
  )}`;
  const promptText = buildGemmaUserPrompt(message, overrideTargetText);

  const payload = {
    systemInstruction: {
      parts: [{ text: GEMMA_SYSTEM_PROMPT }]
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: promptText
          }
        ]
      }
    ],
    generationConfig: {
      temperature: GEMMA_TEMPERATURE,
      maxOutputTokens: GEMMA_MAX_OUTPUT_TOKENS
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
      `Gemma API request failed (${response.status}): ${bodyText.slice(0, 300)}`
    );
  }

  const data = await response.json();
  const candidateText = data?.candidates
    ?.flatMap((candidate) => candidate?.content?.parts ?? [])
    .map((part) => part?.text)
    .find((text) => typeof text === "string" && text.trim());

  if (!candidateText) {
    throw new Error("Gemma API returned no text candidate.");
  }

  const normalized = normalizeReplyText(candidateText);
  if (!normalized) {
    throw new Error("Gemma API returned empty text after normalization.");
  }

  return normalized;
}

function isTestCommandMessage(content) {
  if (!ENABLE_TEST_COMMAND) return false;
  if (!content?.trim()) return false;

  return content.trim().toLowerCase().startsWith(TEST_COMMAND.toLowerCase());
}

function parseTestCommandInlineInput(content) {
  const trimmed = content.trim();
  const inline = trimmed.slice(TEST_COMMAND.length).trim();
  return inline || null;
}

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

function parseMimicCommandInput(content) {
  return content.trim().slice(MIMIC_COMMAND.length).trim();
}

function parseUnmimicCommandInput(content) {
  return content.trim().slice(UNMIMIC_COMMAND.length).trim();
}

function isUserAllowedToPromptBot(userId) {
  return (
    DISCORD_USER_WHITELIST_IDS.size === 0 ||
    DISCORD_USER_WHITELIST_IDS.has(userId)
  );
}

async function blockUnauthorizedPrompt(message, commandName) {
  logEvent("prompt_command_blocked_user_not_whitelisted", {
    guildId: message.guild?.id ?? "dm",
    channelId: message.channel.id,
    authorId: message.author.id,
    commandName
  });

  await message
    .reply({
      content: "You are not allowed to use that bot command.",
      allowedMentions: { parse: [], repliedUser: false }
    })
    .catch(() => null);
}

function parseJsonObjectFromText(text) {
  const trimmed = text?.trim() ?? "";
  if (!trimmed) {
    throw new Error("Model returned an empty response.");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Model response did not include a JSON object.");
    }

    return JSON.parse(jsonMatch[0]);
  }
}

function getGroqTextModelAttempts(primaryModel, fallbackModels = []) {
  return [
    ...new Set([primaryModel, ...fallbackModels, ...GROQ_TEXT_FALLBACK_MODELS])
  ].filter(Boolean);
}

function hasConfiguredGemmaApiKey() {
  return Boolean(
    GEMMA_API_KEY &&
      GEMMA_API_KEY.trim() &&
      !GEMMA_API_KEY.toLowerCase().includes("your_gemma")
  );
}

function attachLlmMeta(parsed, meta) {
  if (parsed && typeof parsed === "object") {
    Object.defineProperty(parsed, "__llmMeta", {
      value: meta,
      enumerable: false,
      configurable: true
    });
  }

  return parsed;
}

function getLlmMeta(parsed) {
  return parsed?.__llmMeta ?? {};
}

async function callGroqJson({
  model,
  messages,
  temperature = 0.3,
  maxTokens = 256,
  timeoutMs = 10_000,
  fallbackModels = []
}) {
  const modelAttempts = getGroqTextModelAttempts(model, fallbackModels);
  const failures = [];

  for (const attemptModel of modelAttempts) {
    try {
      const parsed = await callGroqJsonOnce({
        model: attemptModel,
        messages,
        temperature,
        maxTokens,
        timeoutMs
      });

      if (attemptModel !== model) {
        logEvent("groq_json_fallback_model_succeeded", {
          primaryModel: model,
          model: attemptModel
        });
      }

      return attachLlmMeta(parsed, {
        provider: "groq",
        model: attemptModel,
        primaryModel: model
      });
    } catch (error) {
      failures.push({
        provider: "groq",
        model: attemptModel,
        error: error instanceof Error ? error.message : String(error)
      });

      logError("groq_json_model_failed_fallback_next", error, {
        primaryModel: model,
        model: attemptModel,
        willRetry:
          attemptModel !== modelAttempts[modelAttempts.length - 1] ||
          (ENABLE_GEMMA_LLM_FALLBACK && hasConfiguredGemmaApiKey())
      });
    }
  }

  if (ENABLE_GEMMA_LLM_FALLBACK && hasConfiguredGemmaApiKey()) {
    try {
      const parsed = await callGemmaJson({
        messages,
        temperature,
        maxTokens,
        timeoutMs: Math.max(timeoutMs, 12_000)
      });

      logEvent("gemma_json_fallback_model_succeeded", {
        primaryProvider: "groq",
        primaryModel: model,
        model: GEMMA_MODEL
      });

      return attachLlmMeta(parsed, {
        provider: "gemma",
        model: GEMMA_MODEL,
        primaryModel: model
      });
    } catch (error) {
      failures.push({
        provider: "gemma",
        model: GEMMA_MODEL,
        error: error instanceof Error ? error.message : String(error)
      });
      logError("gemma_json_fallback_failed", error, {
        primaryProvider: "groq",
        primaryModel: model,
        model: GEMMA_MODEL
      });
    }
  }

  throw new Error(
    `All JSON LLM attempts failed: ${failures
      .map((failure) => `${failure.provider}:${failure.model}: ${failure.error}`)
      .join(" | ")}`
  );
}

async function callGroqJsonOnce({
  model,
  messages,
  temperature = 0.3,
  maxTokens = 256,
  timeoutMs = 10_000
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(`${GROQ_API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: "json_object" }
      }),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(
      `Groq JSON request failed (${response.status}): ${bodyText.slice(0, 300)}`
    );
  }

  const data = await response.json();
  const candidateText = data?.choices
    ?.map((choice) => choice?.message?.content)
    .find((text) => typeof text === "string" && text.trim());

  if (!candidateText) {
    throw new Error("Groq returned no JSON candidate.");
  }

  return parseJsonObjectFromText(candidateText);
}

function groqMessagesToGemmaPrompt(messages) {
  const systemText = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const conversationText = messages
    .filter((message) => message.role !== "system")
    .map((message) => {
      const content =
        typeof message.content === "string"
          ? message.content
          : JSON.stringify(message.content);
      return `${message.role || "user"}:\n${content}`;
    })
    .join("\n\n");

  return { systemText, conversationText };
}

async function callGemmaJson({
  messages,
  temperature = 0.3,
  maxTokens = 256,
  timeoutMs = 12_000
}) {
  const { systemText, conversationText } = groqMessagesToGemmaPrompt(messages);
  const endpoint = `${GEMMA_API_BASE_URL}/models/${GEMMA_MODEL}:generateContent?key=${encodeURIComponent(
    GEMMA_API_KEY
  )}`;
  const payload = {
    systemInstruction: {
      parts: [
        {
          text:
            systemText ||
            "Return only a strict JSON object. Do not include markdown."
        }
      ]
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              conversationText,
              "",
              "Return only a strict JSON object. Do not include markdown."
            ].join("\n")
          }
        ]
      }
    ],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens
    }
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

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
      `Gemma JSON request failed (${response.status}): ${bodyText.slice(0, 300)}`
    );
  }

  const data = await response.json();
  const candidateText = data?.candidates
    ?.flatMap((candidate) => candidate?.content?.parts ?? [])
    .map((part) => part?.text)
    .find((text) => typeof text === "string" && text.trim());

  if (!candidateText) {
    throw new Error("Gemma returned no JSON candidate.");
  }

  return parseJsonObjectFromText(candidateText);
}

function getMessageAuthorLabel(message) {
  const displayName = getMessageAuthorName(message);
  return message.author.bot
    ? `${displayName} (bot)`
    : `${displayName} (@${message.author.username})`;
}

function getMessageAuthorName(message) {
  return (
    message.member?.displayName ||
    message.author.globalName ||
    message.author.username
  );
}

function getMessageSummary(message) {
  const content = message.content?.replace(/\s+/g, " ").trim() || "";
  const attachmentSummary =
    message.attachments.size > 0
      ? ` [${message.attachments.size} attachment(s)]`
      : "";
  const stickerSummary =
    message.stickers.size > 0 ? ` [${message.stickers.size} sticker(s)]` : "";
  const summary = `${content}${attachmentSummary}${stickerSummary}`.trim();

  if (!summary) {
    return "[no text content]";
  }

  return summary.slice(0, GIF_CONTEXT_MAX_MESSAGE_CHARS);
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function contentIncludesTerm(content, term) {
  const escapedTerm = escapeRegExp(term);
  return new RegExp(`(^|\\W)${escapedTerm}(?=$|\\W)`, "i").test(content);
}

function containsNonEnglishScriptText(text) {
  return /[\u0400-\u04ff\u0590-\u06ff\u0900-\u097f\u0e00-\u0e7f\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uac00-\ud7af]/u.test(
    String(text ?? "")
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

function getArgumentMessageSummary(message) {
  const content = message.content?.replace(/\s+/g, " ").trim() || "";
  const attachmentSummary =
    message.attachments.size > 0
      ? ` [${message.attachments.size} attachment(s): ${[
          ...message.attachments.values()
        ]
          .slice(0, 3)
          .map(
            (attachment) => attachment.contentType || attachment.name || "file"
          )
          .join(", ")}]`
      : "";
  const stickerSummary =
    message.stickers.size > 0 ? ` [${message.stickers.size} sticker(s)]` : "";
  const summary = `${content}${attachmentSummary}${stickerSummary}`.trim();

  if (!summary) {
    return "[no text content]";
  }

  return summary.slice(0, ARGUE_CONTEXT_MAX_MESSAGE_CHARS);
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

function normalizeArgumentReplyText(text, fallback) {
  const normalized = String(text ?? "")
    .replace(/<@!?\d+>/g, "")
    .replace(/@everyone/gi, "everyone")
    .replace(/@here/gi, "here")
    .replace(/\s+/g, " ")
    .trim();

  const reply = normalized || fallback;
  if (reply.length <= ARGUE_RESPONSE_MAX_CHARS) {
    return reply;
  }

  return `${reply.slice(0, ARGUE_RESPONSE_MAX_CHARS - 3).trim()}...`;
}

function asStringOrNull(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseModelBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return ["true", "yes", "1"].includes(value.trim().toLowerCase());
  }
  return false;
}

function parseModelConfidence(value) {
  const confidence = Number(value);
  if (Number.isNaN(confidence)) return 0;
  return Math.min(1, Math.max(0, confidence));
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

