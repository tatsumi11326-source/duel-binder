import Link from "next/link";
import { EmptyState, PageHeader, secondaryButtonClass } from "@/components/ui";
import { SearchBox } from "@/components/search-box";
import { prisma } from "@/lib/prisma";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const keyword = q?.trim();

  const mappedNames = keyword
    ? await prisma.nameMap.findMany({
        where: {
          OR: [
            { japaneseName: { contains: keyword } },
            { englishName: { contains: keyword } },
            { kana: { contains: keyword } },
            { alias: { contains: keyword } },
            { cardNumber: { contains: keyword } },
          ],
        },
      })
    : [];

  const names = mappedNames.flatMap((item) => [item.japaneseName, item.englishName]);
  const searchWords = keyword ? [keyword, ...names] : [];

  const cards =
    searchWords.length > 0
      ? await prisma.card.findMany({
          where: {
            OR: searchWords.flatMap((word) => [
              { japaneseName: { contains: word } },
              { englishName: { contains: word } },
              { cardNumber: { contains: word } },
              { packName: { contains: word } },
              { rarity: { contains: word } },
              { cardType: { contains: word } },
            ]),
          },
          include: { ownedCards: true },
          orderBy: { updatedAt: "desc" },
        })
      : [];

  return (
    <div className="space-y-4">
      <PageHeader title="検索" />
      <SearchBox action="/search" placeholder="カード名を入力して検索" defaultValue={q} />

      <div className="rounded-lg border border-[#2f302e] bg-[#171818] p-4 text-sm text-zinc-400">
        <p className="font-semibold text-zinc-300">検索例</p>
        <p className="mt-1">青眼の白龍、増殖するG、Dark Magician、LB-01、レリーフ</p>
        <p className="mt-3 text-xs text-zinc-500">日本語・英語どちらでも検索できます。</p>
      </div>

      {!keyword ? null : cards.length === 0 ? (
        <EmptyState message="検索結果がありません。" />
      ) : (
        <div className="space-y-3">
          {cards.map((card) => {
            const ownedQuantity = card.ownedCards
              .filter((item) => item.ownershipStatus !== "UNOWNED")
              .reduce((sum, item) => sum + item.quantity, 0);
            return (
              <article key={card.id} className="rounded-lg border border-[#2f302e] bg-[#171818] p-3">
                <div className="flex gap-3">
                  <div className="h-24 w-[68px] shrink-0 overflow-hidden rounded-md border border-[#30312f] bg-[#202120]">
                    {card.imageUrl ? (
                      <img src={card.imageUrl} alt={card.japaneseName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center px-2 text-center text-xs text-zinc-500">
                        No IMG
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-bold text-white">{card.japaneseName}</h2>
                    <p className="mt-1 truncate text-xs text-zinc-500">{card.englishName ?? ""}</p>
                    <p className="mt-2 text-xs text-zinc-400">
                      {card.cardNumber ?? "-"} / {card.rarity ?? "-"}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-amber-400">
                      {ownedQuantity > 0 ? `所持済み: ${ownedQuantity}枚` : "未所持"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Link href={`/cards/${card.id}`} className={secondaryButtonClass}>
                    詳細
                  </Link>
                  <Link href={`/collection/new?cardId=${card.id}`} className={secondaryButtonClass}>
                    所持登録
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
