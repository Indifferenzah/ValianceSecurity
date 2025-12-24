const { setGuildState } = require("./storage");

async function snapshotGuild(guild) {
  const snapshot = {
    t: Date.now(),
    roles: [],
    channels: []
  };

  guild.roles.cache.forEach(role => {
    snapshot.roles.push({
      id: role.id,
      name: role.name,
      color: role.color,
      hoist: role.hoist,
      mentionable: role.mentionable,
      permissions: role.permissions.bitfield.toString(),
      position: role.rawPosition
    });
  });

  guild.channels.cache.forEach(ch => {
    snapshot.channels.push({
      id: ch.id,
      name: ch.name,
      type: ch.type,
      parentId: ch.parentId,
      position: ch.rawPosition,
      topic: ch.topic,
      nsfw: ch.nsfw,
      rateLimitPerUser: ch.rateLimitPerUser,
      overwrites: ch.permissionOverwrites.cache.map(o => ({
        id: o.id,
        type: o.type,
        allow: o.allow.bitfield.toString(),
        deny: o.deny.bitfield.toString()
      }))
    });
  });

  setGuildState(guild.id, gs => {
    gs.snapshots = gs.snapshots || [];
    gs.snapshots.unshift(snapshot);
    gs.snapshots = gs.snapshots.slice(0, 5);
  });

  return snapshot;
}

module.exports = { snapshotGuild };
