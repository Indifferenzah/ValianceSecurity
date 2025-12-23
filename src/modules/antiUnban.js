const { AuditLogEvent } = require("discord.js");
const { findAuditExecutor } = require("../core/audit");
const { handleSecurityEvent } = require("../core/sanction");

function registerAntiUnban(client) {
  client.on("guildBanRemove", async (ban) => {
    const cfg = client.security.config;
    if (!cfg.modules?.antiUnban?.enabled) return;

    const entry = await findAuditExecutor(ban.guild, AuditLogEvent.MemberBanRemove, cfg);
    if (!entry || !entry.executor) return;

    const executorUser = entry.executor;
    const executorMember = await ban.guild.members.fetch(executorUser.id).catch(() => null);

    await handleSecurityEvent({
      client,
      guild: ban.guild,
      moduleKey: "antiUnban",
      action: "MemberBanRemove",
      executorUser,
      executorMember,
      targetUser: ban.user,
      reason: entry.reason || cfg.punishments?.default?.reason,
      details: `unbannedUser=${ban.user.id}`
    });
  });
}

module.exports = { registerAntiUnban };
