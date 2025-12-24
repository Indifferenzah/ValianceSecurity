const { removeQuarantineFromMember } = require("../core/quarantine");

module.exports = {
  name: "unquarantine",
  ownerOnly: true,

  async run({ client, message, args }) {
    const cfg = client.security.config;
    const msgs = client.security.messages;

    if (!args[0]) {
      return message.reply({
        content: msgs.commands.unquarantine.usage.replace("{prefix}", cfg.prefix)
      }).catch(() => null);
    }

    const mention = message.mentions.members.first();
    const targetId = mention?.id || args[0].replace(/[<@!>]/g, "");

    const member = mention
      || await message.guild.members.fetch(targetId).catch(() => null);

    if (!member) {
      return message.reply({ content: msgs.commands.unquarantine.notFound }).catch(() => null);
    }

    const res = await removeQuarantineFromMember({
      guild: message.guild,
      client,
      member,
      reason: `Manual unquarantine by ${message.author.tag}`
    });

    if (res === "HIERARCHY") {
      return message.reply({ content: msgs.commands.unquarantine.hierarchy }).catch(() => null);
    }

    return message.reply({
      content: msgs.commands.unquarantine.done
        .replace("{targetTag}", `${member.user.tag} (${member.id})`)
    }).catch(() => null);
  }
};
