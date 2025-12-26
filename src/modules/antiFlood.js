const { handleSecurityEvent } = require("../core/sanction");

const floodMap = new Map();

function registerAntiFlood(client) {
  client.on("messageCreate", async (message) => {
    const cfg = client.security.config;
    const mod = cfg.modules?.antiFlood;

    if (!mod?.enabled) return;
    if (!message.guild) return;
    if (message.author.bot) return;

    const userId = message.author.id;
    const now = Date.now();

    const windowMs = mod.windowMs ?? 10000;
    const maxMessages = mod.maxMessages ?? 5;

    const bucket = floodMap.get(userId) || [];

    const recent = bucket.filter(ts => now - ts <= windowMs);
    recent.push(now);
    floodMap.set(userId, recent);

    if (recent.length <= maxMessages) return;

    floodMap.delete(userId);

    if (mod.deleteMessages) {
      await message.delete().catch(() => null);
    }

    const member = await message.guild.members
      .fetch(userId)
      .catch(() => null);

    await handleSecurityEvent({
      client,
      guild: message.guild,
      moduleKey: "antiFlood",
      action: "Flood",
      executorUser: message.author,
      executorMember: member,
      targetUser: message.author,
      reason: cfg.punishments?.default?.reason,
      details: `messages=${recent.length}/${maxMessages} in ${windowMs}ms`
    });
  });
}

module.exports = { registerAntiFlood };
