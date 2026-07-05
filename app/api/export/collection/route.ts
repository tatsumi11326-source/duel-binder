import { collectionCsvHeaders, csvResponse } from "@/lib/csv";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const ownedCards = await prisma.ownedCard.findMany({
    include: { card: true },
    orderBy: [{ updatedAt: "desc" }],
  });

  return csvResponse("duel-binder-collection.csv", [
    [...collectionCsvHeaders],
    ...ownedCards.map((item) => [
      item.card.japaneseName,
      item.card.englishName ?? "",
      item.cardNumber ?? item.card.cardNumber ?? "",
      item.card.packName ?? "",
      item.rarity ?? item.card.rarity ?? "",
      item.condition,
      String(item.quantity),
      item.ownershipStatus,
      item.language,
      item.purchasePrice == null ? "" : String(item.purchasePrice),
      item.purchaseDate ? item.purchaseDate.toISOString().slice(0, 10) : "",
      item.purchaseShop ?? "",
      item.storage ?? "",
      item.memo ?? "",
      item.photoUrl ?? item.card.imageUrl ?? "",
    ]),
  ]);
}
