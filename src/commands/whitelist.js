const { setGuildState, getGuildState } = require("../core/storage");

module.exports = {
  name: "whitelist",
  ownerOnly: true,
  async run({ client, message, args }) {
    const sub = (args[0] || "").toLowerCase();

    if (sub === "list") {
      const gs = getGuildState(message.guild.id);
      const cfg = client.security.config;

      const users = [...new Set([...(cfg.whitelist?.users || []), ...(gs.whitelist?.users || [])])];
      const roles = [...new Set([...(cfg.whitelist?.roles || []), ...(gs.whitelist?.roles || [])])];

      return message.reply({
        content: `users: ${users.join(", ") || "none"}\nroles: ${roles.join(", ") || "none"}`
      }).catch(() => null);
    }

    const act = sub; // add/remove
    const type = (args[1] || "").toLowerCase(); // user/role
    const id = (args[2] || "").trim();

    if (!["add", "remove"].includes(act) || !["user", "role"].includes(type) || !id) {
      return message.reply({ content: "usage: whitelist add/remove user/role <id> | whitelist list" }).catch(() => null);
    }

    setGuildState(message.guild.id, (gs) => {
      gs.whitelist = gs.whitelist || { users: [], roles: [], channels: [] };
      const arr = type === "user" ? gs.whitelist.users : gs.whitelist.roles;

      if (act === "add" && !arr.includes(id)) arr.push(id);
      if (act === "remove") gs.whitelist[type === "user" ? "users" : "roles"] = arr.filter(x => x !== id);
    });

    await message.reply({ content: "ok" }).catch(() => null);
  }
};
