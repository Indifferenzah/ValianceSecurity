const { setGuildState } = require("./storage");

function registerPanicHit(client, guildId, executorId) {
  const cfg = client.security.config;
  if (!cfg.panic?.enabled) return false;

  let triggered = false;

  setGuildState(guildId, (gs) => {
    gs.panic = gs.panic || {};
    const now = Date.now();

    const bucket = gs.panic[executorId] || { t0: now, n: 0 };
    if (now - bucket.t0 > cfg.panic.windowMs) {
      bucket.t0 = now;
      bucket.n = 0;
    }

    bucket.n++;
    gs.panic[executorId] = bucket;

    if (bucket.n >= cfg.panic.threshold) {
      triggered = true;
    }
  });

  return triggered;
}

module.exports = { registerPanicHit };
