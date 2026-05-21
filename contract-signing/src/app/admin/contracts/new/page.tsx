import { db, contractTemplates } from "@/lib/db";
import { eq, asc } from "drizzle-orm";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NewContractForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NewContractPage() {
  const templates = await db
    .select()
    .from(contractTemplates)
    .where(eq(contractTemplates.isActive, true))
    .orderBy(asc(contractTemplates.name));

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold">建立新合約</h1>
        <p className="text-sm text-zinc-500">
          選擇範本，填入合約變數與簽署人資訊，系統會產生獨一無二的簽署連結。
        </p>
      </header>

      {templates.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>還沒有可用範本</CardTitle>
            <CardDescription>
              請先執行 <code className="rounded bg-zinc-100 px-1.5 py-0.5">pnpm seed</code> 建立範本資料，或到範本管理頁面建立。
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <NewContractForm
          templates={templates.map((t) => ({
            id: t.id,
            name: t.name,
            type: t.type,
            verificationLevel: t.verificationLevel,
            requireTsa: t.requireTsa,
            requiredFields: (t.requiredFields ?? []) as Array<{
              key: string;
              label: string;
              type: "text" | "number" | "date" | "textarea";
              required: boolean;
              placeholder?: string;
            }>,
          }))}
        />
      )}
    </div>
  );
}
