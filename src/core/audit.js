async function findAuditExecutor(guild, actionType, cfg) {
  const fetched = await guild.fetchAuditLogs({
    type: actionType,
    limit: cfg.safety.auditFetchLimit || 6
  }).catch(() => null);

  if (!fetched) return null;

  const now = Date.now();
  const maxAge = cfg.safety.auditMaxAgeMs || 9000;

  const entry = fetched.entries.find(e => (now - e.createdTimestamp) <= maxAge);
  if (!entry) return null;

  return entry;
}

module.exports = { findAuditExecutor };
