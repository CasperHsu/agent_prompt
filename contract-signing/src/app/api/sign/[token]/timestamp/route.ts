import { db, contracts } from "@/lib/db";
import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/sign/[token]/timestamp">
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
  if (!contract.tsaTokenBase64) {
    return NextResponse.json(
      { error: "No timestamp token available for this contract" },
      { status: 409 }
    );
  }

  const tokenBytes = Buffer.from(contract.tsaTokenBase64, "base64");

  const provider = contract.tsaProvider ?? "unknown";
  const isStub = provider === "dev-stub";

  return new NextResponse(new Uint8Array(tokenBytes), {
    status: 200,
    headers: {
      "Content-Type": isStub
        ? "application/json"
        : "application/timestamp-reply",
      "Content-Disposition": `attachment; filename="contract-${contract.id}.tsr"`,
      "Cache-Control": "private, no-store",
      "X-TSA-Provider": provider,
    },
  });
}
