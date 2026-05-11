# Discord Random Reply Bot

This bot sends a random message from a set list whenever a specific user sends a message. It also enforces that user's nickname automatically (not tied to message activity).

## 1) Install dependencies

```bash
npm install
```

## 2) Configure env vars

Copy `.env.example` to `.env`, then set:

- `DISCORD_BOT_TOKEN`: your bot token
- `TARGET_USER_ID`: the user ID that should trigger replies
- `ENABLE_NICKNAME_SYNC`: set `true` to enforce nickname updates (default `true`)
- `TARGET_NICKNAME`: nickname to enforce for that user (required when `ENABLE_NICKNAME_SYNC=true`)
- `TARGET_REPLY_CHANCE`: chance that a target-user message triggers a joke reply, from `0` to `1` (default `1`; `0.01` is about 1 in 100)
- `TARGET_REACTION_EMOJI`: emoji the bot reacts with on every target-user message (default `🍆`; set empty to disable)
- `LOG_ALL_MESSAGES`: set `true` to log every incoming message event (default `true`)
- `LOG_MESSAGE_CONTENT`: set `true` to include up to 200 chars of message content in logs (default `false`)
- `DISCORD_USER_WHITELIST_IDS`: optional comma-separated Discord user IDs allowed to use explicit bot commands like `!gif`; leave empty to allow everyone
- `USE_GEMMA`: set `true` to generate replies with Gemma API instead of local random messages
- `GEMMA_API_KEY`: your Gemma API key
- `GEMMA_MODEL`: Gemma model ID (default `gemma-4-26b-a4b-it`)
- `GEMMA_API_BASE_URL`: API base URL (default `https://generativelanguage.googleapis.com/v1beta`)
- `GEMMA_TEMPERATURE`: generation temperature (default `1.1`)
- `GEMMA_MAX_OUTPUT_TOKENS`: max generated tokens (default `80`)
- `GEMMA_SYSTEM_PROMPT`: instruction for the reply style (default includes the smut-reader inside joke)
- `GEMMA_STYLE_EXAMPLE_COUNT`: how many lines from `messages.json` are fed as style examples (default `8`)
- `ENABLE_TEST_COMMAND`: set `true` to allow manual test triggering (default `true`)
- `TEST_COMMAND`: message command to trigger a test reply (default `!testreply`)
- `TEST_COMMAND_REQUIRES_ADMIN`: if `true`, only members with `Manage Server` can use `TEST_COMMAND`
- `ENABLE_GIF_COMMAND`: set `true` to enable `!gif` GIF search (default `false`)
- `GIF_COMMAND`: message command to search for GIFs (default `!gif`)
- `GIF_COMMAND_REQUIRES_ADMIN`: if `true`, only members with `Manage Server` can use `GIF_COMMAND` (default `false`)
- `GIPHY_API_KEY`: your GIPHY API key, required when `ENABLE_GIF_COMMAND=true`
- `GIPHY_API_BASE_URL`: API base URL (default `https://api.giphy.com/v1`)
- `GIPHY_RATING`: max GIPHY content rating to return, such as `g`, `pg`, `pg-13`, or `r` (default `pg-13`)
- `GIPHY_LANG`: search language code (default `en`)
- `GIPHY_DEFAULT_QUERY`: search used when someone sends `!gif` without a prompt (default `reaction`)
- `GIPHY_SEARCH_LIMIT`: number of GIPHY results to consider per search, from `1` to `50` (default `20`)
- `GIF_MAX_ATTEMPTS`: how many different GIF search attempts the bot can make before giving up, from `1` to `5` (default `3`)
- `GIF_USE_GEMMA_CONTEXT`: set `true` to have the configured GIF query provider choose the GIPHY query from recent conversation context (default `true`)
- `GIF_CONTEXT_MESSAGE_LIMIT`: how many prior channel messages Gemma sees for `!gif` (default `10`, max `25`)
- `GIF_CONTEXT_MAX_MESSAGE_CHARS`: max characters included from each prior message (default `240`)
- `GIF_RECENT_FOCUS_MESSAGE_COUNT`: how many newest context messages are marked as the current topic for extra model weight (default `3`)
- `GIF_ENABLE_CANDIDATE_RERANK`: set `true` to have Groq choose the best GIF from the GIPHY results before sending (default `true`)
- `GIF_RERANK_CANDIDATE_COUNT`: how many top GIPHY results Groq considers, from `1` to `10` (default `8`)
- `GIF_ENABLE_VISION_RERANK`: set `true` to have Groq vision inspect candidate preview images before the title-based rerank fallback (default `true`)
- `GIF_VISION_CANDIDATE_COUNT`: how many candidate preview images Groq vision considers, from `1` to `5` (default `5`)
- `GIF_LLM_PROVIDER`: provider for context-aware GIF queries, either `groq` or `gemma` (default `gemma`)
- `GROQ_API_KEY`: your Groq API key, required when `GIF_LLM_PROVIDER=groq`
- `GROQ_API_BASE_URL`: Groq OpenAI-compatible API base URL (default `https://api.groq.com/openai/v1`)
- `GROQ_TEXT_FALLBACK_MODELS`: comma-separated Groq text models to try after the primary model fails or rate-limits, ordered from stronger to cheaper/faster fallback (default `openai/gpt-oss-120b,llama-3.3-70b-versatile,qwen/qwen3-32b,meta-llama/llama-4-scout-17b-16e-instruct,openai/gpt-oss-20b,llama-3.1-8b-instant,allam-2-7b`)
- `ENABLE_GEMMA_LLM_FALLBACK`: set `true` to use `GEMMA_API_KEY`/`GEMMA_MODEL` as a final JSON fallback after Groq models fail (default `true`)
- `GIF_GROQ_MODEL`: Groq model for GIF query generation (default `openai/gpt-oss-120b`)
- `GIF_VISION_MODEL`: Groq vision model for visual GIF candidate selection (default `meta-llama/llama-4-scout-17b-16e-instruct`)
- `ENABLE_ARGUE_COMMAND`: set `true` to enable the `!argue` argument-assist mode (default `false`)
- `ARGUE_COMMAND`: message command to start argument mode (default `!argue`)
- `ARGUE_COMMAND_REQUIRES_ADMIN`: if `true`, only members with `Manage Server` can use `ARGUE_COMMAND` (default `false`)
- `ARGUE_CONTEXT_MESSAGE_LIMIT`: how many prior human messages Groq sees when starting `!argue` (default `40`)
- `ARGUE_CONTEXT_MAX_MESSAGE_CHARS`: max characters included from each prior message (default `500`)
- `ARGUE_INACTIVE_TIMEOUT_MS`: argument mode stops after this much time without a relevant argument message (default `180000`)
- `ARGUE_REPLY_COOLDOWN_MS`: minimum time between bot replies in one argument session (default `12000`)
- `ARGUE_MAX_BOT_REPLIES`: max bot replies before the session auto-stops (default `8`)
- `ARGUE_MAX_SESSION_MS`: hard max lifetime for one argument session (default `600000`)
- `ARGUE_RESPONSE_MAX_CHARS`: max characters per argument reply (default `700`)
- `ARGUE_MODEL`: Groq model for argument analysis and replies (default matches `GIF_GROQ_MODEL`)
- `ENABLE_MIMIC_COMMAND`: set `true` to enable disclosed style mimicry with `!mimic`/`!unmimic` (default `false`)
- `MIMIC_COMMAND`: command to start mimic mode in the current channel (default `!mimic`)
- `UNMIMIC_COMMAND`: command to stop mimic mode in the current channel (default `!unmimic`)
- `MIMIC_COMMAND_REQUIRES_ADMIN`: if `true`, only members with `Manage Server` can use mimic commands (default `false`)
- `MIMIC_DATA_DIR`: folder where persistent mimic profiles/examples are stored (default `mimic_data`)
- `MIMIC_MODEL`: Groq model for mimic profile updates and reply decisions (default matches `GIF_GROQ_MODEL`)
- `MIMIC_MULTILINGUAL_MODEL`: Groq model used when the newest mimic-context message uses non-English scripts like Chinese (default `qwen/qwen3-32b`)
- `MIMIC_HISTORY_FETCH_LIMIT`: recent messages to scan for target examples when starting mimic mode, max `100` (default `100`)
- `MIMIC_CONTEXT_MESSAGE_LIMIT`: recent human messages used as live conversation context (default `14`)
- `MIMIC_RECENT_EXCHANGE_LIMIT`: recent mimic-bot exchanges remembered and included in the prompt (default `8`)
- `MIMIC_FOLLOWUP_WINDOW_MS`: how long a same-user follow-up after a mimic reply bypasses the normal cooldown (default `180000`)
- `MIMIC_REPLY_COOLDOWN_MS`: minimum time between mimic replies unless directly triggered (default `5000`)
- `MIMIC_REPLY_MAX_CHARS`: max generated mimic text before the disclosure prefix (default `500`)
- `MIMIC_TEMPERATURE`: creativity for mimic profile/reply generation, from `0` to `2` (default `0.75`)
- `MIMIC_STYLE_MATCH_MIN`: minimum model-rated tone/style match before auto-replying, from `0` to `1` (default `0.65`)
- `MIMIC_ORIGINALITY_MIN`: minimum model-rated originality before auto-replying, from `0` to `1` (default `0.45`)
- `MIMIC_MAX_EXAMPLES`: max stored example messages per user profile (default `250`)
- `MIMIC_PROFILE_UPDATE_EXAMPLE_COUNT`: new examples needed before refreshing the persistent profile summary (default `12`)
- `MIMIC_EARLY_PROFILE_EXAMPLE_COUNT`: until this many stored examples exist, refresh the profile more aggressively (default `50`)
- `MIMIC_EARLY_PROFILE_UPDATE_EXAMPLE_COUNT`: new examples needed for early-stage profile refreshes (default `3`)
- `MIMIC_UNSTABLE_PROFILE_EXAMPLE_COUNT`: if the last profile update used fewer than this many examples, refresh after each new example (default `8`)
- `MIMIC_DISCLOSURE_PREFIX`: prefix added to mimic replies (default `[mimic: {name}] `)
- `MIMIC_AUTO_REPLY_ENABLED`: set `false` to learn/store profiles without automatic mimic replies (default `true`)

## 3) Run the bot

```bash
npm start
```

## Customize the reply list

Edit `messages.json` and change the `messages` array.

If `USE_GEMMA=true`, the bot sends the target user's latest message + style examples from `messages.json` to Gemma to generate contextual replies.  
If the API fails, it falls back to `messages.json`.

## Testing without waiting

- Send `!testreply` to force a reply immediately.
- Send `!testreply some text here` to force a reply using that text as the prompt context.
- Or reply to someone else's message with `!testreply` to make the bot use the referenced message content.

## GIF command

The bot can send GIFs from GIPHY's public API:

- Set `ENABLE_GIF_COMMAND=true`.
- Set `GIPHY_API_KEY` to a key from the GIPHY Developer Dashboard.
- Set `GIF_LLM_PROVIDER=groq` and `GROQ_API_KEY` to use Groq/Llama for fast context-aware GIF queries.
- Send `!gif` to let Gemma choose a GIPHY search query from the last 10 messages.
- Send `!gif excited`, `!gif dramatic entrance`, etc. to give Gemma extra direction.

With `GIF_USE_GEMMA_CONTEXT=true`, the bot sends the configured GIF query provider an attributed transcript of the recent channel messages plus the optional text after `!gif`. The provider returns one short GIPHY search query, then the bot searches GIPHY with that query. If query generation fails, the bot falls back to the text after `!gif`, or `GIPHY_DEFAULT_QUERY` when no text was provided.

The newest `GIF_RECENT_FOCUS_MESSAGE_COUNT` messages are marked `[RECENT FOCUS]` in the model prompt. The prompt tells the model to treat those as the live conversation topic, even if the `!gif` user has not participated yet.

With `GIF_ENABLE_CANDIDATE_RERANK=true` and `GIF_LLM_PROVIDER=groq`, the bot sends Groq the top GIPHY result metadata and asks it to choose the candidate that best fits the conversation before sending.

With `GIF_ENABLE_VISION_RERANK=true`, the bot sends Groq vision still preview images for up to `GIF_VISION_CANDIDATE_COUNT` GIPHY candidates. If vision fails, it falls back to the title/metadata reranker.

For formal or philosophical recent messages, the bot biases toward subtle/thoughtful GIF queries and rejects candidate titles that look like loud confusion memes or goofy image macros.

If a GIF attempt fails, the bot retries up to `GIF_MAX_ATTEMPTS` times. Retries ask Groq for broader alternate GIPHY queries, then fall back to safe generic reaction queries such as `funny reaction` or `shocked reaction`.

To restrict who can prompt the bot, set:

```env
DISCORD_USER_WHITELIST_IDS=123456789012345678,234567890123456789
```

If `DISCORD_USER_WHITELIST_IDS` is empty, all users can use explicit bot commands.

Discord does not expose a private bot API for its built-in GIF picker database. Discord has historically used Tenor for GIF search, but Google says the Tenor API is being sunset on June 30, 2026, so this bot uses GIPHY instead.

## LLM fallback order

For JSON text tasks that use Groq, including `!gif` query selection, GIF title reranking, `!argue`, and `!mimic`, the bot tries the configured primary model first. By default that is `openai/gpt-oss-120b`. If Groq returns an error such as a rate limit, the bot tries this quality-first fallback stack:

```text
openai/gpt-oss-120b
llama-3.3-70b-versatile
qwen/qwen3-32b
meta-llama/llama-4-scout-17b-16e-instruct
openai/gpt-oss-20b
llama-3.1-8b-instant
allam-2-7b
```

If `ENABLE_GEMMA_LLM_FALLBACK=true` and `GEMMA_API_KEY` is set, Gemma is used as the final fallback after all Groq text models fail. Vision GIF reranking still starts with `GIF_VISION_MODEL`; if that fails, it falls back to the title/metadata reranker, which uses the text fallback stack above.

## Argue command

Set `ENABLE_ARGUE_COMMAND=true` and make sure `GROQ_API_KEY` is configured.

- Send `!argue` after a debate. The bot reads recent human messages, identifies who you were likely arguing with, announces a short session ID, sends one message defending your claim, and opens a short-lived session.
- Send `!argue your claim here` if you want to tell it what claim to defend while still using recent chat for context.
- Send `!argue stop` to end your active argument session in that channel.
- Send `!argue stop abc123` to end the active argument session with that ID in the current channel.

While active, the bot classifies each new channel message. It responds only when the message appears relevant to the same argument and challenges your side. Random interjections and unrelated side chatter are logged as ignored and do not get replies. The session ends after inactivity, after `ARGUE_MAX_BOT_REPLIES`, or after `ARGUE_MAX_SESSION_MS`.

The bot never replies to the user who started `!argue`; it only tracks their messages as context. If another user clearly joins the argument, the bot adds them to the opponent list and announces the updated names in-channel. During an active session, direct insults aimed at `jason`, `json`, or `jsn` are treated as argumentative and force a response.

