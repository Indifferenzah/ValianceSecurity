const { AuditLogEvent } = require("discord.js");
const { findAuditExecutor } = require("../core/audit");
const { handleSecurityEvent } = require("../core/sanction");

function registerAntiStickers(client) {
  client.on("guildStickerCreate", async (sticker) => {
    const cfg = client.security.config;
    if (!cfg.modules?.antiSticker?.enabled) return;

    const entry = await findAuditExecutor(sticker.guild, AuditLogEvent.StickerCreate, cfg);
    if (!entry || !entry.executor) return;

    const executorUser = entry.executor;
    const executorMember = await sticker.guild.members.fetch(executorUser.id).catch(() => null);

    await handleSecurityEvent({
      client,
      guild: sticker.guild,
      moduleKey: "antiSticker",
      action: "StickerCreate",
      executorUser,
      executorMember,
      targetUser: null,
      reason: entry.reason || cfg.punishments?.default?.reason,
      details: `sticker=${sticker.id} (${sticker.name})`,
      restoreFn: async () => { await sticker.delete("Security: revert sticker create").catch(() => null); }
    });
  });
}

module.exports = { registerAntiStickers };
