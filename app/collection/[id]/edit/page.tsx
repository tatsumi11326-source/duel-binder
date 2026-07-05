import { notFound } from "next/navigation";
import { refreshOwnedCardImageFromYgoProDeck, updateOwnedCard } from "@/app/actions";
import { OwnedCardForm } from "@/components/owned-card-form";
import { PageHeader } from "@/components/ui";
import { getAppSettings } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";

export default async function EditOwnedCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ imageRefresh?: string; returnTo?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const returnTo = safeReturnTo(query.returnTo);
  const refreshReturnTo = `/collection/${id}/edit?returnTo=${encodeURIComponent(returnTo)}`;
  const [ownedCard, cards, cardNumberSuggestions, settings] = await Promise.all([
    prisma.ownedCard.findUnique({ where: { id: Number(id) }, include: { card: true } }),
    prisma.card.findMany({ orderBy: { japaneseName: "asc" } }),
    loadCardNumberSuggestions(),
    getAppSettings(),
  ]);

  if (!ownedCard) notFound();

  return (
    <div className="space-y-4">
      <PageHeader title="所持カード編集" description="所持カードの詳細を更新します。" />
      {query.imageRefresh === "updated" ? (
        <div className="rounded-md border border-emerald-900/70 bg-emerald-950/30 p-3 text-sm text-emerald-200">
          YGOPRODeckから画像を再取得しました。
        </div>
      ) : null}
      {query.imageRefresh === "not-found" ? (
        <div className="rounded-md border border-amber-900/70 bg-amber-950/30 p-3 text-sm text-amber-100">
          YGOPRODeckから画像を取得できませんでした。カード名または英語名を確認してください。
        </div>
      ) : null}
      <OwnedCardForm
        cards={cards}
        cardNumberSuggestions={cardNumberSuggestions}
        settings={settings}
        ownedCard={ownedCard}
        returnTo={returnTo}
        action={updateOwnedCard.bind(null, ownedCard.id)}
        refreshImageAction={refreshOwnedCardImageFromYgoProDeck.bind(null, ownedCard.id, refreshReturnTo)}
        submitLabel="更新する"
      />
    </div>
  );
}

function safeReturnTo(value?: string) {
  if (!value) return "/collection";
  if (!value.startsWith("/") || value.startsWith("//")) return "/collection";
  return value;
}

async function loadCardNumberSuggestions() {
  const [cards, prints, ownedCards] = await Promise.all([
    prisma.card.findMany({ where: { cardNumber: { not: null } }, select: { cardNumber: true }, take: 80 }),
    prisma.cardPrint.findMany({ select: { cardNumber: true }, orderBy: { updatedAt: "desc" }, take: 120 }),
    prisma.ownedCard.findMany({
      where: { cardNumber: { not: null } },
      select: { cardNumber: true },
      orderBy: { updatedAt: "desc" },
      take: 120,
    }),
  ]);

  return Array.from(
    new Set(
      [...ownedCards, ...prints, ...cards]
        .map((item) => item.cardNumber)
        .filter((value): value is string => Boolean(value)),
    ),
  );
}
