import { AuditLog } from "../models/AuditLog.js";
export async function writeAudit({ userId, action, entityType, entityId, before = null, after = null, reason = "", requestId = "", session }) {
  const [entry] = await AuditLog.create([{
    userId: userId || null, action, entityType, entityId: entityId || null,
    before, after, reason, requestId
  }], session ? { session } : {});
  return entry;
}
