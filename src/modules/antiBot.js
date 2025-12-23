const { AuditLogEvent } = require("discord.js");
const { findAuditExecutor } = require("../core/audit");
const { handleSecurityEvent } = require("../core/sanction");

function registerAntiBot(client) {
  client.on("guildMemberAdd", async (member) => {
    const cfg = client.security.config;
    if (!cfg.modules?.antiBot?.enabled) return;
    if (!member.user.bot) return;

    const entry = await findAuditExecutor(member.guild, AuditLogEvent.BotAdd, cfg);
    if (!entry || !entry.executor) return;

    const executorUser = entry.executor;
    const executorMember = await member.guild.members.fetch(executorUser.id).catch(() => null);

    // prima sanziona executor, poi kick bot, poi log (restoreFn usato come "post-action")
    await handleSecurityEvent({
      client,
      guild: member.guild,
      moduleKey: "antiBot",
      action: "BotAdd",
      executorUser,
      executorMember,
      targetUser: member.user,
      reason: entry.reason || cfg.punishments?.default?.reason,
      details: `bot=${member.user.id}`,
      restoreFn: async () => {
        if (cfg.modules.antiBot.action === "kickBot") {
          await member.kick("Security: unauthorized bot add").catch(() => null);
        }
      }
    });
  });
}

module.exports = { registerAntiBot };
