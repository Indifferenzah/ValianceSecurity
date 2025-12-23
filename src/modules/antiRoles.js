const { AuditLogEvent } = require("discord.js");
const { findAuditExecutor } = require("../core/audit");
const { handleSecurityEvent } = require("../core/sanction");
const { snapshotRole, restoreLastDeletedRole } = require("../core/restoreRole");

function registerAntiRoles(client) {
  client.on("roleCreate", async (role) => {
    const cfg = client.security.config;
    if (!cfg.modules?.antiRoleCreate?.enabled) return;

    const entry = await findAuditExecutor(role.guild, AuditLogEvent.RoleCreate, cfg);
    if (!entry || !entry.executor) return;

    const executorUser = entry.executor;
    const executorMember = await role.guild.members.fetch(executorUser.id).catch(() => null);

    if (cfg.restore?.enabled) await snapshotRole(role.guild, role).catch(() => null);

    await handleSecurityEvent({
      client,
      guild: role.guild,
      moduleKey: "antiRoleCreate",
      action: "RoleCreate",
      executorUser,
      executorMember,
      targetUser: null,
      reason: entry.reason || cfg.punishments?.default?.reason,
      details: `role=${role.id} (${role.name})`,
      restoreFn: cfg.modules.antiRoleCreate.restore ? async () => {
        await role.delete("Security: revert unauthorized role create").catch(() => null);
      } : null
    });
  });

  client.on("roleDelete", async (role) => {
    const cfg = client.security.config;
    if (!cfg.modules?.antiRoleDelete?.enabled) return;

    if (cfg.restore?.enabled && cfg.modules.antiRoleDelete.restore) {
      await snapshotRole(role.guild, role).catch(() => null);
    }

    const entry = await findAuditExecutor(role.guild, AuditLogEvent.RoleDelete, cfg);
    if (!entry || !entry.executor) return;

    const executorUser = entry.executor;
    const executorMember = await role.guild.members.fetch(executorUser.id).catch(() => null);

    await handleSecurityEvent({
      client,
      guild: role.guild,
      moduleKey: "antiRoleDelete",
      action: "RoleDelete",
      executorUser,
      executorMember,
      targetUser: null,
      reason: entry.reason || cfg.punishments?.default?.reason,
      details: `deletedRole=${role.id} (${role.name})`,
      restoreFn: (cfg.restore?.enabled && cfg.modules.antiRoleDelete.restore)
        ? async () => { await restoreLastDeletedRole(role.guild).catch(() => null); }
        : null
    });
  });

  client.on("roleUpdate", async (oldR, newR) => {
    const cfg = client.security.config;
    if (!cfg.modules?.antiRoleUpdate?.enabled) return;

    const entry = await findAuditExecutor(newR.guild, AuditLogEvent.RoleUpdate, cfg);
    if (!entry || !entry.executor) return;

    const executorUser = entry.executor;
    const executorMember = await newR.guild.members.fetch(executorUser.id).catch(() => null);

    await handleSecurityEvent({
      client,
      guild: newR.guild,
      moduleKey: "antiRoleUpdate",
      action: "RoleUpdate",
      executorUser,
      executorMember,
      targetUser: null,
      reason: entry.reason || cfg.punishments?.default?.reason,
      details: `role=${newR.id} name:${oldR.name} -> ${newR.name}`
    });
  });
}

module.exports = { registerAntiRoles };
