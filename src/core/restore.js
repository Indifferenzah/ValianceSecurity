const { setGuildState, getGuildState } = require("./storage");

async function snapshotChannel(guild, channel) {
  const cfg = guild.client.security.config;
  if (!cfg.restore?.enabled || !cfg.restore.restoreChannels) return;

  setGuildState(guild.id, (gs) => {
    gs.snapshots = gs.snapshots || { channels: [], roles: [] };
    gs.snapshots.channels = gs.snapshots.channels || [];
    gs.snapshots.channels.unshift({
      t: Date.now(),
      kind: "channel",
      id: channel.id,
      name: channel.name,
      type: channel.type,
      parentId: channel.parentId || null,
      position: channel.rawPosition ?? null,
      topic: channel.topic || null,
      nsfw: !!channel.nsfw,
      rateLimitPerUser: channel.rateLimitPerUser ?? 0
    });
    gs.snapshots.channels = gs.snapshots.channels.slice(0, cfg.restore.maxSnapshotsPerGuild || 50);
  });
}

async function restoreLastDeletedChannel(guild) {
  const cfg = guild.client.security.config;
  if (!cfg.restore?.enabled || !cfg.restore.restoreChannels) return;

  const gs = getGuildState(guild.id);
  const snap = (gs.snapshots?.channels || []).find(s => s.kind === "channel");
  if (!snap) return;

  const created = await guild.channels.create({
    name: snap.name,
    type: snap.type,
    parent: snap.parentId || undefined,
    topic: snap.topic || undefined,
    nsfw: snap.nsfw || false,
    rateLimitPerUser: snap.rateLimitPerUser || 0,
    reason: "Security: restore deleted channel"
  }).catch(() => null);

  if (!created) return;

  setGuildState(guild.id, (st) => {
    st.snapshots.channels = (st.snapshots.channels || []).filter(s => s !== snap);
  });
}

module.exports = { snapshotChannel, restoreLastDeletedChannel };
