import Link from "next/link";
import { AppCard, EmptyState, SectionTitle, StatCard } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const [cardsCount, owned, wishlistCount, recentOwned] = await Promise.all([
    prisma.card.count(),
    prisma.ownedCard.findMany({ include: { card: true } }),
    prisma.wishlistItem.count({ where: { purchased: false } }),
    prisma.ownedCard.findMany({
      include: { card: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const ownedItems = owned.filter((item) => item.ownershipStatus !== "UNOWNED");
  const totalQuantity = ownedItems.reduce((sum, item) => sum + item.quantity, 0);
  const ownedUniqueCount = new Set(ownedItems.map((item) => item.cardId)).size;
  const collectionRate = cardsCount > 0 ? Math.round((ownedUniqueCount / cardsCount) * 100) : 0;

  return (
    <div className="space-y-5">
      <header className="pt-2">
        <h1 className="text-2xl font-bold tracking-normal text-white">Duel Binder</h1>
        <p className="mt-1 text-sm text-zinc-400">カードコレクション管理</p>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <StatCard label="総カード数" value={cardsCount} />
        <StatCard label="所持カード" value={totalQuantity} />
        <StatCard label="欲しいカード" value={wishlistCount} />
        <StatCard label="コレクション率" value={`${collectionRate}%`} />
      </section>

      <section className="grid grid-cols-3 gap-3">
        <QuickAction href="/collection" label="コレクション" icon="☷" />
        <QuickAction href="/binders" label="バインダー" icon="▣" />
        <QuickAction href="/collection/new" label="カードを追加" icon="＋" />
      </section>

      <section>
        <SectionTitle title="最近追加したカード" action={{ href: "/collection", label: "すべて表示" }} />
        {recentOwned.length === 0 ? (
          <EmptyState message="まだ所持カードが登録されていません。" />
        ) : (
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
            {recentOwned.map((item) => {
              const imageUrl = item.photoUrl ?? item.card.imageUrl;
              const isOwned = item.ownershipStatus !== "UNOWNED";
              return (
                <Link key={item.id} href={`/collection/${item.id}/edit`} className="w-24 shrink-0">
                  <div className="aspect-[3/4] overflow-hidden rounded-lg border border-[#2f302e] bg-[#202120]">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={item.card.japaneseName}
                        className={`h-full w-full object-cover ${isOwned ? "" : "grayscale opacity-55"}`}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-2 text-center text-xs text-zinc-500">
                        No Image
                      </div>
                    )}
                  </div>
                  <p className="mt-2 truncate text-xs font-semibold text-zinc-200">{item.card.japaneseName}</p>
                  <p className="truncate text-[11px] text-zinc-500">{item.cardNumber ?? item.card.cardNumber ?? "-"}</p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <AppCard className="p-4">
        <SectionTitle title="管理メニュー" />
        <div className="grid grid-cols-2 gap-2 text-sm">
          <MenuLink href="/cards" label="カードマスタ" />
          <MenuLink href="/wishlist" label="欲しいカード" />
        </div>
      </AppCard>
    </div>
  );
}

function QuickAction({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border border-[#2f302e] bg-[#171818] p-3 text-center text-sm font-bold text-zinc-100 shadow-lg shadow-black/20 hover:border-amber-400 hover:text-amber-300"
    >
      <span className="text-xl text-amber-400">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function MenuLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="rounded-md border border-[#30312f] bg-[#121312] px-3 py-2 text-zinc-300 hover:text-amber-300">
      {label}
    </Link>
  );
}
