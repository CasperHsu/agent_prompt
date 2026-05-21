import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCheck2, ShieldCheck, ScrollText } from "lucide-react";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-3xl space-y-10">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-zinc-500">
            Vision Eco · Contract Signing
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            線上合約簽署系統
          </h1>
          <p className="text-zinc-600 max-w-xl">
            符合台灣《電子簽章法》的線上承攬合約與課程合約簽署平台。
            提供分級身分驗證、完整稽核軌跡、文件指紋與時戳，
            做為未來爭議時的法律證據基礎。
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <FeatureCard
            icon={<ShieldCheck className="size-5" />}
            title="分級驗證"
            desc="承攬強驗證、課程基本驗證，依風險彈性調整"
          />
          <FeatureCard
            icon={<ScrollText className="size-5" />}
            title="稽核軌跡"
            desc="hash chain 保護，所有操作留存可舉證"
          />
          <FeatureCard
            icon={<FileCheck2 className="size-5" />}
            title="長期保存"
            desc="PDF 封存 + TWCA 時戳，符合 LTV 規範"
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">入口</h2>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              href="/admin/contracts"
              className="rounded-md border border-zinc-200 bg-white px-4 py-2 hover:bg-zinc-50"
            >
              管理員：合約列表 →
            </Link>
            <Link
              href="/admin/contracts/new"
              className="rounded-md border border-zinc-200 bg-white px-4 py-2 hover:bg-zinc-50"
            >
              管理員：建立新合約 →
            </Link>
          </div>
          <p className="text-xs text-zinc-500">
            簽署人請使用收到的專屬連結進入簽署頁面。
          </p>
        </section>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-zinc-900">
          {icon}
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription>{desc}</CardDescription>
      </CardContent>
    </Card>
  );
}
