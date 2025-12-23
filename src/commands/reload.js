module.exports = {
  name: "reload",
  ownerOnly: true,
  async run({ client, message }) {
    client.security.reload();
    await message.reply({ content: client.security.messages.bot.reloaded }).catch(() => null);
  }
};
