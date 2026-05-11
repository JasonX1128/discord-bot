const { DISCORD_USER_WHITELIST_IDS } = require("./config");
const { logEvent } = require("./logger");

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

module.exports = {
  isUserAllowedToPromptBot,
  blockUnauthorizedPrompt
};
