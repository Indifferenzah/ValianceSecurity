const { applyQuarantineToAllChannels } = require("../core/quarantineChannels");

module.exports = {
  name: "setquarantine",
  ownerOnly: true,

  async run({ client, message }) {
    await applyQuarantineToAllChannels(message.guild, client);

    await message.reply({
      content: "✅ Quarantine applicata a **tutti i canali** (inclusi quelli futuri)."
    }).catch(() => null);
  }
};
