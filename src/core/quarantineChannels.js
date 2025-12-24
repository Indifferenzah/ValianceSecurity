const { ensureQuarantineRoleForGuild } = require("./quarantine");

/**
 * Applica i deny del ruolo quarantine su UN canale
 */
async function applyQuarantineToChannel(channel, client) {
  const cfg = client.security.config;
  if (!cfg.quarantine?.enabled) return;

  const role = await ensureQuarantineRoleForGuild(channel.guild, client);
  if (!role) return;

  await channel.permissionOverwrites.edit(
    role,
    cfg.quarantine.denyPermissions,
    { reason: "Security: quarantine channel restrictions" }
  ).catch(() => null);
}

/**
 * Applica i deny del ruolo quarantine su TUTTI i canali del server
 */
async function applyQuarantineToAllChannels(guild, client) {
  const cfg = client.security.config;
  if (!cfg.quarantine?.enabled) return;

  const role = await ensureQuarantineRoleForGuild(guild, client);
  if (!role) return;

  for (const channel of guild.channels.cache.values()) {
    await channel.permissionOverwrites.edit(
      role,
      cfg.quarantine.denyPermissions,
      { reason: "Security: set quarantine on all channels" }
    ).catch(() => null);
  }
}

module.exports = {
  applyQuarantineToChannel,
  applyQuarantineToAllChannels
};
