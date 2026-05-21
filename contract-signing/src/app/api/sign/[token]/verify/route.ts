import { db, contracts, contractTemplates } from "@/lib/db";
import { eq } from "drizzle-orm";
import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { verifyAuditChain } from "@/lib/audit";
import { parseTstInfoFromToken } from "@/lib/tsa/rfc3161";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/sign/[token]/verify">
) {
  const { token } = await ctx.params;

  const rows = await db
    .select({ contract: contracts, template: contractTemplates })
    .from(contracts)
    .innerJoin(
      contractTemplates,
      eq(contracts.templateId, contractTemplates.id)
    )
    .where(eq(contracts.signingToken, token))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { contract, template } = row;
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  checks.status = {
    ok: contract.status === "signed",
    detail: `status=${contract.status}`,
  };

  if (contract.signedPdfPath) {
    try {
      const bytes = await fs.readFile(contract.signedPdfPath);
      const hash = createHash("sha256").update(bytes).digest("hex");
      checks.pdfHash = {
        ok: hash === contract.signedPdfHash,
        detail: `expected=${contract.signedPdfHash} got=${hash}`,
      };
    } catch (e) {
      checks.pdfHash = { ok: false, detail: `read error: ${String(e)}` };
    }
  } else {
    checks.pdfHash = { ok: false, detail: "no PDF on file" };
  }

  const auditCheck = await verifyAuditChain(contract.id);
  checks.auditChain = {
    ok: auditCheck.valid,
    detail: auditCheck.valid ? "chain intact" : `broken at ${auditCheck.brokenAt}`,
  };

  let tsaInfo: {
    provider: string | null;
    genTime: string | null;
    serialNumber: string | null;
    hashesMatch: boolean | null;
  } = {
    provider: contract.tsaProvider,
    genTime: contract.tsaTimestampAt?.toISOString() ?? null,
    serialNumber: null,
    hashesMatch: null,
  };

  if (contract.tsaTokenBase64 && contract.tsaProvider !== "dev-stub") {
    const tokenBytes = Buffer.from(contract.tsaTokenBase64, "base64");
    const tstInfo = parseTstInfoFromToken(tokenBytes);
    if (tstInfo) {
      const expectedHash = contract.signedPdfHash;
      const actualHash = tstInfo.hashedMessage.toString("hex");
      tsaInfo = {
        provider: contract.tsaProvider,
        genTime: tstInfo.genTime.toISOString(),
        serialNumber: tstInfo.serialNumber,
        hashesMatch: expectedHash === actualHash,
      };
      checks.tsaHash = {
        ok: expectedHash === actualHash,
        detail: `expected=${expectedHash} got=${actualHash}`,
      };
    } else {
      checks.tsaHash = {
        ok: false,
        detail: "could not parse TSTInfo from token",
      };
    }
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json({
    valid: allOk,
    contract: {
      id: contract.id,
      title: contract.title,
      status: contract.status,
      templateName: template.name,
      templateType: template.type,
      verificationLevel: contract.verificationLevel,
      signerName: contract.signerName,
      signerEmail: contract.signerEmail,
      signedAt: contract.signedAt?.toISOString() ?? null,
      contentHash: contract.contentHash,
      signedPdfHash: contract.signedPdfHash,
    },
    tsa: tsaInfo,
    checks,
  });
}
