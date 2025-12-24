const { handleSecurityEvent } = require("../core/sanction");

const mentionCache = new Map();

function registerAntiGhostPing(client) {
  client.on("messageCreate", async (message) => {
    const cfg = client.security.config;
    if (!cfg.modules?.antiGhostPing?.enabled) return;
    if (!message.guild) return;
    if (message.author.bot) return;

    const mentioned = [...message.mentions.users.keys()];
    if (mentioned.length <= 0) return;

    mentionCache.set(message.id, {
      guildId: message.guild.id,
      authorId: message.author.id,
      mentionedIds: mentioned,
      ts: Date.now()
    });
  });

  client.on("messageDelete", async (message) => {
    const cfg = client.security.config;
    if (!cfg.modules?.antiGhostPing?.enabled) return;
    if (!message.guild) return;

    const item = mentionCache.get(message.id);
    if (!item) return;

    const windowMs = cfg.modules.antiGhostPing.windowMs ?? 15000;
    const minMentions = cfg.modules.antiGhostPing.minMentions ?? 1;

    mentionCache.delete(message.id);

    if ((Date.now() - item.ts) > windowMs) return;
    if ((item.mentionedIds?.length || 0) < minMentions) return;

    const member = await message.guild.members.fetch(item.authorId).catch(() => null);
    const user = member?.user || null;

    await handleSecurityEvent({
      client,
      guild: message.guild,
      moduleKey: "antiGhostPing",
      action: "GhostPing",
      executorUser: user,
      executorMember: member,
      targetUser: user,
      reason: cfg.punishments?.default?.reason,
      details: `mentions=${item.mentionedIds.join(",")}`
    });
  });
}

module.exports = { registerAntiGhostPing };
