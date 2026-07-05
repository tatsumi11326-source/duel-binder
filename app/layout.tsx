import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Duel Binder",
  description: "遊戯王カードのコレクション管理アプリ",
};

const navItems = [
  { href: "/", label: "ホーム", icon: "H" },
  { href: "/collection", label: "コレクション", icon: "C" },
  { href: "/binders", label: "バインダー", icon: "B" },
  { href: "/search", label: "検索", icon: "S" },
  { href: "/settings", label: "設定", icon: "G" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <div className="min-h-screen bg-[#0f1010] text-stone-100">
          <div className="mx-auto min-h-screen w-full max-w-[560px] bg-[#0f1010] pb-24">
            <main className="px-4 py-4">{children}</main>
          </div>
          <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#2f302e] bg-[#181918]/95 backdrop-blur">
            <div className="mx-auto grid h-16 max-w-[560px] grid-cols-5 px-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11px] font-medium text-zinc-500 transition hover:text-amber-300"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded text-xs font-bold text-current">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </body>
    </html>
  );
}
