export async function writeAuditLog(
  db,
  { action, entityType, entityId, userId, metadata = {} }
) {
  return db.auditLog.create({
    data: {
      action,
      entityType,
      entityId,
      userId,
      metadata,
    },
  });
}