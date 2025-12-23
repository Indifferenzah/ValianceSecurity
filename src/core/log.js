const { EmbedBuilder } = require("discord.js");

function nowISO() {
  return new Date().toISOString();
}

function logInfo(client, message) {
  console.log(`[${nowISO()}] INFO: ${message}`);
}

async function sendLog(client, guild, payload) {
  const cfg = client.security.config;
  const msgs = client.security.messages;

  const channelId = cfg.logChannelId;
  if (!channelId) return;

  const ch = guild.channels.cache.get(channelId);
  if (!ch) return;

  const e = new EmbedBuilder()
    .setTitle(msgs.log.title)
    .addFields(
      { name: msgs.log.module, value: String(payload.module || "n/a"), inline: true },
      { name: msgs.log.action, value: String(payload.action || "n/a"), inline: true },
      { name: msgs.log.sanction, value: String(payload.sanctionText || "n/a"), inline: false },
      { name: msgs.log.executor, value: payload.executorTag || "n/a", inline: true },
      { name: msgs.log.target, value: payload.targetTag || "n/a", inline: true },
      { name: msgs.log.reason, value: String(payload.reason || "n/a"), inline: false }
    )
    .setTimestamp(new Date());

  if (payload.details) {
    e.addFields({ name: msgs.log.details, value: String(payload.details).slice(0, 1000), inline: false });
  }

  await ch.send({ embeds: [e] }).catch(() => null);
}

module.exports = { logInfo, sendLog };
