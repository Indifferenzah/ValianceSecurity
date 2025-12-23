const { setGuildState, getGuildState } = require("./storage");

async function snapshotRole(guild, role) {
  const cfg = guild.client.security.config;
  if (!cfg.restore?.enabled || !cfg.restore.restoreRoles) return;

  setGuildState(guild.id, (gs) => {
    gs.snapshots = gs.snapshots || { channels: [], roles: [] };
    gs.snapshots.roles = gs.snapshots.roles || [];
    gs.snapshots.roles.unshift({
      t: Date.now(),
      kind: "role",
      name: role.name,
      color: role.color,
      hoist: role.hoist,
      mentionable: role.mentionable,
      permissions: role.permissions.bitfield.toString(),
      position: role.rawPosition ?? null
    });
    gs.snapshots.roles = gs.snapshots.roles.slice(0, cfg.restore.maxSnapshotsPerGuild || 50);
  });
}

async function restoreLastDeletedRole(guild) {
  const cfg = guild.client.security.config;
  if (!cfg.restore?.enabled || !cfg.restore.restoreRoles) return;

  const gs = getGuildState(guild.id);
  const snap = (gs.snapshots?.roles || []).find(s => s.kind === "role");
  if (!snap) return;

  const created = await guild.roles.create({
    name: snap.name,
    color: snap.color || undefined,
    hoist: !!snap.hoist,
    mentionable: !!snap.mentionable,
    permissions: BigInt(snap.permissions),
    reason: "Security: restore deleted role"
  }).catch(() => null);

  if (!created) return;

  setGuildState(guild.id, (st) => {
    st.snapshots.roles = (st.snapshots.roles || []).filter(s => s !== snap);
  });
}

module.exports = { snapshotRole, restoreLastDeletedRole };
