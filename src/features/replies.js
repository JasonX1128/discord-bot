const {
  GEMMA_API_BASE_URL,
  GEMMA_API_KEY,
  GEMMA_MAX_OUTPUT_TOKENS,
  GEMMA_MODEL,
  GEMMA_STYLE_EXAMPLE_COUNT,
  GEMMA_SYSTEM_PROMPT,
  GEMMA_TEMPERATURE,
  ENABLE_TEST_COMMAND,
  TARGET_REACTION_EMOJI,
  TARGET_USER_ID,
  TEST_COMMAND,
  USE_GEMMA
} = require("../config");
const { logEvent, logError } = require("../logger");

function createReplyFeature({ randomMessages }) {
  function pickRandomFallbackReply() {
    const randomIndex = Math.floor(Math.random() * randomMessages.length);
    return randomMessages[randomIndex];
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

    const styleExamples = randomMessages.slice(0, GEMMA_STYLE_EXAMPLE_COUNT)
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

  async function selectReplyForMessage({
    message,
    gemmaInputText = null,
    eventContext = {}
  }) {
    let selectedReply = pickRandomFallbackReply();

    if (USE_GEMMA) {
      try {
        selectedReply = await generateGemmaReply(message, gemmaInputText);
        logEvent("gemma_reply_generated", {
          ...eventContext,
          model: GEMMA_MODEL
        });
      } catch (error) {
        logError("gemma_reply_failed_fallback_used", error, eventContext);
      }
    }

    return selectedReply;
  }

  async function reactToTargetMessage(message) {
    if (!TARGET_REACTION_EMOJI) return;

    try {
      await message.react(TARGET_REACTION_EMOJI);
      logEvent("target_message_reacted", {
        guildId: message.guild?.id ?? "dm",
        channelId: message.channel.id,
        targetUserId: TARGET_USER_ID,
        emoji: TARGET_REACTION_EMOJI
      });
    } catch (error) {
      logError("target_message_reaction_failed", error, {
        guildId: message.guild?.id ?? "dm",
        channelId: message.channel.id,
        targetUserId: TARGET_USER_ID,
        emoji: TARGET_REACTION_EMOJI
      });
    }
  }

  return {
    isTestCommandMessage,
    parseTestCommandInlineInput,
    reactToTargetMessage,
    selectReplyForMessage
  };
}

module.exports = { createReplyFeature };
