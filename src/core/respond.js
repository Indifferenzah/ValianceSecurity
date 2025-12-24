const { loadCommand } = require("./sanction");
const path = require("path");
const fs = require("fs");
const { loadAliases, resolveAlias } = require("./aliases");

function isOwner(client, userId) {
  const owners = client.security.config.owners || [];
  return owners.includes(userId);
}

function setupCommandHandler(client) {
  const dir = path.join(__dirname, "..", "commands");
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".js"));
  for (const f of files) {
    const cmd = require(path.join(dir, f));
    client.security.commands.set(cmd.name, cmd);
  }

  const aliases = loadAliases();

  client.on("messageCreate", async (message) => {
    if (!message.guild) return;
    if (message.author.bot) return;

    const cfg = client.security.config;
    const prefix = cfg.prefix;

    if (!message.content.startsWith(prefix)) return;

    const [rawName, ...args] = message.content
      .slice(prefix.length)
      .trim()
      .split(/\s+/);

    let name = (rawName || "").toLowerCase();

    name = resolveAlias(name, aliases);

    const cmd = client.security.commands.get(name);
    if (!cmd) return;

    if (cmd.ownerOnly && !isOwner(client, message.author.id)) {
      return message.reply({
        content: client.security.messages.bot.ownerOnly
      }).catch(() => null);
    }

    try {
      await cmd.run({ client, message, args });
    } catch (e) {
      console.error(e);
    }
  });
}

module.exports = { setupCommandHandler };
