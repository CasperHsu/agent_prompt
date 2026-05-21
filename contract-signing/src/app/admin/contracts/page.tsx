import Link from "next/link";
import { db, contracts, contractTemplates } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ContractsListPage() {
  const rows = await db
    .select({
      id: contracts.id,
      title: contracts.title,
      status: contracts.status,
      signerName: contracts.signerName,
      signerEmail: contracts.signerEmail,
      verificationLevel: contracts.verificationLevel,
      createdAt: contracts.createdAt,
      signedAt: contracts.signedAt,
      signingToken: contracts.signingToken,
      templateName: contractTemplates.name,
      templateType: contractTemplates.type,
    })
    .from(contracts)
    .leftJoin(contractTemplates, eq(contracts.templateId, contractTemplates.id))
    .orderBy(desc(contracts.createdAt))
    .limit(50);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">合約列表</h1>
          <p className="text-sm text-zinc-500">最新 50 筆</p>
        </div>
        <Link href="/admin/contracts/new">
          <Button>建立新合約</Button>
        </Link>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>還沒有合約</CardTitle>
            <CardDescription>
              點選「建立新合約」開始第一份合約簽署。
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="p-3 text-left">標題</th>
                  <th className="p-3 text-left">簽署人</th>
                  <th className="p-3 text-left">類型</th>
                  <th className="p-3 text-left">驗證</th>
                  <th className="p-3 text-left">狀態</th>
                  <th className="p-3 text-left">建立</th>
                  <th className="p-3 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-100">
                    <td className="p-3 font-medium">{r.title}</td>
                    <td className="p-3">
                      <div>{r.signerName}</div>
                      <div className="text-xs text-zinc-500">{r.signerEmail}</div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">
                        {r.templateType === "contractor" ? "承攬" : "課程"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary">
                        {r.verificationLevel === "basic"
                          ? "基本"
                          : r.verificationLevel === "medium"
                          ? "中等"
                          : "強"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="p-3 text-xs text-zinc-500">
                      {r.createdAt.toLocaleString("zh-TW")}
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/sign/${r.signingToken}`}
                        className="text-xs text-zinc-700 underline"
                        target="_blank"
                      >
                        簽署連結
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" }> = {
    draft: { label: "草稿", variant: "secondary" },
    sent: { label: "已寄出", variant: "default" },
    viewed: { label: "已開啟", variant: "warning" },
    signed: { label: "已簽署", variant: "success" },
    expired: { label: "過期", variant: "destructive" },
    voided: { label: "作廢", variant: "destructive" },
  };
  const v = map[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={v.variant}>{v.label}</Badge>;
}
