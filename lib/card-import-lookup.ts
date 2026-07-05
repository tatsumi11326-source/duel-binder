import { includesNormalizedSearch, normalizeCardSearchText } from "@/lib/card-search";
import { findFallbackEnglishName } from "@/lib/fallback-name-map";
import { prisma } from "@/lib/prisma";
import { getYgoProDeckImageUrls, searchYgoProDeckAllCards, searchYgoProDeckCards, toProxiedCardImageUrl } from "@/lib/ygoprodeck";

type ImportCardCandidate = {
  atk: number | null;
  attribute: string | null;
  cardType: string | null;
  def: number | null;
  description: string | null;
  englishName: string | null;
  imageUrl: string | null;
  level: number | null;
  packName: string | null;
  race: string | null;
};

export async function findImportCardCandidate(cardName: string, englishName?: string | null): Promise<ImportCardCandidate | null> {
  const localCandidate = await findLocalCandidate(cardName, englishName);
  if (localCandidate?.imageUrl) return localCandidate;

  const remoteCandidate = await findRemoteCandidate(cardName, englishName);
  return remoteCandidate ?? localCandidate;
}

async function findLocalCandidate(cardName: string, englishName?: string | null): Promise<ImportCardCandidate | null> {
  const cards = await prisma.card.findMany({
    include: { prints: { orderBy: { updatedAt: "desc" }, take: 5 } },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  const card = cards.find(
    (item) =>
      normalizeCardSearchText(item.japaneseName) === normalizeCardSearchText(cardName) ||
      normalizeCardSearchText(item.englishName ?? "") === normalizeCardSearchText(englishName ?? cardName) ||
      includesNormalizedSearch(item.japaneseName, cardName) ||
      includesNormalizedSearch(item.englishName, englishName ?? cardName),
  );

  if (!card) return null;
  const printImageUrl = card.prints.map((print) => print.imageUrl).find(Boolean) ?? null;

  return {
    atk: card.atk,
    attribute: card.attribute,
    cardType: card.cardType,
    def: card.def,
    description: card.description,
    englishName: card.englishName,
    imageUrl: card.imageUrl ?? printImageUrl,
    level: card.level,
    packName: card.packName,
    race: card.race,
  };
}

async function findRemoteCandidate(cardName: string, englishName?: string | null): Promise<ImportCardCandidate | null> {
  const terms = await buildRemoteTerms(cardName, englishName);

  for (const term of terms.slice(0, 3)) {
    try {
      const directCards = await searchYgoProDeckCards(term);
      const card = directCards[0] ?? (await searchYgoProDeckAllCards(term, 1))[0];
      if (!card) continue;

      const imageUrl = toProxiedCardImageUrl(getYgoProDeckImageUrls(card)[0]);

      return {
        atk: card.atk ?? null,
        attribute: card.attribute ?? null,
        cardType: card.type ?? null,
        def: card.def ?? null,
        description: card.desc ?? null,
        englishName: card.name,
        imageUrl,
        level: card.level ?? null,
        packName: card.card_sets?.[0]?.set_name ?? null,
        race: card.race ?? null,
      };
    } catch {
      continue;
    }
  }

  return null;
}

async function buildRemoteTerms(cardName: string, englishName?: string | null) {
  const normalizedCardName = normalizeCardSearchText(cardName);
  const mappedNames = await prisma.nameMap.findMany({
    where: {
      OR: [
        { searchText: { contains: normalizedCardName } },
        { japaneseName: { contains: cardName } },
        ...(englishName ? [{ englishName: { contains: englishName } }] : []),
      ],
    },
    take: 30,
  });
  const fallback = findFallbackEnglishName(cardName);

  return [
    englishName,
    fallback,
    ...mappedNames
      .filter(
        (map) =>
          includesNormalizedSearch(map.japaneseName, cardName) ||
          includesNormalizedSearch(map.kana, cardName) ||
          includesNormalizedSearch(map.alias, cardName),
      )
      .map((map) => map.englishName),
    cardName,
  ].filter((term, index, terms): term is string => Boolean(term?.trim()) && terms.indexOf(term) === index);
}
