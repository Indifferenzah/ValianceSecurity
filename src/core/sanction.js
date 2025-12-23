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

  if (cfg.safety.ignoreIfExecutorIsOwner && isOwner(client, executorMember.id)) {
    return { mode: "none", text: msgs.sanction.none };
  }

  if (cfg.safety.ignoreIfExecutorIsWhitelisted && isWhitelisted(client, guild, executorMember)) {
    return { mode: "none", text: msgs.sanction.none };
  }

  if (cfg.safety.ignoreIfExecutorIsBot && executorMember.user.bot) {
    return { mode: "none", text: msgs.sanction.none };
  }

  if (cfg.safety.ignoreIfActionBySelf && executorMember.id === client.user.id) {
    return { mode: "none", text: msgs.sanction.none };
  }

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

/* =======================
   ORCHESTRATOR
======================= */

async function handleSecurityEvent({
  client,
  guild,
  moduleKey,
  action,
  executorUser,
  executorMember,
  targetUser,
  reason,
  details,
  restoreFn
}) {
  const cfg = client.security.config;
  if (!cfg.modules?.[moduleKey]?.enabled) return;

  /* 1️⃣ PANIC CHECK */
  const panic = registerPanicHit(client, guild.id, executorMember?.id);
  if (panic && cfg.panic?.enabled) {
    reason = cfg.panic.logReason;

    if (cfg.panic.actions?.lockdown) {
      setGuildState(guild.id, gs => {
        gs.lockdown = { enabled: true };
      });
    }
  }

  /* 2️⃣ SNAPSHOT (XENON STYLE) */
  if (cfg.restore?.enabled) {
    await snapshotGuild(guild).catch(() => null);
  }

  /* 3️⃣ SANCTION FIRST */
  const sanction = await applySanction({
    client,
    guild,
    executorMember,
    moduleKey,
    reason
  });

  /* 4️⃣ RESTORE (OPTIONAL) */
  if (typeof restoreFn === "function") {
    await restoreFn().catch(() => null);
  }

  /* 5️⃣ LOG */
  await sendLog(client, guild, {
    module: moduleKey,
    action,
    executorTag: formatTag(executorUser),
    targetTag: formatTag(targetUser),
    reason: reason || "",
    sanctionText: sanction.text,
    details: details || ""
  });
}

module.exports = {
  handleSecurityEvent,
  resolvePunishment
};
