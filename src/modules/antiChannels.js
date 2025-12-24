const { AuditLogEvent, ChannelType } = require("discord.js");
const { findAuditExecutor } = require("../core/audit");
const { handleSecurityEvent } = require("../core/sanction");
const { snapshotChannel, restoreLastDeletedChannel } = require("../core/restore");
const { applyQuarantineToChannel } = require("../core/quarantineChannels");

function registerAntiChannels(client) {
  client.on("channelCreate", async (channel) => {
    if (!channel.guild) return;
    await applyQuarantineToChannel(channel, client);
      
    const cfg = client.security.config;
    if (!cfg.modules?.antiChannelCreate?.enabled) return;
    if (!channel.guild) return;

    const entry = await findAuditExecutor(channel.guild, AuditLogEvent.ChannelCreate, cfg);
    if (!entry || !entry.executor) return;

    const executorUser = entry.executor;
    const executorMember = await channel.guild.members.fetch(executorUser.id).catch(() => null);

    if (cfg.restore?.enabled) await snapshotChannel(channel.guild, channel).catch(() => null);

    await handleSecurityEvent({
      client,
      guild: channel.guild,
      moduleKey: "antiChannelCreate",
      action: "ChannelCreate",
      executorUser,
      executorMember,
      targetUser: null,
      reason: entry.reason || cfg.punishments?.default?.reason,
      details: `channel=${channel.id} (${channel.name})`,
      restoreFn: cfg.modules.antiChannelCreate.restore ? async () => {
        await channel.delete("Security: revert unauthorized channel create").catch(() => null);
      } : null
    });
  });

  client.on("channelDelete", async (channel) => {
    const cfg = client.security.config;
    if (!cfg.modules?.antiChannelDelete?.enabled) return;
    if (!channel.guild) return;

    if (cfg.restore?.enabled && cfg.modules.antiChannelDelete.restore) {
      await snapshotChannel(channel.guild, channel).catch(() => null);
    }

    const entry = await findAuditExecutor(channel.guild, AuditLogEvent.ChannelDelete, cfg);
    if (!entry || !entry.executor) return;

    const executorUser = entry.executor;
    const executorMember = await channel.guild.members.fetch(executorUser.id).catch(() => null);

    await handleSecurityEvent({
      client,
      guild: channel.guild,
      moduleKey: "antiChannelDelete",
      action: "ChannelDelete",
      executorUser,
      executorMember,
      targetUser: null,
      reason: entry.reason || cfg.punishments?.default?.reason,
      details: `deletedChannel=${channel.id} (${channel.name})`,
      restoreFn: (cfg.restore?.enabled && cfg.modules.antiChannelDelete.restore)
        ? async () => { await restoreLastDeletedChannel(channel.guild).catch(() => null); }
        : null
    });
  });

  client.on("channelUpdate", async (oldCh, newCh) => {
    const cfg = client.security.config;
    if (!cfg.modules?.antiChannelUpdate?.enabled) return;
    if (!newCh.guild) return;

    const entry = await findAuditExecutor(newCh.guild, AuditLogEvent.ChannelUpdate, cfg);
    if (!entry || !entry.executor) return;

    const executorUser = entry.executor;
    const executorMember = await newCh.guild.members.fetch(executorUser.id).catch(() => null);

    await handleSecurityEvent({
      client,
      guild: newCh.guild,
      moduleKey: "antiChannelUpdate",
      action: "ChannelUpdate",
      executorUser,
      executorMember,
      targetUser: null,
      reason: entry.reason || cfg.punishments?.default?.reason,
      details: `channel=${newCh.id} name:${oldCh.name} -> ${newCh.name}`
    });
  });
}

module.exports = { registerAntiChannels };
