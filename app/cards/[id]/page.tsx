import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, secondaryButtonClass } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export default async function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await prisma.card.findUnique({
    where: { id: Number(id) },
    include: { ownedCards: { orderBy: { updatedAt: "desc" } } },
  });

  if (!card) notFound();

  const detailRows = [
    ["英語名", card.englishName],
    ["型番", card.cardNumber],
    ["パック名", card.packName],
    ["レアリティ", card.rarity],
    ["カード種別", card.cardType],
    ["属性", card.attribute],
    ["種族", card.race],
    ["レベル", card.level?.toString()],
    ["攻撃力", card.atk?.toString()],
    ["守備力", card.def?.toString()],
  ];

  return (
    <div>
      <PageHeader title={card.japaneseName} description="カードマスタ詳細と所持状況です。" />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          {card.imageUrl ? (
            <img src={card.imageUrl} alt={card.japaneseName} className="aspect-[3/4] w-full rounded-md object-cover" />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center rounded-md bg-slate-100 text-sm text-slate-500">
              画像なし
            </div>
          )}
        </div>
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <dl className="grid gap-4 md:grid-cols-2">
            {detailRows.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-semibold text-slate-500">{label}</dt>
                <dd className="mt-1 text-sm text-slate-950">{value ?? "-"}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6">
            <h2 className="text-sm font-bold text-slate-950">効果テキスト</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{card.description ?? "-"}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/collection/new?cardId=${card.id}`} className={secondaryButtonClass}>
              所持カードに登録
            </Link>
            <Link href={`/wishlist?cardName=${encodeURIComponent(card.japaneseName)}`} className={secondaryButtonClass}>
              欲しいカードに追加
            </Link>
            <Link href={`/cards/${card.id}/edit`} className={secondaryButtonClass}>
              編集
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
