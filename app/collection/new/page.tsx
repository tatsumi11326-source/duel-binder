import { createOwnedCard } from "@/app/actions";
import { CardSearchImport } from "@/components/card-search-import";
import { OwnedCardForm } from "@/components/owned-card-form";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { getAppSettings } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";

export default async function NewOwnedCardPage({ searchParams }: { searchParams: Promise<{ cardId?: string }> }) {
  const { cardId } = await searchParams;
  const [cards, cardNumberSuggestions, settings] = await Promise.all([
    prisma.card.findMany({ orderBy: { japaneseName: "asc" } }),
    loadCardNumberSuggestions(),
    getAppSettings(),
  ]);
  const selectedCardId = cardId ? Number(cardId) : undefined;

  return (
    <div className="space-y-5">
      <PageHeader title="所持カード登録" description="カード名を検索して候補から追加できます。" />

      <CardSearchImport settings={settings} />

      <section className="space-y-3">
        <SectionTitle title="手動で登録" />
        {cards.length === 0 ? (
          <EmptyState message="手動登録するには、先にカードマスタを登録してください。" />
        ) : (
          <OwnedCardForm
            cards={cards}
            cardNumberSuggestions={cardNumberSuggestions}
            settings={settings}
            ownedCard={selectedCardId ? { cardId: selectedCardId } : undefined}
            action={createOwnedCard}
            submitLabel="登録する"
          />
        )}
      </section>
    </div>
  );
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
