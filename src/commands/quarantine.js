const { setGuildState } = require("../core/storage");

module.exports = {
  name: "quarantine",
  ownerOnly: true,
  async run({ message, args }) {
    const v = (args[0] || "").toLowerCase();
    if (!["on", "off"].includes(v)) {
      return message.reply({ content: "usage: quarantine on|off" }).catch(() => null);
    }
    setGuildState(message.guild.id, (gs) => {
      gs.quarantine = gs.quarantine || {};
      gs.quarantine.enabled = (v === "on");
    });
    await message.reply({ content: `quarantine=${v}` }).catch(() => null);
  }
};
