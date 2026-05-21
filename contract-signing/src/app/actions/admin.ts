"use server";

import { db, contracts, contractTemplates, type TemplateField } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { randomToken } from "@/lib/crypto";
import { renderTemplate, markdownToHtml, hashContractContent } from "@/lib/render";
import { appendAudit } from "@/lib/audit";
import { getRequestContext } from "@/lib/request-context";
import { revalidatePath } from "next/cache";

const CreateContractSchema = z.object({
  templateId: z.string().uuid(),
  title: z.string().min(1).max(200),
  signerName: z.string().min(1).max(120),
  signerEmail: z.string().email(),
  signerPhone: z.string().min(8).max(20).optional().nullable(),
  variables: z.record(z.string(), z.union([z.string(), z.number()])),
  crmCustomerId: z.string().optional().nullable(),
  crmOrderId: z.string().optional().nullable(),
});

export type CreateContractInput = z.input<typeof CreateContractSchema>;

export async function createContract(input: CreateContractInput) {
  const parsed = CreateContractSchema.parse(input);

  const template = await db
    .select()
    .from(contractTemplates)
    .where(eq(contractTemplates.id, parsed.templateId))
    .limit(1);

  if (template.length === 0) throw new Error("Template not found");
  const t = template[0];
  if (!t.isActive) throw new Error("Template is not active");

  for (const field of (t.requiredFields as TemplateField[]) ?? []) {
    if (field.required && !parsed.variables[field.key]) {
      throw new Error(`Missing required field: ${field.label}`);
    }
  }

  const fullVariables = {
    ...parsed.variables,
    signerName: parsed.signerName,
    signerEmail: parsed.signerEmail,
    todayDate: new Date().toLocaleDateString("zh-TW"),
  };

  const rendered = renderTemplate(t.bodyMarkdown, fullVariables);
  const html = markdownToHtml(rendered);
  const contentHash = hashContractContent(html);

  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + t.expiryDays * 86_400_000);

  const [inserted] = await db
    .insert(contracts)
    .values({
      templateId: t.id,
      signingToken: token,
      status: "draft",
      title: parsed.title,
      variables: fullVariables,
      renderedHtml: html,
      contentHash,
      signerName: parsed.signerName,
      signerEmail: parsed.signerEmail,
      signerPhone: parsed.signerPhone ?? null,
      verificationLevel: t.verificationLevel,
      requireTsa: t.requireTsa,
      crmCustomerId: parsed.crmCustomerId ?? null,
      crmOrderId: parsed.crmOrderId ?? null,
      expiresAt,
    })
    .returning();

  const ctx = await getRequestContext();
  await appendAudit(inserted.id, "contract.created", {
    actor: "admin",
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    data: {
      templateId: t.id,
      templateName: t.name,
      contentHash,
      verificationLevel: t.verificationLevel,
    },
  });

  revalidatePath("/admin/contracts");

  return {
    id: inserted.id,
    signingToken: token,
    signingUrl: `${process.env.APP_URL ?? "http://localhost:3000"}/sign/${token}`,
    expiresAt: inserted.expiresAt,
  };
}

export async function sendContract(contractId: string) {
  const ctx = await getRequestContext();

  await db
    .update(contracts)
    .set({ status: "sent", sentAt: new Date() })
    .where(eq(contracts.id, contractId));

  await appendAudit(contractId, "contract.sent", {
    actor: "admin",
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  revalidatePath("/admin/contracts");
  revalidatePath(`/admin/contracts/${contractId}`);
}

export async function voidContract(contractId: string, reason?: string) {
  const ctx = await getRequestContext();

  await db
    .update(contracts)
    .set({ status: "voided" })
    .where(eq(contracts.id, contractId));

  await appendAudit(contractId, "contract.voided", {
    actor: "admin",
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    data: { reason: reason ?? null },
  });

  revalidatePath("/admin/contracts");
}
