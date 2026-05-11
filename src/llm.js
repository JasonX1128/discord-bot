const {
  ENABLE_GEMMA_LLM_FALLBACK,
  GEMMA_API_BASE_URL,
  GEMMA_API_KEY,
  GEMMA_MODEL,
  GROQ_API_BASE_URL,
  GROQ_API_KEY,
  GROQ_TEXT_FALLBACK_MODELS
} = require("./config");
const { logEvent, logError } = require("./logger");
const { parseJsonObjectFromText } = require("./utils");

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

module.exports = {
  callGroqJson,
  callGemmaJson,
  getLlmMeta,
  hasConfiguredGemmaApiKey
};
