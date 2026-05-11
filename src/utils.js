const {
  ARGUE_CONTEXT_MAX_MESSAGE_CHARS,
  ARGUE_RESPONSE_MAX_CHARS,
  GIF_CONTEXT_MAX_MESSAGE_CHARS
} = require("./config");

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

module.exports = {
  parseJsonObjectFromText,
  getMessageAuthorLabel,
  getMessageAuthorName,
  getMessageSummary,
  escapeRegExp,
  contentIncludesTerm,
  containsNonEnglishScriptText,
  getArgumentMessageSummary,
  normalizeArgumentReplyText,
  asStringOrNull,
  parseModelBoolean,
  parseModelConfidence
};
