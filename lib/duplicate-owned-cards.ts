import { Prisma } from "@prisma/client";
import { normalizeCardNumber } from "@/lib/card-number";
import { normalizeCardSearchText } from "@/lib/card-search";
import { prisma } from "@/lib/prisma";

export type DuplicateOwnedCardInput = {
  cardId?: number | null;
  cardNumber?: string | null;
  englishName?: string | null;
  excludeOwnedCardId?: number | null;
  japaneseName?: string | null;
  language?: string | null;
  rarity?: string | null;
};

export type DuplicateOwnedCardMatch = {
  cardNumber: string | null;
  condition: string;
  id: number;
  japaneseName: string;
  language: string;
  quantity: number;
  rarity: string | null;
  storage: string | null;
};

export async function findDuplicateOwnedCards(input: DuplicateOwnedCardInput): Promise<DuplicateOwnedCardMatch[]> {
  const normalizedCardNumber = normalizeCardNumber(input.cardNumber);
  const normalizedJapaneseName = normalizeCardSearchText(input.japaneseName ?? "");
  const normalizedEnglishName = normalizeCardSearchText(input.englishName ?? "");
  const rarity = input.rarity?.trim() || null;
  const language = input.language?.trim() || null;

  if (!input.cardId && !normalizedJapaneseName && !normalizedEnglishName && !normalizedCardNumber) return [];

  const orConditions: Prisma.OwnedCardWhereInput[] = [];
  if (input.cardId) orConditions.push({ cardId: input.cardId });
  if (normalizedCardNumber) orConditions.push({ cardNumber: normalizedCardNumber });
  if (input.japaneseName) orConditions.push({ card: { japaneseName: { contains: input.japaneseName } } });
  if (input.englishName) orConditions.push({ card: { englishName: { contains: input.englishName } } });

  const candidates = await prisma.ownedCard.findMany({
    where: {
      id: input.excludeOwnedCardId ? { not: input.excludeOwnedCardId } : undefined,
      OR: orConditions,
    },
    include: { card: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return candidates
    .filter((item) => {
      const sameCard =
        (input.cardId && item.cardId === input.cardId) ||
        (normalizedJapaneseName && normalizeCardSearchText(item.card.japaneseName) === normalizedJapaneseName) ||
        (normalizedEnglishName && normalizeCardSearchText(item.card.englishName ?? "") === normalizedEnglishName);

      const itemNumber = normalizeCardNumber(item.cardNumber ?? item.card.cardNumber);
      const sameNumber = normalizedCardNumber ? itemNumber === normalizedCardNumber : true;
      const sameRarity = rarity ? (item.rarity ?? item.card.rarity ?? "") === rarity : true;
      const sameLanguage = language ? item.language === language : true;

      return Boolean(sameCard && sameNumber && sameRarity && sameLanguage);
    })
    .slice(0, 5)
    .map((item) => ({
      cardNumber: item.cardNumber ?? item.card.cardNumber,
      condition: item.condition,
      id: item.id,
      japaneseName: item.card.japaneseName,
      language: item.language,
      quantity: item.quantity,
      rarity: item.rarity ?? item.card.rarity,
      storage: item.storage,
    }));
}
