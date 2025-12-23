const { AuditLogEvent } = require("discord.js");
const { findAuditExecutor } = require("../core/audit");
const { handleSecurityEvent } = require("../core/sanction");

function registerAntiBan(client) {
  client.on("guildBanAdd", async (ban) => {
    const cfg = client.security.config;
    if (!cfg.modules?.antiBan?.enabled) return;

    const entry = await findAuditExecutor(ban.guild, AuditLogEvent.MemberBanAdd, cfg);
    if (!entry || !entry.executor) return;

    const executorUser = entry.executor;
    const executorMember = await ban.guild.members.fetch(executorUser.id).catch(() => null);

    await handleSecurityEvent({
      client,
      guild: ban.guild,
      moduleKey: "antiBan",
      action: "MemberBanAdd",
      executorUser,
      executorMember,
      targetUser: ban.user,
      reason: entry.reason || cfg.punishments?.default?.reason,
      details: `bannedUser=${ban.user.id}`
    });
  });
}

module.exports = { registerAntiBan };
