const { AuditLogEvent } = require("discord.js");
const { findAuditExecutor } = require("../core/audit");
const { handleSecurityEvent } = require("../core/sanction");

function registerAntiWebhooks(client) {
  client.on("webhooksUpdate", async (channel) => {
    const cfg = client.security.config;
    if (!cfg.modules?.antiWebhook?.enabled) return;
    if (!channel.guild) return;

    const entry = await findAuditExecutor(channel.guild, AuditLogEvent.WebhookCreate, cfg)
      || await findAuditExecutor(channel.guild, AuditLogEvent.WebhookUpdate, cfg)
      || await findAuditExecutor(channel.guild, AuditLogEvent.WebhookDelete, cfg);

    if (!entry || !entry.executor) return;

    const executorUser = entry.executor;
    const executorMember = await channel.guild.members.fetch(executorUser.id).catch(() => null);

    await handleSecurityEvent({
      client,
      guild: channel.guild,
      moduleKey: "antiWebhook",
      action: "WebhooksUpdate",
      executorUser,
      executorMember,
      targetUser: null,
      reason: entry.reason || cfg.punishments?.default?.reason,
      details: `channel=${channel.id} (${channel.name})`
    });
  });
}

module.exports = { registerAntiWebhooks };
