const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "..", "..", "config.json");

function loadConfig(bustCache = false) {
  if (bustCache) delete require.cache[require.resolve(CONFIG_PATH)];
  if (!fs.existsSync(CONFIG_PATH)) throw new Error("config.json mancante");
  const raw = fs.readFileSync(CONFIG_PATH, "utf8");
  return JSON.parse(raw);
}

module.exports = { loadConfig };
