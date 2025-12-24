const { ensureQuarantineRoleForGuild, applyQuarantineToMember } = require("../core/quarantine");

module.exports = {
  name: "quarantine",
  ownerOnly: true,

  async run({ client, message, args }) {
    const cfg = client.security.config;
    const msgs = client.security.messages;

    const usage = msgs.commands?.quarantine?.usage?.replace("{prefix}", cfg.prefix) || "usage";
    if (!args[0]) return message.reply({ content: usage }).catch(() => null);

    // target: mention OR id
    const mention = message.mentions.members.first();
    const targetId = mention?.id || args[0].replace(/[<@!>]/g, "").trim();

    const targetMember = mention
      || (await message.guild.members.fetch(targetId).catch(() => null));

    if (!targetMember) {
      return message.reply({ content: msgs.commands?.quarantine?.notFound || "not found" }).catch(() => null);
    }

    // ensure role exists
    const qRole = await ensureQuarantineRoleForGuild(message.guild, client);
    if (!qRole) {
      const fail = (msgs.commands?.quarantine?.fail || "fail")
        .replace("{targetTag}", `${targetMember.user.tag} (${targetMember.id})`);
      return message.reply({ content: fail }).catch(() => null);
    }

    // apply quarantine
    const res = await applyQuarantineToMember({
      guild: message.guild,
      client,
      member: targetMember,
      reason: `Manual quarantine by ${message.author.tag} (${message.author.id})`
    });

    if (res === "HIERARCHY") {
      return message.reply({ content: msgs.commands?.quarantine?.hierarchy || "hierarchy" }).catch(() => null);
    }

    const ok = (msgs.commands?.quarantine?.done || "done")
      .replace("{targetTag}", `${targetMember.user.tag} (${targetMember.id})`);

    return message.reply({ content: ok }).catch(() => null);
  }
};
