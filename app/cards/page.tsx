import Link from "next/link";
import { Prisma } from "@prisma/client";
import { deleteCard } from "@/app/actions";
import { EmptyState, PageHeader, secondaryButtonClass } from "@/components/ui";
import { SearchBox } from "@/components/search-box";
import { prisma } from "@/lib/prisma";

export default async function CardsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const cards = await prisma.card.findMany({
    where: buildCardWhere(q),
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <PageHeader title="カードマスタ" action={{ href: "/cards/new", label: "追加" }} />
      <SearchBox action="/cards" placeholder="カード名・型番・パック名で検索" defaultValue={q} />

      {cards.length === 0 ? (
        <EmptyState message="カードマスタがありません。" />
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <article key={card.id} className="rounded-lg border border-[#2f302e] bg-[#171818] p-3">
              <div className="flex gap-3">
                <Link href={`/cards/${card.id}`} className="h-24 w-[68px] shrink-0 overflow-hidden rounded-md border border-[#30312f] bg-[#202120]">
                  {card.imageUrl ? (
                    <img src={card.imageUrl} alt={card.japaneseName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center px-2 text-center text-xs text-zinc-500">No IMG</div>
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/cards/${card.id}`} className="block truncate font-bold text-white">
                    {card.japaneseName}
                  </Link>
                  <p className="mt-1 truncate text-xs text-zinc-500">{card.englishName ?? ""}</p>
                  <p className="mt-2 text-xs text-zinc-400">
                    {card.cardNumber ?? "-"} / {card.rarity ?? "-"}
                  </p>
                  <p className="mt-1 truncate text-xs text-zinc-500">{card.packName ?? card.cardType ?? ""}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Link href={`/cards/${card.id}/edit`} className={secondaryButtonClass}>
                  編集
                </Link>
                <form action={deleteCard.bind(null, card.id)}>
                  <button className={secondaryButtonClass} type="submit">
                    削除
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function buildCardWhere(q?: string): Prisma.CardWhereInput {
  if (!q?.trim()) return {};
  const keyword = q.trim();
  return {
    OR: [
      { japaneseName: { contains: keyword } },
      { englishName: { contains: keyword } },
      { cardNumber: { contains: keyword } },
      { packName: { contains: keyword } },
      { rarity: { contains: keyword } },
      { cardType: { contains: keyword } },
    ],
  };
}
