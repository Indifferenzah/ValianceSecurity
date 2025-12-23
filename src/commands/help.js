const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "help",
  ownerOnly: true,
  async run({ client, message }) {
    const cfg = client.security.config;
    const msgs = client.security.messages;

    const e = new EmbedBuilder()
      .setTitle(msgs.commands.help.title)
      .setDescription((msgs.commands.help.lines || []).join("\n").replaceAll("{prefix}", cfg.prefix))
      .setTimestamp(new Date());

    await message.reply({ embeds: [e] }).catch(() => null);
  }
};
