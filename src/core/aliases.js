const fs = require("fs");
const path = require("path");

function loadAliases() {
  const file = path.join(__dirname, "..", "..", "aliases.json");

  if (!fs.existsSync(file)) return {};

  try {
    const raw = fs.readFileSync(file, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function resolveAlias(commandName, aliases) {
  for (const [main, list] of Object.entries(aliases)) {
    if (list.includes(commandName)) {
      return main;
    }
  }
  return commandName;
}

module.exports = {
  loadAliases,
  resolveAlias
};
