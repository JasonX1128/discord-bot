require("dotenv").config();
const { Client, GatewayIntentBits, PermissionFlagsBits } = require("discord.js");
const { messages: RANDOM_MESSAGES } = require("./messages.json");
const config = require("./src/config");
const { logEvent, logError } = require("./src/logger");
const { hasConfiguredGemmaApiKey } = require("./src/llm");
const {
  blockUnauthorizedPrompt,
  isUserAllowedToPromptBot
} = require("./src/auth");
const { createReplyFeature } = require("./src/features/replies");
const argue = require("./src/features/argue");
const gif = require("./src/features/gif");
const { createMimicFeature } = require("./src/features/mimic");
const { createNicknameSync } = require("./src/features/nickname");

config.validateConfig({ randomMessages: RANDOM_MESSAGES });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const replies = createReplyFeature({ randomMessages: RANDOM_MESSAGES });
const mimic = createMimicFeature({ client });
const nickname = createNicknameSync({ client });

client.once("clientReady", async () => {
  logEvent("bot_ready", {
    botTag: client.user.tag,
    guildCount: client.guilds.cache.size,
    nicknameSyncEnabled: config.ENABLE_NICKNAME_SYNC,
    targetReplyChance: config.TARGET_REPLY_CHANCE,
    targetReactionEmoji: config.TARGET_REACTION_EMOJI || null,
    useGemma: config.USE_GEMMA,
    gemmaModel: config.USE_GEMMA ? config.GEMMA_MODEL : null,
    testCommandEnabled: config.ENABLE_TEST_COMMAND,
    testCommand: config.ENABLE_TEST_COMMAND ? config.TEST_COMMAND : null,
    gifCommandEnabled: config.ENABLE_GIF_COMMAND,
    gifCommand: config.ENABLE_GIF_COMMAND ? config.GIF_COMMAND : null,
    argueCommandEnabled: config.ENABLE_ARGUE_COMMAND,
    argueCommand: config.ENABLE_ARGUE_COMMAND ? config.ARGUE_COMMAND : null,
    argueModel: config.ENABLE_ARGUE_COMMAND ? config.ARGUE_MODEL : null,
    mimicCommandEnabled: config.ENABLE_MIMIC_COMMAND,
    mimicCommand: config.ENABLE_MIMIC_COMMAND ? config.MIMIC_COMMAND : null,
    unmimicCommand: config.ENABLE_MIMIC_COMMAND ? config.UNMIMIC_COMMAND : null,
    mimicRateLimitCommand: config.ENABLE_MIMIC_COMMAND
      ? config.MIMIC_RATE_LIMIT_COMMAND
      : null,
    mimicModel: config.ENABLE_MIMIC_COMMAND ? config.MIMIC_MODEL : null,
    mimicDataDir: config.ENABLE_MIMIC_COMMAND
      ? config.MIMIC_DATA_DIR_ABSOLUTE
      : null,
    groqTextFallbackModels: config.GROQ_TEXT_FALLBACK_MODELS,
    gemmaLlmFallbackEnabled:
      config.ENABLE_GEMMA_LLM_FALLBACK && hasConfiguredGemmaApiKey(),
    promptWhitelistEnabled: config.DISCORD_USER_WHITELIST_IDS.size > 0,
    gifCandidateRerankEnabled: config.GIF_ENABLE_CANDIDATE_RERANK,
    gifVisionRerankEnabled: config.GIF_ENABLE_VISION_RERANK,
    gifVisionModel: config.GIF_ENABLE_VISION_RERANK
      ? config.GIF_VISION_MODEL
      : null
  });

  if (config.ENABLE_ARGUE_COMMAND) {
    setInterval(() => {
      argue.cleanupExpiredArgueSessions();
    }, 60_000);
  }

  if (config.ENABLE_NICKNAME_SYNC) {
    await nickname.syncTargetNicknameAcrossGuilds();

    setInterval(() => {
      nickname.syncTargetNicknameAcrossGuilds().catch((error) => {
        logError("nickname_sync_loop_failed", error);
      });
    }, config.NICKNAME_SYNC_INTERVAL_MS);
  } else {
    logEvent("nickname_sync_disabled");
  }
});

client.on("guildCreate", async (guild) => {
  logEvent("joined_guild", { guildId: guild.id, guildName: guild.name });
  if (config.ENABLE_NICKNAME_SYNC) {
    await nickname.syncTargetNicknameInGuild(guild);
  }
});

client.on("messageCreate", async (message) => {
  const isTestCommand = replies.isTestCommandMessage(message.content);
  const isGifCommand = gif.isGifCommandMessage(message.content);
  const isArgueCommand = argue.isArgueCommandMessage(message.content);
  const isMimicCommand = mimic.isMimicCommandMessage(message.content);
  const isUnmimicCommand = mimic.isUnmimicCommandMessage(message.content);
  const isMimicRateLimitCommand = mimic.isMimicRateLimitCommandMessage(
    message.content
  );
  const messageLog = {
    guildId: message.guild?.id ?? "dm",
    guildName: message.guild?.name ?? "dm",
    channelId: message.channel.id,
    authorId: message.author.id,
    authorTag: message.author.tag,
    isBotAuthor: message.author.bot,
    isTargetUser: message.author.id === config.TARGET_USER_ID,
    isTestCommand,
    isGifCommand,
    isArgueCommand,
    isMimicCommand,
    isUnmimicCommand,
    isMimicRateLimitCommand,
    hasAttachments: message.attachments.size > 0
  };

  if (config.LOG_MESSAGE_CONTENT) {
    messageLog.content = message.content.slice(0, 200);
  }

  if (config.LOG_ALL_MESSAGES) {
    logEvent("message_received", messageLog);
  }

  if (message.author.bot) return;

  if (message.author.id === config.TARGET_USER_ID) {
    await replies.reactToTargetMessage(message);
  }

  if (
    (isTestCommand ||
      isGifCommand ||
      isArgueCommand ||
      isMimicCommand ||
      isUnmimicCommand ||
      isMimicRateLimitCommand) &&
    !isUserAllowedToPromptBot(message.author.id)
  ) {
    const commandName = isArgueCommand
      ? config.ARGUE_COMMAND
      : isMimicCommand
        ? config.MIMIC_COMMAND
        : isUnmimicCommand
          ? config.UNMIMIC_COMMAND
          : isMimicRateLimitCommand
            ? config.MIMIC_RATE_LIMIT_COMMAND
            : isGifCommand
              ? config.GIF_COMMAND
              : config.TEST_COMMAND;
    await blockUnauthorizedPrompt(message, commandName);
    return;
  }

  if (isTestCommand) {
    if (
      config.TEST_COMMAND_REQUIRES_ADMIN &&
      !message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)
    ) {
      logEvent("test_command_blocked_non_admin", {
        guildId: message.guild?.id ?? "dm",
        channelId: message.channel.id,
        authorId: message.author.id
      });
      return;
    }

    let gemmaInputText = replies.parseTestCommandInlineInput(message.content);
    let referencedMessage = null;

    if (!gemmaInputText && message.reference?.messageId) {
      referencedMessage = await message.fetchReference().catch(() => null);
      gemmaInputText = referencedMessage?.content?.trim() || null;
    }

    if (!gemmaInputText) {
      gemmaInputText = "Test trigger message.";
    }

    const selectedReply = await replies.selectReplyForMessage({
      message,
      gemmaInputText,
      eventContext: {
        guildId: message.guild?.id ?? "dm",
        channelId: message.channel.id,
        triggerType: "test_command"
      }
    });

    logEvent("test_command_triggered", {
      ...messageLog,
      usingReferencedMessage: Boolean(referencedMessage),
      selectedReply
    });

    try {
      if (referencedMessage) {
        await referencedMessage.reply({
          content: selectedReply,
          allowedMentions: { parse: [], repliedUser: false }
        });
      } else {
        await message.reply({
          content: selectedReply,
          allowedMentions: { parse: [], repliedUser: false }
        });
      }

      logEvent("test_reply_sent", {
        guildId: message.guild?.id ?? "dm",
        channelId: message.channel.id,
        authorId: message.author.id
      });
    } catch (error) {
      logError("test_reply_send_failed", error, {
        guildId: message.guild?.id ?? "dm",
        channelId: message.channel.id,
        authorId: message.author.id
      });
    }

    return;
  }

  if (isArgueCommand) {
    if (
      config.ARGUE_COMMAND_REQUIRES_ADMIN &&
      !message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)
    ) {
      logEvent("argue_command_blocked_non_admin", {
        guildId: message.guild?.id ?? "dm",
        channelId: message.channel.id,
        authorId: message.author.id
      });
      return;
    }

    const commandInput = argue.parseArgueCommandInput(message.content);

    try {
      if (commandInput.action === "stop") {
        await argue.stopArgueSessionForMessage(message, commandInput.sessionId);
      } else {
        await message.channel.sendTyping().catch(() => null);
        await argue.startArgueSession(message, commandInput.prompt);
      }
    } catch (error) {
      logError("argue_command_failed", error, {
        guildId: message.guild?.id ?? "dm",
        channelId: message.channel.id,
        authorId: message.author.id,
        action: commandInput.action
      });

      await message.reply({
        content: "I couldn't start argument mode right now.",
        allowedMentions: { parse: [], repliedUser: false }
      });
    }

    return;
  }

  if (isMimicCommand || isUnmimicCommand || isMimicRateLimitCommand) {
    if (
      config.MIMIC_COMMAND_REQUIRES_ADMIN &&
      !message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)
    ) {
      logEvent("mimic_command_blocked_non_admin", {
        guildId: message.guild?.id ?? "dm",
        channelId: message.channel.id,
        authorId: message.author.id,
        commandName: isMimicCommand
          ? config.MIMIC_COMMAND
          : isUnmimicCommand
            ? config.UNMIMIC_COMMAND
            : config.MIMIC_RATE_LIMIT_COMMAND
      });
      return;
    }

    try {
      await message.channel.sendTyping().catch(() => null);
      if (isMimicCommand) {
        await mimic.startMimicSession(message);
      } else if (isUnmimicCommand) {
        await mimic.stopMimicSession(message);
      } else {
        await mimic.setMimicRateLimit(message);
      }
    } catch (error) {
      logError("mimic_command_failed", error, {
        guildId: message.guild?.id ?? "dm",
        channelId: message.channel.id,
        authorId: message.author.id,
        commandName: isMimicCommand
          ? config.MIMIC_COMMAND
          : isUnmimicCommand
            ? config.UNMIMIC_COMMAND
            : config.MIMIC_RATE_LIMIT_COMMAND
      });

      await message.reply({
        content: "I couldn't update mimic mode right now.",
        allowedMentions: { parse: [], repliedUser: false }
      });
    }

    return;
  }

  if (isGifCommand) {
    if (
      config.GIF_COMMAND_REQUIRES_ADMIN &&
      !message.member?.permissions?.has(PermissionFlagsBits.ManageGuild)
    ) {
      logEvent("gif_command_blocked_non_admin", {
        guildId: message.guild?.id ?? "dm",
        channelId: message.channel.id,
        authorId: message.author.id
      });
      return;
    }

    const prompt = gif.parseGifCommandPrompt(message.content);

    try {
      await message.channel.sendTyping().catch(() => null);

      const selectedGifQuery = await gif.selectGifSearchQuery({
        commandMessage: message,
        userPrompt: prompt
      });
      const selectedGif = await gif.fetchGiphyGifWithRetries({
        commandMessage: message,
        userPrompt: prompt,
        firstQuery: selectedGifQuery.query,
        firstQuerySource: selectedGifQuery.source,
        userId: message.author.id
      });

      await message.channel.send({
        content: selectedGif.url,
        allowedMentions: { parse: [] }
      });

      gif.fireGiphySentAnalytics(
        selectedGif.analyticsGif,
        selectedGif.randomId
      ).catch((error) => {
        logError("giphy_sent_analytics_failed", error, {
          gifId: selectedGif.id,
          authorId: message.author.id
        });
      });

      logEvent("gif_sent", {
        guildId: message.guild?.id ?? "dm",
        channelId: message.channel.id,
        authorId: message.author.id,
        userPrompt: prompt,
        query: selectedGif.prompt,
        querySource: selectedGif.querySource,
        selectionSource: selectedGif.selectionSource,
        selectionIndex: selectedGif.selectionIndex,
        candidateCount: selectedGif.candidateCount,
        attemptNumber: selectedGif.attemptNumber,
        failedAttemptCount: selectedGif.failedAttempts.length,
        gifId: selectedGif.id,
        title: selectedGif.title
      });
    } catch (error) {
      logError("gif_command_failed", error, {
        guildId: message.guild?.id ?? "dm",
        channelId: message.channel.id,
        authorId: message.author.id,
        prompt
      });

      await message.reply({
        content: prompt
          ? `I couldn't find a GIF for "${prompt}".`
          : "I couldn't find a GIF right now.",
        allowedMentions: { parse: [], repliedUser: false }
      });
    }

    return;
  }

  if (await argue.handleActiveArgueSessions(message)) {
    return;
  }

  if (await mimic.handleActiveMimicSession(message)) {
    return;
  }

  if (message.author.id !== config.TARGET_USER_ID) return;

  const targetReplyRoll = Math.random();
  if (targetReplyRoll >= config.TARGET_REPLY_CHANCE) {
    logEvent("target_message_skipped_by_chance", {
      ...messageLog,
      targetReplyChance: config.TARGET_REPLY_CHANCE,
      roll: Number(targetReplyRoll.toFixed(6))
    });
    return;
  }

  const selectedReply = await replies.selectReplyForMessage({
    message,
    eventContext: {
      guildId: message.guild?.id ?? "dm",
      channelId: message.channel.id,
      targetUserId: config.TARGET_USER_ID,
      triggerType: "target_user_message"
    }
  });

  logEvent("target_message_detected", {
    ...messageLog,
    selectedReply
  });

  try {
    await message.channel.send({
      content: selectedReply,
      allowedMentions: { parse: [] }
    });
    logEvent("reply_sent", {
      guildId: message.guild?.id ?? "dm",
      channelId: message.channel.id,
      targetUserId: config.TARGET_USER_ID
    });
  } catch (error) {
    logError("reply_send_failed", error, {
      guildId: message.guild?.id ?? "dm",
      channelId: message.channel.id,
      targetUserId: config.TARGET_USER_ID
    });
  }
});

client.login(config.TOKEN);
