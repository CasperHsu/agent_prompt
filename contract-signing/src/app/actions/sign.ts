"use server";

import { db, contracts } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { issueOtp, verifyOtp } from "@/lib/otp";
import { appendAudit } from "@/lib/audit";
import { getRequestContext } from "@/lib/request-context";
import { sha256 } from "@/lib/crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";

const STORAGE_PATH = process.env.STORAGE_LOCAL_PATH ?? "./storage";

async function loadContractByToken(token: string) {
  const rows = await db
    .select()
    .from(contracts)
    .where(eq(contracts.signingToken, token))
    .limit(1);
  return rows[0] ?? null;
}

export async function requestOtp(token: string, channel: "email" | "sms") {
  const contract = await loadContractByToken(token);
  if (!contract) throw new Error("Contract not found");
  if (contract.status === "voided" || contract.status === "expired") {
    throw new Error("此合約已失效");
  }
  if (contract.expiresAt.getTime() < Date.now()) {
    await db
      .update(contracts)
      .set({ status: "expired" })
      .where(eq(contracts.id, contract.id));
    throw new Error("此合約簽署連結已過期");
  }

  const target =
    channel === "email" ? contract.signerEmail : contract.signerPhone;
  if (!target) {
    throw new Error(channel === "email" ? "未設定 email" : "未設定手機");
  }

  const { code, expiresAt } = await issueOtp(contract.id, channel, target);

  const ctx = await getRequestContext();
  await appendAudit(contract.id, "otp.requested", {
    actor: "signer",
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    data: { channel, targetMasked: maskTarget(target, channel) },
  });

  if (channel === "email") {
    await sendEmailOtp(target, code, contract.title);
  } else {
    await sendSmsOtp(target, code);
  }

  await appendAudit(contract.id, "otp.sent", {
    actor: "system",
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    data: { channel },
  });

  return { sent: true, expiresAt };
}

const VerifyOtpSchema = z.object({
  token: z.string(),
  channel: z.enum(["email", "sms"]),
  code: z.string().min(4).max(8),
});

export async function submitOtp(input: z.input<typeof VerifyOtpSchema>) {
  const { token, channel, code } = VerifyOtpSchema.parse(input);
  const contract = await loadContractByToken(token);
  if (!contract) throw new Error("Contract not found");

  const target =
    channel === "email" ? contract.signerEmail : contract.signerPhone;
  if (!target) throw new Error("無此驗證管道");

  const result = await verifyOtp(contract.id, target, code);
  const ctx = await getRequestContext();

  if (!result.ok) {
    await appendAudit(contract.id, "otp.failed", {
      actor: "signer",
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      data: { channel, reason: result.reason },
    });
    return { ok: false as const, reason: result.reason };
  }

  await appendAudit(contract.id, "otp.verified", {
    actor: "signer",
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    data: { channel },
  });

  return { ok: true as const };
}

const SubmitSignatureSchema = z.object({
  token: z.string(),
  signatureDataUrl: z.string().startsWith("data:image/"),
  consentAcknowledged: z.literal(true),
});

export async function submitSignature(
  input: z.input<typeof SubmitSignatureSchema>
) {
  const { token, signatureDataUrl } = SubmitSignatureSchema.parse(input);

  const contract = await loadContractByToken(token);
  if (!contract) throw new Error("Contract not found");
  if (contract.status === "signed") {
    return { ok: true as const, alreadySigned: true };
  }

  const ctx = await getRequestContext();

  await appendAudit(contract.id, "consent.given", {
    actor: "signer",
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    data: { contentHash: contract.contentHash },
  });

  const sigBuffer = dataUrlToBuffer(signatureDataUrl);
  const sigDir = path.join(STORAGE_PATH, "signatures");
  await fs.mkdir(sigDir, { recursive: true });
  const sigPath = path.join(sigDir, `${contract.id}.png`);
  await fs.writeFile(sigPath, sigBuffer);

  const sigHash = sha256(sigBuffer);
  const signedAt = new Date();

  const sealHash = sha256(
    JSON.stringify({
      contractId: contract.id,
      contentHash: contract.contentHash,
      signatureHash: sigHash,
      signedAt: signedAt.toISOString(),
      signerName: contract.signerName,
      signerEmail: contract.signerEmail,
    })
  );

  await appendAudit(contract.id, "signature.captured", {
    actor: "signer",
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    data: { signatureHash: sigHash },
  });

  await db
    .update(contracts)
    .set({
      status: "signed",
      signedAt,
      signatureImagePath: sigPath,
      signedPdfHash: sealHash,
      updatedAt: new Date(),
    })
    .where(eq(contracts.id, contract.id));

  await appendAudit(contract.id, "contract.signed", {
    actor: "signer",
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    data: { sealHash, contentHash: contract.contentHash },
  });

  if (contract.requireTsa) {
    await appendAudit(contract.id, "tsa.requested", {
      actor: "system",
      data: { note: "TWCA TSA integration pending in Phase 2" },
    });
  }

  revalidatePath(`/sign/${token}`);

  return { ok: true as const, sealHash };
}

export async function recordView(token: string) {
  const contract = await loadContractByToken(token);
  if (!contract) return;

  const ctx = await getRequestContext();
  await appendAudit(contract.id, "link.opened", {
    actor: "signer",
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  if (contract.status === "sent") {
    await db
      .update(contracts)
      .set({ status: "viewed", viewedAt: new Date() })
      .where(and(eq(contracts.id, contract.id), eq(contracts.status, "sent")));
  }
}

function maskTarget(target: string, channel: "email" | "sms"): string {
  if (channel === "email") {
    const [local, domain] = target.split("@");
    if (!domain) return "***";
    const visible = local.slice(0, 2);
    return `${visible}***@${domain}`;
  }
  if (target.length <= 4) return "***";
  return `${target.slice(0, 3)}****${target.slice(-3)}`;
}

function dataUrlToBuffer(dataUrl: string): Buffer {
  const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
  if (!match) throw new Error("Invalid data URL");
  return Buffer.from(match[1], "base64");
}

async function sendEmailOtp(to: string, code: string, contractTitle: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn(
      `[DEV] Email OTP for ${to} (contract: ${contractTitle}): ${code}`
    );
    return;
  }
  console.warn(
    `[TODO] Resend integration not implemented yet. Would send OTP ${code} to ${to}`
  );
}

async function sendSmsOtp(to: string, code: string) {
  if (!process.env.SMS_API_KEY) {
    console.warn(`[DEV] SMS OTP for ${to}: ${code}`);
    return;
  }
  console.warn(
    `[TODO] SMS provider integration not implemented yet. Would send OTP ${code} to ${to}`
  );
}
