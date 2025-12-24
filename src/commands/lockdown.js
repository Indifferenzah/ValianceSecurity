module.exports = {
  name: "lockdown",
  ownerOnly: true,

  async run({ client, message, args }) {
    const cfg = client.security.config;
    if (!cfg.lockdown?.enabled) return;

    const mode = (args[0] || "").toLowerCase();
    if (!["on", "off"].includes(mode)) {
      return message.reply("uso: lockdown on|off").catch(() => null);
    }

    const guild = message.guild;
    const roleId = cfg.lockdown.member_role;
    const channelIds = cfg.lockdown.lockdown_channels || [];

    const role = guild.roles.cache.get(roleId);
    if (!role) {
      return message.reply("❌ member_role non valido in config").catch(() => null);
    }

    let touched = 0;

    for (const channelId of channelIds) {
      const channel = guild.channels.cache.get(channelId);
      if (!channel) continue;

      if (mode === "on") {
        await channel.permissionOverwrites.edit(
          role,
          { SendMessages: false },
          { reason: "Manual lockdown ON" }
        ).catch(() => null);
      }

      if (mode === "off") {
        await channel.permissionOverwrites.edit(
          role,
          { SendMessages: null },
          { reason: "Manual lockdown OFF" }
        ).catch(() => null);
      }

      touched++;
    }

    await message.reply(
      `✅ Lockdown ${mode.toUpperCase()} applicato su ${touched} canali.`
    ).catch(() => null);
  }
};
