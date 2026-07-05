import { notFound } from "next/navigation";
import { updateOwnedCard } from "@/app/actions";
import { OwnedCardForm } from "@/components/owned-card-form";
import { PageHeader } from "@/components/ui";
import { getAppSettings } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";

export default async function EditOwnedCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const returnTo = safeReturnTo(query.returnTo);
  const [ownedCard, cards, cardNumberSuggestions, settings] = await Promise.all([
    prisma.ownedCard.findUnique({ where: { id: Number(id) }, include: { card: true } }),
    prisma.card.findMany({ orderBy: { japaneseName: "asc" } }),
    loadCardNumberSuggestions(),
    getAppSettings(),
  ]);

  if (!ownedCard) notFound();

  return (
    <div>
      <PageHeader title="所持カード編集" description="所持カードの詳細を更新します。" />
      <OwnedCardForm
        cards={cards}
        cardNumberSuggestions={cardNumberSuggestions}
        settings={settings}
        ownedCard={ownedCard}
        returnTo={returnTo}
        action={updateOwnedCard.bind(null, ownedCard.id)}
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
