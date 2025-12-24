async function ensureQuarantineRoleForGuild(guild, client) {
  const cfg = client.security.config;
  if (!cfg.quarantine?.enabled) return null;

  // resolve by ID or by name
  let role =
    (cfg.quarantine.roleId && guild.roles.cache.get(cfg.quarantine.roleId)) ||
    guild.roles.cache.find(r => r.name === cfg.quarantine.roleName);

  // create if missing
  if (!role && cfg.quarantine.createIfMissing) {
    role = await guild.roles.create({
      name: cfg.quarantine.roleName,
      reason: "Security: create quarantine role"
    }).catch(() => null);
  }

  return role || null;
}

async function applyQuarantineToMember({ guild, client, member, reason }) {
  const cfg = client.security.config;

  const me = await guild.members.fetchMe().catch(() => null);
  if (!me) return "FAIL";

  // hierarchy: bot must be higher than target
  if (member.roles.highest.position >= me.roles.highest.position) return "HIERARCHY";

  const qRole = await ensureQuarantineRoleForGuild(guild, client);
  if (!qRole) return "FAIL";

  // optionally remove roles
  if (cfg.quarantine.removeAllRoles) {
    const keep = new Set([qRole.id, guild.id]); // keep @everyone + quarantine
    const toRemove = member.roles.cache.filter(r => !keep.has(r.id));
    for (const r of toRemove.values()) {
      await member.roles.remove(r, reason).catch(() => null);
    }
  }

  await member.roles.add(qRole, reason).catch(() => null);
  return "OK";
}

async function removeQuarantineFromMember({ guild, client, member, reason }) {
  const cfg = client.security.config;

  // ruolo quarantine
  const qRole =
    (cfg.quarantine.roleId && guild.roles.cache.get(cfg.quarantine.roleId)) ||
    guild.roles.cache.find(r => r.name === cfg.quarantine.roleName);

  if (!qRole) return "FAIL";

  // ruolo member da config lockdown
  const memberRoleId = cfg.lockdown?.member_role;
  const memberRole = memberRoleId
    ? guild.roles.cache.get(memberRoleId)
    : null;

  const me = await guild.members.fetchMe().catch(() => null);
  if (!me || member.roles.highest.position >= me.roles.highest.position) {
    return "HIERARCHY";
  }

  // se non è in quarantine, non fare nulla
  if (!member.roles.cache.has(qRole.id)) {
    return "OK";
  }

  // rimuovi quarantine
  await member.roles.remove(
    qRole,
    reason || "Manual unquarantine"
  ).catch(() => null);

  // aggiungi member_role se esiste e non è già presente
  if (memberRole && !member.roles.cache.has(memberRole.id)) {
    await member.roles.add(
      memberRole,
      reason || "Restore member role after quarantine"
    ).catch(() => null);
  }

  return "OK";
}

module.exports = {
  ensureQuarantineRoleForGuild,
  applyQuarantineToMember,
  removeQuarantineFromMember
};