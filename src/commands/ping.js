module.exports = {
  name: "ping",
  ownerOnly: true,
  async run({ client, message }) {
    const ms = Math.max(0, Math.round(client.ws.ping));
    const txt = client.security.messages.bot.pong.replace("{ms}", String(ms));
    await message.reply({ content: txt }).catch(() => null);
  }
};
