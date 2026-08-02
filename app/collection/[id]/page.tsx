import Link from "next/link";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { secondaryButtonClass } from "@/components/ui";
import { toCardThumbnailUrl } from "@/lib/card-image-url";
import { prisma } from "@/lib/prisma";

const getCachedOwnedCardDetail = unstable_cache(
  async (ownedCardId: number) =>
    prisma.ownedCard.findUnique({
      where: { id: ownedCardId },
      select: {
        id: true,
        cardNumber: true,
        condition: true,
        language: true,
        memo: true,
        ownershipStatus: true,
        photoUrl: true,
        purchaseDate: true,
        purchasePrice: true,
        purchaseShop: true,
        quantity: true,
        rarity: true,
        storage: true,
        card: {
          select: {
            atk: true,
            attribute: true,
            cardNumber: true,
            cardType: true,
            def: true,
            description: true,
            englishName: true,
            imageUrl: true,
            japaneseName: true,
            level: true,
            packName: true,
            race: true,
            rarity: true,
          },
        },
      },
    }),
  ["duel-binder-owned-card-detail-v1"],
  { revalidate: 60 * 60, tags: ["collection-data"] },
);

export default async function OwnedCardDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const ownedCardId = Number(id);
  if (!Number.isInteger(ownedCardId) || ownedCardId <= 0) notFound();

  const ownedCard = await getCachedOwnedCardDetail(ownedCardId);
  if (!ownedCard) notFound();

  const returnTo = safeReturnTo(query.returnTo);
  const detailHref = `/collection/${ownedCard.id}?returnTo=${encodeURIComponent(returnTo)}`;
  const editHref = `/collection/${ownedCard.id}/edit?returnTo=${encodeURIComponent(detailHref)}`;
  const imageUrl = toCardThumbnailUrl(ownedCard.photoUrl ?? ownedCard.card.imageUrl);
  const cardNumber = ownedCard.cardNumber ?? ownedCard.card.cardNumber;
  const rarity = ownedCard.rarity ?? ownedCard.card.rarity;
  const cardRows = [
    ["型番", cardNumber],
    ["レアリティ", rarity],
    ["状態", ownedCard.condition],
    ["所持状態", ownedCard.ownershipStatus === "UNOWNED" ? "未所持" : "所持済み"],
    ["所持枚数", `${ownedCard.quantity}枚`],
    ["言語", ownedCard.language],
    ["収録パック", ownedCard.card.packName],
    ["カード種別", ownedCard.card.cardType],
    ["属性", ownedCard.card.attribute],
    ["種族", ownedCard.card.race],
    ["レベル", ownedCard.card.level?.toString()],
    ["攻撃力", ownedCard.card.atk?.toString()],
    ["守備力", ownedCard.card.def?.toString()],
  ];
  const ownershipRows = [
    ["購入価格", ownedCard.purchasePrice == null ? null : `${ownedCard.purchasePrice.toLocaleString("ja-JP")}円`],
    ["購入日", ownedCard.purchaseDate ? ownedCard.purchaseDate.toLocaleDateString("ja-JP") : null],
    ["購入店", ownedCard.purchaseShop],
    ["保管場所", ownedCard.storage],
  ];

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={returnTo} className="text-sm font-semibold text-zinc-400 hover:text-white">
            ← バインダーへ戻る
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-white">{ownedCard.card.japaneseName}</h1>
          {ownedCard.card.englishName ? (
            <p className="mt-1 text-sm text-zinc-400">{ownedCard.card.englishName}</p>
          ) : null}
        </div>
        <Link href={editHref} className={secondaryButtonClass}>
          編集
        </Link>
      </header>

      <section className="grid gap-5 rounded-lg border border-[#30312f] bg-[#171818] p-4 sm:grid-cols-[180px_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-[180px] overflow-hidden rounded-lg border border-[#30312f] bg-[#202221] shadow-xl shadow-black/30">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={ownedCard.card.japaneseName}
              className="aspect-[3/4] w-full object-cover"
              decoding="async"
              fetchPriority="high"
            />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center text-sm text-zinc-500">No Image</div>
          )}
        </div>

        <div className="min-w-0 space-y-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            {cardRows.map(([label, value]) => (
              <div key={label} className="min-w-0 border-b border-[#30312f] pb-2">
                <dt className="text-xs font-semibold text-zinc-500">{label}</dt>
                <dd className="mt-1 truncate text-sm font-semibold text-zinc-100">{value ?? "-"}</dd>
              </div>
            ))}
          </dl>

          {ownedCard.card.description ? (
            <div>
              <h2 className="text-sm font-bold text-zinc-200">カードテキスト</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-400">{ownedCard.card.description}</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-[#30312f] bg-[#171818] p-4">
        <h2 className="text-sm font-bold text-white">購入・保管情報</h2>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
          {ownershipRows.map(([label, value]) => (
            <div key={label} className="border-b border-[#30312f] pb-2">
              <dt className="text-xs font-semibold text-zinc-500">{label}</dt>
              <dd className="mt-1 text-sm text-zinc-200">{value ?? "-"}</dd>
            </div>
          ))}
        </dl>
        {ownedCard.memo ? (
          <div className="mt-4">
            <h3 className="text-xs font-semibold text-zinc-500">メモ</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">{ownedCard.memo}</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function safeReturnTo(value?: string) {
  if (!value) return "/collection";
  if (!value.startsWith("/") || value.startsWith("//")) return "/collection";
  return value;
}
