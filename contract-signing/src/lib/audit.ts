import { db, signingAuditLogs, type NewSigningAuditLog } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { desc, eq } from "drizzle-orm";

export type AuditEvent =
  | "contract.created"
  | "contract.sent"
  | "contract.expired"
  | "contract.voided"
  | "link.opened"
  | "otp.requested"
  | "otp.sent"
  | "otp.verified"
  | "otp.failed"
  | "kyc.uploaded"
  | "kyc.verified"
  | "consent.given"
  | "signature.captured"
  | "contract.signed"
  | "pdf.sealed"
  | "tsa.requested"
  | "tsa.applied";

export type AuditContext = {
  ip?: string | null;
  userAgent?: string | null;
  actor?: "signer" | "admin" | "system";
  actorId?: string | null;
  data?: Record<string, unknown>;
};

export async function appendAudit(
  contractId: string,
  event: AuditEvent,
  ctx: AuditContext = {}
): Promise<void> {
  const previous = await db
    .select({ hash: signingAuditLogs.hash })
    .from(signingAuditLogs)
    .where(eq(signingAuditLogs.contractId, contractId))
    .orderBy(desc(signingAuditLogs.createdAt))
    .limit(1);

  const prevHash = previous[0]?.hash ?? null;

  const payload = {
    contractId,
    event,
    actor: ctx.actor ?? "system",
    actorId: ctx.actorId ?? null,
    ip: ctx.ip ?? null,
    userAgent: ctx.userAgent ?? null,
    data: ctx.data ?? null,
    prevHash,
    ts: new Date().toISOString(),
  };

  const hash = sha256(JSON.stringify(payload));

  const row: NewSigningAuditLog = {
    contractId,
    event,
    actor: payload.actor,
    actorId: payload.actorId,
    ip: payload.ip,
    userAgent: payload.userAgent,
    data: payload.data ?? undefined,
    prevHash,
    hash,
  };

  await db.insert(signingAuditLogs).values(row);
}

export async function getAuditTrail(contractId: string) {
  return db
    .select()
    .from(signingAuditLogs)
    .where(eq(signingAuditLogs.contractId, contractId))
    .orderBy(signingAuditLogs.createdAt);
}

export async function verifyAuditChain(contractId: string): Promise<{
  valid: boolean;
  brokenAt?: string;
}> {
  const trail = await getAuditTrail(contractId);
  let prevHash: string | null = null;

  for (const entry of trail) {
    const payload = {
      contractId: entry.contractId,
      event: entry.event,
      actor: entry.actor,
      actorId: entry.actorId,
      ip: entry.ip,
      userAgent: entry.userAgent,
      data: entry.data,
      prevHash,
      ts: entry.createdAt.toISOString(),
    };
    const recomputed = sha256(JSON.stringify(payload));
    if (recomputed !== entry.hash || entry.prevHash !== prevHash) {
      return { valid: false, brokenAt: entry.id };
    }
    prevHash = entry.hash;
  }

  return { valid: true };
}
