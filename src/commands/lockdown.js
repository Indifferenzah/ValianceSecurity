const { setGuildState } = require("../core/storage");

module.exports = {
  name: "lockdown",
  ownerOnly: true,
  async run({ client, message, args }) {
    const v = (args[0] || "").toLowerCase();
    if (!["on", "off"].includes(v)) {
      return message.reply({ content: "usage: lockdown on|off" }).catch(() => null);
    }

    // stato
    setGuildState(message.guild.id, (gs) => {
      gs.lockdown = gs.lockdown || {};
      gs.lockdown.enabled = (v === "on");
    });

    // applicazione immediata (base): nega send/connect a @everyone
    if (v === "on") {
      const cfg = client.security.config;
      const denySend = !!cfg.lockdown?.channels?.denySendMessages;
      const denyConnect = !!cfg.lockdown?.channels?.denyConnect;

      for (const ch of message.guild.channels.cache.values()) {
        await ch.permissionOverwrites.edit(message.guild.roles.everyone, {
          SendMessages: denySend ? false : null,
          Connect: denyConnect ? false : null
        }).catch(() => null);
      }
    }

    await message.reply({ content: `lockdown=${v}` }).catch(() => null);
  }
};
