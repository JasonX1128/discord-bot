const path = require("path");

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
const MIMIC_RATE_LIMIT_COMMAND = (
  process.env.MIMIC_RATE_LIMIT_COMMAND ?? "!mimicrate"
).trim();
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
const MIMIC_IMPLICIT_FOLLOWUP_WINDOW_MS = Number(
  process.env.MIMIC_IMPLICIT_FOLLOWUP_WINDOW_MS ?? "45000"
);
const MIMIC_THREAD_LOCK_MS = Number(
  process.env.MIMIC_THREAD_LOCK_MS ?? "30000"
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
const MIMIC_AUTO_REPLY_CONFIDENCE_MIN = Number(
  process.env.MIMIC_AUTO_REPLY_CONFIDENCE_MIN ?? "0.72"
);
const MIMIC_FOLLOWUP_REPLY_CONFIDENCE_MIN = Number(
  process.env.MIMIC_FOLLOWUP_REPLY_CONFIDENCE_MIN ?? "0.65"
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

function validateConfig({ randomMessages }) {
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

  if (
    ENABLE_MIMIC_COMMAND &&
    (!MIMIC_COMMAND || !UNMIMIC_COMMAND || !MIMIC_RATE_LIMIT_COMMAND)
  ) {
    console.error(
      "ENABLE_MIMIC_COMMAND is true but a mimic command name is empty."
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
    Number.isNaN(MIMIC_IMPLICIT_FOLLOWUP_WINDOW_MS) ||
    MIMIC_IMPLICIT_FOLLOWUP_WINDOW_MS < 5_000 ||
    MIMIC_IMPLICIT_FOLLOWUP_WINDOW_MS > 600_000 ||
    Number.isNaN(MIMIC_THREAD_LOCK_MS) ||
    MIMIC_THREAD_LOCK_MS < 0 ||
    MIMIC_THREAD_LOCK_MS > 600_000 ||
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
    Number.isNaN(MIMIC_AUTO_REPLY_CONFIDENCE_MIN) ||
    MIMIC_AUTO_REPLY_CONFIDENCE_MIN < 0 ||
    MIMIC_AUTO_REPLY_CONFIDENCE_MIN > 1 ||
    Number.isNaN(MIMIC_FOLLOWUP_REPLY_CONFIDENCE_MIN) ||
    MIMIC_FOLLOWUP_REPLY_CONFIDENCE_MIN < 0 ||
    MIMIC_FOLLOWUP_REPLY_CONFIDENCE_MIN > 1 ||
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
    !Array.isArray(randomMessages) ||
    randomMessages.length === 0 ||
    randomMessages.some(
      (messageText) => typeof messageText !== "string" || !messageText.trim()
    )
  ) {
    console.error(
      "messages.json must contain a non-empty 'messages' array of non-empty strings."
    );
    process.exit(1);
  }
}

module.exports = {
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
  MIMIC_AUTO_REPLY_ENABLED,
  parseCommaSeparatedSet,
  parseCommaSeparatedList,
  validateConfig
};
