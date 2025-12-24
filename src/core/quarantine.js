const { getGuildState, setGuildState } = require("../core/storage");

async function ensureQuarantineRoleForGuild(guild, client) {
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

  return role || null;
}

async function applyQuarantineToMember({ guild, client, member, reason }) {
  const cfg = client.security.config;

  const me = await guild.members.fetchMe().catch(() => null);
  if (!me) return "FAIL";
  if (member.roles.highest.position >= me.roles.highest.position) return "HIERARCHY";

  const qRole = await ensureQuarantineRoleForGuild(guild, client);
  if (!qRole) return "FAIL";

  setGuildState(guild.id, (gs) => {
    gs.quarantineRoles ??= {};
    if (!gs.quarantineRoles[member.id]) {
      gs.quarantineRoles[member.id] = member.roles.cache
        .filter(r => r.id !== guild.id)
        .map(r => r.id);
    }
  });

  if (cfg.quarantine.removeAllRoles) {
    const keep = new Set([qRole.id, guild.id]);
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

  const qRole =
    (cfg.quarantine.roleId && guild.roles.cache.get(cfg.quarantine.roleId)) ||
    guild.roles.cache.find(r => r.name === cfg.quarantine.roleName);

  if (!qRole) return "FAIL";

  const me = await guild.members.fetchMe().catch(() => null);
  if (!me || member.roles.highest.position >= me.roles.highest.position) {
    return "HIERARCHY";
  }

  if (!member.roles.cache.has(qRole.id)) return "OK";

  await member.roles.remove(qRole, reason || "Unquarantine").catch(() => null);

  const gs = getGuildState(guild.id);
  const saved = gs.quarantineRoles?.[member.id] || [];

  for (const roleId of saved) {
    const role = guild.roles.cache.get(roleId);
    if (!role) continue;
    if (role.position >= me.roles.highest.position) continue;

    await member.roles.add(role, reason || "Restore roles after quarantine")
      .catch(() => null);
  }

  setGuildState(guild.id, (gs) => {
    if (gs.quarantineRoles) {
      delete gs.quarantineRoles[member.id];
    }
  });

  return "OK";
}

module.exports = {
  ensureQuarantineRoleForGuild,
  applyQuarantineToMember,
  removeQuarantineFromMember
};