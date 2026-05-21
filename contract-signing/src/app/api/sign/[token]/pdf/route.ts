import { db, contracts } from "@/lib/db";
import { eq } from "drizzle-orm";
import { promises as fs } from "node:fs";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/sign/[token]/pdf">
) {
  const { token } = await ctx.params;

  const rows = await db
    .select()
    .from(contracts)
    .where(eq(contracts.signingToken, token))
    .limit(1);

  const contract = rows[0];
  if (!contract) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (contract.status !== "signed" || !contract.signedPdfPath) {
    return NextResponse.json(
      { error: "Contract not signed yet" },
      { status: 409 }
    );
  }

  let bytes: Buffer;
  try {
    bytes = await fs.readFile(contract.signedPdfPath);
  } catch {
    return NextResponse.json(
      { error: "PDF file missing on server" },
      { status: 410 }
    );
  }

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="contract-${contract.id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
