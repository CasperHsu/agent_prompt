import { db, signingOtps } from "@/lib/db";
import { generateNumericCode, sha256 } from "@/lib/crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

export async function issueOtp(
  contractId: string,
  channel: "email" | "sms",
  target: string
): Promise<{ code: string; expiresAt: Date }> {
  const code = generateNumericCode(6);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);

  await db.insert(signingOtps).values({
    contractId,
    channel,
    target,
    codeHash: sha256(`${code}:${target}`),
    expiresAt,
  });

  return { code, expiresAt };
}

export async function verifyOtp(
  contractId: string,
  target: string,
  code: string
): Promise<
  | { ok: true }
  | { ok: false; reason: "expired" | "invalid" | "max_attempts" | "not_found" }
> {
  const rows = await db
    .select()
    .from(signingOtps)
    .where(
      and(
        eq(signingOtps.contractId, contractId),
        eq(signingOtps.target, target),
        isNull(signingOtps.verifiedAt),
        gt(signingOtps.expiresAt, new Date())
      )
    )
    .orderBy(desc(signingOtps.createdAt))
    .limit(1);

  const otp = rows[0];
  if (!otp) return { ok: false, reason: "not_found" };
  if (otp.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "max_attempts" };
  if (otp.expiresAt.getTime() < Date.now())
    return { ok: false, reason: "expired" };

  const expected = sha256(`${code}:${target}`);
  if (expected !== otp.codeHash) {
    await db
      .update(signingOtps)
      .set({ attempts: otp.attempts + 1 })
      .where(eq(signingOtps.id, otp.id));
    return { ok: false, reason: "invalid" };
  }

  await db
    .update(signingOtps)
    .set({ verifiedAt: new Date() })
    .where(eq(signingOtps.id, otp.id));

  return { ok: true };
}
