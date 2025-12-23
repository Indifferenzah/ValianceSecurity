const { AuditLogEvent } = require("discord.js");
const { findAuditExecutor } = require("../core/audit");
const { handleSecurityEvent } = require("../core/sanction");

function registerAntiVanity(client) {
  client.on("guildUpdate", async (oldG, newG) => {
    const cfg = client.security.config;
    if (!cfg.modules?.antiVanity?.enabled) return;

    // vanityURLCode requires partner/boost level; if null, ignore
    if ((oldG.vanityURLCode || "") === (newG.vanityURLCode || "")) return;

    const entry = await findAuditExecutor(newG, AuditLogEvent.GuildUpdate, cfg);
    if (!entry || !entry.executor) return;

    const executorUser = entry.executor;
    const executorMember = await newG.members.fetch(executorUser.id).catch(() => null);

    await handleSecurityEvent({
      client,
      guild: newG,
      moduleKey: "antiVanity",
      action: "GuildUpdate(vanity)",
      executorUser,
      executorMember,
      targetUser: null,
      reason: entry.reason || cfg.punishments?.default?.reason,
      details: `vanity: ${oldG.vanityURLCode || "none"} -> ${newG.vanityURLCode || "none"}`
      // restore vanity non è possibile via bot se non hai API/permessi specifici; logghiamo e basta.
    });
  });
}

module.exports = { registerAntiVanity };
