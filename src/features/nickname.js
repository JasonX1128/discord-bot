const {
  TARGET_NICKNAME,
  TARGET_USER_ID
} = require("../config");
const { logEvent, logError } = require("../logger");

function createNicknameSync({ client }) {
  const warnedGuildIds = new Set();
  let nicknameSyncInProgress = false;

  async function syncTargetNicknameInGuild(guild) {
    const member = await guild.members.fetch(TARGET_USER_ID).catch(() => null);
    if (!member) {
      logEvent("nickname_target_not_in_guild", {
        guildId: guild.id,
        guildName: guild.name
      });
      return;
    }

    if (!member.manageable) {
      if (!warnedGuildIds.has(guild.id)) {
        logEvent("nickname_not_manageable", {
          guildId: guild.id,
          guildName: guild.name,
          targetUserId: TARGET_USER_ID
        });
        warnedGuildIds.add(guild.id);
      }
      return;
    }

    warnedGuildIds.delete(guild.id);

    if (member.nickname === TARGET_NICKNAME) {
      logEvent("nickname_already_set", {
        guildId: guild.id,
        guildName: guild.name,
        targetUserId: TARGET_USER_ID,
        nickname: TARGET_NICKNAME
      });
      return;
    }

    try {
      await member.setNickname(TARGET_NICKNAME);
      logEvent("nickname_changed", {
        guildId: guild.id,
        guildName: guild.name,
        targetUserId: TARGET_USER_ID,
        nickname: TARGET_NICKNAME
      });
    } catch (error) {
      logError("nickname_change_failed", error, {
        guildId: guild.id,
        guildName: guild.name,
        targetUserId: TARGET_USER_ID
      });
    }
  }

  async function syncTargetNicknameAcrossGuilds() {
    if (nicknameSyncInProgress) return;
    nicknameSyncInProgress = true;
    logEvent("nickname_sync_started", { guildCount: client.guilds.cache.size });

    try {
      for (const guild of client.guilds.cache.values()) {
        await syncTargetNicknameInGuild(guild);
      }
    } finally {
      nicknameSyncInProgress = false;
      logEvent("nickname_sync_finished");
    }
  }

  return {
    syncTargetNicknameAcrossGuilds,
    syncTargetNicknameInGuild
  };
}

module.exports = { createNicknameSync };
