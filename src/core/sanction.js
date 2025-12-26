const { sendLog } = require("./log");
const { setGuildState, getGuildState } = require("./storage");
const { registerPanicHit } = require("./panic");
const { snapshotGuild } = require("./snapshot");

/* =======================
   UTILS
======================= */

function formatTag(user) {
  if (!user) return "n/a";
  return `${user.tag} (${user.id})`;
}

function resolvePunishment(client, moduleKey) {
  const cfg = client.security.config;
  const mod = cfg.modules?.[moduleKey];
  const ref = mod?.punishment || "default";
  return cfg.punishments?.[ref] || cfg.punishments?.default || { mode: "none" };
}

function isOwner(client, userId) {
  return (client.security.config.owners || []).includes(userId);
}

function isWhitelisted(client, guild, executorMember) {
  const cfg = client.security.config;
  const gstate = getGuildState(guild.id);

  const users = [
    ...(cfg.whitelist?.users || []),
    ...(gstate.whitelist?.users || [])
  ];

  const roles = [
    ...(cfg.whitelist?.roles || []),
    ...(gstate.whitelist?.roles || [])
  ];

  if (users.includes(executorMember.id)) return true;
  if (executorMember.roles.cache.some(r => roles.includes(r.id))) return true;

  return false;
}

/* =======================
   QUARANTINE
======================= */

async function ensureQuarantineRole(guild, client) {
  const cfg = client.security.config;
  if (!cfg.quarantine?.enabled) return null;

  let role =
    (cfg.quarantine.roleId && guild.roles.cache.get(cfg.quarantine.roleId)) ||
    guild.roles.cache.find(r => r.name === cfg.quarantine.roleName);

  if (!role && cfg.quarantine.createIfMissing) {
    role = await guild.roles.create({
      name: cfg.quarantine.roleName,
      reason: "Security: create quarantine role"
    }).catch(() => null);
  }

  return role;
}

/* =======================
   SANCTION
======================= */

async function applySanction({
  client,
  guild,
  executorMember,
  moduleKey,
  reason
}) {
  const cfg = client.security.config;
  const msgs = client.security.messages;
  const p = resolvePunishment(client, moduleKey);

  if (!executorMember) {
    return { mode: "none", text: msgs.sanction.none };
  }

  /* ---- SAFETY GUARDS ---- */

  const me = await guild.members.fetchMe().catch(() => null);
  if (!me || executorMember.roles.highest.position >= me.roles.highest.position) {
    return { mode: "none", text: msgs.sanction.none };
  }

  /* ---- APPLY ---- */

  const finalReason = p.reason || reason || "Security";
  let text = msgs.sanction.none;

  switch (p.mode) {
    case "timeout": {
      const ms = p.timeoutMs || 3600000;
      await executorMember.timeout(ms, finalReason).catch(() => null);
      text = msgs.sanction.timeout.replace("{timeoutMs}", String(ms));
      break;
    }

    case "kick":
      await executorMember.kick(finalReason).catch(() => null);
      text = msgs.sanction.kick;
      break;

    case "ban":
      await executorMember.ban({
        deleteMessageSeconds: p.banDeleteMessageSeconds ?? 0,
        reason: finalReason
      }).catch(() => null);
      text = msgs.sanction.ban;
      break;

    case "quarantine": {
      const qRole = await ensureQuarantineRole(guild, client);
      if (qRole) {
        if (cfg.quarantine.removeAllRoles) {
          const toRemove = executorMember.roles.cache.filter(r => r.id !== qRole.id);
          for (const r of toRemove.values()) {
            await executorMember.roles.remove(r, finalReason).catch(() => null);
          }
        }
        await executorMember.roles.add(qRole, finalReason).catch(() => null);
        text = msgs.sanction.quarantine;
      }
      break;
    }
  }

  return { mode: p.mode, text };
}

function shouldIgnoreEvent(client, guild, executorUser, executorMember) {
  const cfg = client.security.config;

  // se non abbiamo executorMember, non possiamo applicare whitelist roles ecc.
  const executorId = executorMember?.id || executorUser?.id;

  if (!executorId) return false;

  // self
  if (cfg.safety?.ignoreIfActionBySelf && client.user?.id && executorId === client.user.id) {
    return true;
  }

  // bot
  if (cfg.safety?.ignoreIfExecutorIsBot) {
    if (executorMember?.user?.bot) return true;
    if (executorUser?.bot) return true;
  }

  // owner
  const owners = cfg.owners || [];
  const isOwner = owners.includes(executorId);
  if (cfg.safety?.ignoreIfExecutorIsOwner && isOwner) return true;

  // whitelist (users + roles)
  if (cfg.safety?.ignoreIfExecutorIsWhitelisted && executorMember) {
    const { getGuildState } = require("./storage");
    const gstate = getGuildState(guild.id);

    const wlUsers = new Set([...(cfg.whitelist?.users || []), ...(gstate.whitelist?.users || [])]);
    if (wlUsers.has(executorMember.id)) return true;

    const wlRoles = new Set([...(cfg.whitelist?.roles || []), ...(gstate.whitelist?.roles || [])]);
    if (executorMember.roles.cache.some(r => wlRoles.has(r.id))) return true;
  }

  // whitelist user-only anche senza member
  if (cfg.safety?.ignoreIfExecutorIsWhitelisted && !executorMember) {
    const { getGuildState } = require("./storage");
    const gstate = getGuildState(guild.id);
    const wlUsers = new Set([...(cfg.whitelist?.users || []), ...(gstate.whitelist?.users || [])]);
    if (wlUsers.has(executorId)) return true;
  }

  return false;
}

/* =======================
   ORCHESTRATOR
======================= */

async function handleSecurityEvent({ client, guild, moduleKey, action, executorUser, executorMember, targetUser, reason, details, restoreFn }) {
  const cfg = client.security.config;
  const mod = cfg.modules?.[moduleKey];
  if (!mod?.enabled) return;

  // ✅ IGNORE GATE: se ignorato, non faccio nulla (niente restore!)
  if (shouldIgnoreEvent(client, guild, executorUser, executorMember)) {
    return;
  }

  // 1) sanction
  const sanction = await applySanction({ client, guild, executorMember, targetUser, moduleKey, reason });

  // 2) restore SOLO se l’evento NON è stato ignorato e SOLO se ha senso ripristinare
  if (typeof restoreFn === "function") {
    // opzionale: se vuoi ripristinare solo quando la punishment non è "none"
    if (sanction?.mode && sanction.mode !== "none") {
      await restoreFn().catch(() => null);
    }
  }

  // 3) log
  await sendLog(client, guild, {
    module: moduleKey,
    action,
    executorTag: executorUser ? formatTag(executorUser) : "n/a",
    targetTag: targetUser ? formatTag(targetUser) : "n/a",
    reason: reason || "",
    sanctionText: sanction?.text || "",
    details: details || ""
  });
}

module.exports = {
  handleSecurityEvent,
  resolvePunishment
};
