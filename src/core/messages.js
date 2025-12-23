const fs = require("fs");
const path = require("path");

const MESSAGES_PATH = path.join(__dirname, "..", "..", "messages.json");

function loadMessages(bustCache = false) {
  if (bustCache) delete require.cache[require.resolve(MESSAGES_PATH)];
  if (!fs.existsSync(MESSAGES_PATH)) throw new Error("messages.json mancante");
  const raw = fs.readFileSync(MESSAGES_PATH, "utf8");
  return JSON.parse(raw);
}

module.exports = { loadMessages };
