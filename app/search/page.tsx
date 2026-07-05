import Link from "next/link";
import { EmptyState, PageHeader, secondaryButtonClass } from "@/components/ui";
import { SearchBox } from "@/components/search-box";
import type { CardSearchCandidate } from "@/lib/card-search";
import { searchCardCandidates } from "@/lib/card-search-service";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const keyword = q?.trim();
  const cards = keyword ? await searchCardCandidates(keyword) : [];

  return (
    <div className="space-y-4">
      <PageHeader title="検索" />
      <SearchBox action="/search" placeholder="カード名を入力して検索" defaultValue={q} />

      <div className="rounded-lg border border-[#2f302e] bg-[#171818] p-4 text-sm text-zinc-400">
        <p className="font-semibold text-zinc-300">検索例</p>
        <p className="mt-1">青眼の白龍、強欲な壺、Dark Magician、LB-01、レリーフ</p>
        <p className="mt-3 text-xs text-zinc-500">日本語名・英語名・型番・パック名・レアリティで検索できます。</p>
      </div>

      {!keyword ? null : cards.length === 0 ? (
        <EmptyState message="検索結果がありません。" />
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <SearchResultCard card={card} key={card.id} />
          ))}
        </div>
      )}
    </div>
  );
}

function SearchResultCard({ card }: { card: CardSearchCandidate }) {
  const primaryPrint = card.prints[0];
  const localCardId = card.source === "local" ? card.id.replace("local-", "") : null;

  return (
    <article className="rounded-lg border border-[#2f302e] bg-[#171818] p-3">
      <div className="flex gap-3">
        <div className="h-24 w-[68px] shrink-0 overflow-hidden rounded-md border border-[#30312f] bg-[#202120]">
          {card.imageUrl ? (
            <img src={card.imageUrl} alt={card.japaneseName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center px-2 text-center text-xs text-zinc-500">No IMG</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate font-bold text-white">{card.japaneseName}</h2>
              <p className="mt-1 truncate text-xs text-zinc-500">{card.englishName ?? ""}</p>
            </div>
            <span className="shrink-0 rounded bg-[#202221] px-2 py-1 text-[10px] font-bold text-zinc-400">
              {card.source === "local" ? "ローカル" : "YGOPRODeck"}
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            {primaryPrint?.cardNumber ?? "-"} / {primaryPrint?.rarity ?? "-"}
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">{card.description ?? ""}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {localCardId ? (
          <>
            <Link href={`/cards/${localCardId}`} className={secondaryButtonClass}>
              詳細
            </Link>
            <Link href={`/collection/new?cardId=${localCardId}`} className={secondaryButtonClass}>
              所持登録
            </Link>
          </>
        ) : (
          <Link href={`/collection/new?q=${encodeURIComponent(card.japaneseName)}`} className={secondaryButtonClass}>
            コレクションに追加
          </Link>
        )}
      </div>
    </article>
  );
}
