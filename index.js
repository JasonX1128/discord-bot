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

  return [
    "Build or update a persistent Discord style profile from these messages.",
    "Focus on tone, pacing, humor, interests, recurring phrases, conversational habits, and things to avoid overdoing.",
    "Be specific about mechanics: typical length, lowercase/all-caps habits, typo/slang density, punctuation, directness, when they joke, and when they sound sincere.",
    "Do not write generic traits like 'sarcastic and humorous' unless examples strongly support them; explain the exact flavor.",
    "Treat the previous profile as a provisional hypothesis, not as ground truth.",
    "If the previous profile was built from only a few examples, revise it aggressively when newer examples contradict it.",
    "Do not let a small early cluster of weird, prompted, test-like, or uncharacteristic messages dominate the profile once broader evidence exists.",
    "Newest examples have override priority for correcting stale or bad notes, but use the broader sample to avoid overfitting to one moment.",
    "Recurring phrases are evidence, not commands. Mark phrases that would sound fake if overused in doNotOverdo.",
    "Do not infer sensitive traits. Do not include private or identifying secrets.",
    "Return exactly this JSON shape and nothing else:",
    "{\"profileSummary\":\"short paragraph\",\"styleNotes\":[\"note\"],\"interests\":[\"topic\"],\"recurringPhrases\":[\"phrase\"],\"doNotOverdo\":[\"warning\"]}",
    "",
    `User: ${profile.displayName} (@${profile.username})`,
    `Total stored examples: ${profile.examples.length}`,
    `Examples added since last profile update: ${newExampleCount}`,
    `Examples available at last profile update: ${examplesAtLastUpdate}`,
    `Previous profile summary: ${profile.profileSummary || "(none)"}`,
    `Previous style notes: ${profile.styleNotes.join("; ") || "(none)"}`,
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

  return [
    "You are a disclosed Discord style-simulation engine.",
    `The bot may post a message prefixed with ${JSON.stringify(prefix)}.`,
    "Never claim to be the real person, never imply the real person said this, and never reveal private facts.",
    "Decide whether a simulated contribution would naturally help the active conversation.",
    "Reply only when there is an active conversational opening: a question, direct prompt, joke setup, disagreement, or a moment where this user's style would add something.",
    "Have some agency: if replying, make a fresh conversational move. React, answer, tease, disagree, ask a short follow-up, or add a relevant opinion the target user might plausibly add.",
    "Do not merely retrieve an old example, summarize the chat, or parrot a catchphrase. Style examples are evidence, not templates.",
    "Tone fit matters more than topic fit: match their usual brevity, lowercase/all-caps habits, typo/slang density, punctuation, directness, and emotional intensity.",
    "Use at most one recurring phrase or slang marker, and only if it fits naturally. Never force 'bro', 'holy slop', or any other phrase just because it appears in examples.",
    "Avoid generic assistant diction, complete explanatory sentences, and polished corporate tone.",
    "Do not reproduce hateful or protected-class insults from examples; keep the target's vibe without copying that content.",
    referencedMimicBotMessage
      ? "The newest message is directly replying to the previous mimic-bot message shown below. Treat this as a direct prompt and answer it in the target user's style."
      : "No direct reply to a previous mimic-bot message is present.",
    recentUserFollowup
      ? "The newest message is from a user the mimic bot recently answered. Treat it as a continuing thread or multi-message request from that same user, even if Discord did not mark it as a reply."
      : "No recent same-user follow-up to a mimic-bot answer is present.",
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
    `Persistent profile: ${profile.profileSummary || "(not enough data yet)"}`,
    `Style notes: ${profile.styleNotes.join("; ") || "(none)"}`,
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
    mimicReplyMessageIds: new Set(),
    recentExchanges: [],
    recentRepliesByUserId: new Map(),
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
  const recentUserFollowup = getRecentMimicReplyForUser(
    session,
    message.author.id
  );
  const isRecentUserFollowup = Boolean(recentUserFollowup);
  const isDirectTrigger =
    isDirectMimicReply ||
    isRecentUserFollowup ||
    messageLooksLikeMimicTrigger(message, session);
  const cooldownRemainingMs =
    MIMIC_REPLY_COOLDOWN_MS - (Date.now() - session.lastReplyAt);
  if (!isDirectTrigger && cooldownRemainingMs > 0) {
    logEvent("mimic_reply_skipped_cooldown", {
      guildId: session.guildId,
      channelId: session.channelId,
      targetUserId: session.targetUserId,
      currentAuthorIsTarget,
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

  if (
    !isDirectMimicReply &&
    !isRecentUserFollowup &&
    (!decision.shouldReply ||
      decision.confidence < 0.55 ||
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
      decision.confidence < 0.45 ||
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

