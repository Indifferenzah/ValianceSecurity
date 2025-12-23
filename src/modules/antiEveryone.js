const { handleSecurityEvent } = require("../core/sanction");

function registerAntiEveryone(client) {
  client.on("messageCreate", async (message) => {
    const cfg = client.security.config;
    if (!cfg.modules?.antiEveryone?.enabled) return;
    if (!message.guild) return;
    if (message.author.bot) return;

    const max = cfg.modules.antiEveryone.maxMentionsPerMessage ?? 1;
    const hasEveryone = message.mentions.everyone;
    if (!hasEveryone) return;

    // delete first? richiesta: sanziona prima e poi log.
    // Qui l’evento è "message", il target è l’autore: sanzioniamo prima, poi cancelliamo, poi log.
    const executorMember = await message.guild.members.fetch(message.author.id).catch(() => null);

    await handleSecurityEvent({
      client,
      guild: message.guild,
      moduleKey: "antiEveryone",
      action: "EveryoneMention",
      executorUser: message.author,
      executorMember,
      targetUser: message.author,
      reason: cfg.punishments?.default?.reason,
      details: `channel=${message.channel.id} messageId=${message.id}`,
      restoreFn: cfg.modules.antiEveryone.deleteMessage ? async () => {
        await message.delete().catch(() => null);
      } : null
    });
  });
}

module.exports = { registerAntiEveryone };
