const { ChannelType, PermissionsBitField } = require("discord.js");
const { ensureQuarantineRoleForGuild } = require("./quarantine");

function canHaveOverwrites(channel) {
  if (!channel?.permissionOverwrites) return false;

  return ![
    ChannelType.GuildPublicThread,
    ChannelType.GuildPrivateThread,
    ChannelType.GuildNewsThread
  ].includes(channel.type);
}

function buildDenyPermissions(cfg) {
  const raw = cfg.quarantine?.denyPermissions;
  if (!raw || typeof raw !== "object") return null;

  const perms = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === false) perms[key] = false;
  }
  return Object.keys(perms).length ? perms : null;
}

async function applyQuarantineToChannel(channel, client) {
  if (!canHaveOverwrites(channel)) return;

  const cfg = client.security.config;
  if (!cfg.quarantine?.enabled) return;

  const deny = buildDenyPermissions(cfg);
  if (!deny) return;

  const role = await ensureQuarantineRoleForGuild(channel.guild, client);
  if (!role) return;

  await channel.permissionOverwrites.edit(
    role.id,
    deny,
    { reason: "Security: quarantine channel restrictions" }
  ).catch(() => null);
}

async function applyQuarantineToAllChannels(guild, client) {
  const cfg = client.security.config;
  if (!cfg.quarantine?.enabled) return;

  const deny = buildDenyPermissions(cfg);
  if (!deny) return;

  const role = await ensureQuarantineRoleForGuild(guild, client);
  if (!role) return;

  for (const channel of guild.channels.cache.values()) {
    if (!canHaveOverwrites(channel)) continue;

    await channel.permissionOverwrites.edit(
      role.id,
      deny,
      { reason: "Security: set quarantine on all channels" }
    ).catch(() => null);
  }
}

module.exports = {
  applyQuarantineToChannel,
  applyQuarantineToAllChannels
};
