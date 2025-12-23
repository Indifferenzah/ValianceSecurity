const fs = require("fs");
const path = require("path");

const STATE_PATH = path.join(__dirname, "..", "..", "data", "state.json");

function ensureStateFile() {
  const dir = path.dirname(STATE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(STATE_PATH)) {
    fs.writeFileSync(STATE_PATH, JSON.stringify({ guilds: {} }, null, 2));
  }
}

function readState() {
  ensureStateFile();
  return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
}

function writeState(state) {
  ensureStateFile();
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function getGuildState(guildId) {
  const state = readState();
  state.guilds[guildId] = state.guilds[guildId] || {
    whitelist: { users: [], roles: [], channels: [] },
    quarantine: { enabled: true },
    lockdown: { enabled: false },
    snapshots: { channels: [], roles: [] },
    ratelimit: {}
  };
  writeState(state);
  return state.guilds[guildId];
}

function setGuildState(guildId, patchFn) {
  const state = readState();
  state.guilds[guildId] = state.guilds[guildId] || {
    whitelist: { users: [], roles: [], channels: [] },
    quarantine: { enabled: true },
    lockdown: { enabled: false },
    snapshots: { channels: [], roles: [] },
    ratelimit: {}
  };
  patchFn(state.guilds[guildId]);
  writeState(state);
}

module.exports = {
  ensureStateFile,
  readState,
  writeState,
  getGuildState,
  setGuildState
};
