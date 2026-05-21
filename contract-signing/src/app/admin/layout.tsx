import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="text-sm font-semibold">
            Vision Eco · Admin
          </Link>
          <nav className="flex gap-4 text-sm text-zinc-600">
            <Link href="/admin/contracts" className="hover:text-zinc-900">
              合約
            </Link>
            <Link href="/admin/templates" className="hover:text-zinc-900">
              範本
            </Link>
            <Link href="/admin/contracts/new" className="hover:text-zinc-900">
              建立合約
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
    </div>
  );
}
