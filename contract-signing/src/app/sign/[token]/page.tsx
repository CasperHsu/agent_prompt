import { notFound } from "next/navigation";
import { db, contracts, contractTemplates } from "@/lib/db";
import { eq } from "drizzle-orm";
import { SignerFlow } from "./signer-flow";
import { recordView } from "@/app/actions/sign";

type Props = { params: Promise<{ token: string }> };

export default async function SignPage({ params }: Props) {
  const { token } = await params;

  const rows = await db
    .select({
      contract: contracts,
      template: contractTemplates,
    })
    .from(contracts)
    .innerJoin(contractTemplates, eq(contracts.templateId, contractTemplates.id))
    .where(eq(contracts.signingToken, token))
    .limit(1);

  const row = rows[0];
  if (!row) return notFound();

  await recordView(token);

  const { contract, template } = row;

  return (
    <SignerFlow
      token={token}
      contract={{
        id: contract.id,
        title: contract.title,
        renderedHtml: contract.renderedHtml ?? "",
        status: contract.status,
        signerName: contract.signerName,
        signerEmailMasked: maskEmail(contract.signerEmail),
        signerPhoneMasked: contract.signerPhone
          ? maskPhone(contract.signerPhone)
          : null,
        contentHash: contract.contentHash ?? "",
        sealHash: contract.signedPdfHash,
        verificationLevel: contract.verificationLevel,
        signedAt: contract.signedAt?.toISOString() ?? null,
        expiresAt: contract.expiresAt.toISOString(),
      }}
      template={{
        name: template.name,
        type: template.type,
      }}
    />
  );
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local.slice(0, 2)}***@${domain}`;
}

function maskPhone(phone: string) {
  if (phone.length <= 4) return "***";
  return `${phone.slice(0, 3)}****${phone.slice(-2)}`;
}
