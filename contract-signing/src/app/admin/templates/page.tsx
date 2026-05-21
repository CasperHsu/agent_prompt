import { db, contractTemplates } from "@/lib/db";
import { asc } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const rows = await db.select().from(contractTemplates).orderBy(asc(contractTemplates.name));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">合約範本</h1>
        <p className="text-sm text-zinc-500">
          目前範本由 seed 腳本維護。下一階段加入 UI 編輯功能。
        </p>
      </header>

      {rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>還沒有範本</CardTitle>
            <CardDescription>
              執行 <code className="rounded bg-zinc-100 px-1.5 py-0.5">pnpm seed</code> 建立內建範例。
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <Badge variant="outline">
                    {t.type === "contractor" ? "承攬" : "課程"}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {t.bodyMarkdown.split("\n").find((l) => l.trim()) ?? ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-zinc-600">
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary">
                    驗證：
                    {t.verificationLevel === "basic"
                      ? "基本"
                      : t.verificationLevel === "medium"
                      ? "中等"
                      : "強"}
                  </Badge>
                  {t.requireTsa && <Badge variant="success">TSA 時戳</Badge>}
                  <Badge variant="outline">效期 {t.expiryDays} 天</Badge>
                  {t.isActive ? (
                    <Badge variant="default">啟用</Badge>
                  ) : (
                    <Badge variant="destructive">停用</Badge>
                  )}
                </div>
                <div className="text-xs text-zinc-500">
                  變數：
                  {(t.requiredFields ?? []).map((f) => f.key).join("、") || "無"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
