const fs = require("fs");
const path = require("path");

const STATE_PATH = path.join(__dirname, "..", "..", "data", "state.json");

const DEFAULT_STATE = {
  guilds: {}
};

/* =======================
   FILE SAFETY
======================= */

function ensureDir() {
  const dir = path.dirname(STATE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeSafe(state) {
  ensureDir();
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function readState() {
  ensureDir();

  if (!fs.existsSync(STATE_PATH)) {
    writeSafe(DEFAULT_STATE);
    return structuredClone(DEFAULT_STATE);
  }

  const raw = fs.readFileSync(STATE_PATH, "utf8").trim();

  if (!raw) {
    writeSafe(DEFAULT_STATE);
    return structuredClone(DEFAULT_STATE);
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
    // backup file corrotto
    const backup = `${STATE_PATH}.corrupted.${Date.now()}`;
    fs.writeFileSync(backup, raw);
    writeSafe(DEFAULT_STATE);
    return structuredClone(DEFAULT_STATE);
  }
}

/* =======================
   GUILD STATE
======================= */

function getGuildState(guildId) {
  const state = readState();

  if (!state.guilds[guildId]) {
    state.guilds[guildId] = {
      whitelist: { users: [], roles: [], channels: [] },
      quarantine: { enabled: true },
      lockdown: { enabled: false },
      ratelimit: {},
      panic: {},
      snapshots: []
    };
    writeSafe(state);
  }

  return state.guilds[guildId];
}

function setGuildState(guildId, updater) {
  const state = readState();

  state.guilds[guildId] ??= {
    whitelist: { users: [], roles: [], channels: [] },
    quarantine: { enabled: true },
    lockdown: { enabled: false },
    ratelimit: {},
    panic: {},
    snapshots: []
  };

  updater(state.guilds[guildId]);
  writeSafe(state);
}

module.exports = {
  readState,
  getGuildState,
  setGuildState
};
