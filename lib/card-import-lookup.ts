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

type YgoProDeckCard = Awaited<ReturnType<typeof searchYgoProDeckCards>>[number];

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

  const card =
    cards
      .filter(
        (item) =>
          normalizeCardSearchText(item.japaneseName) === normalizeCardSearchText(cardName) ||
          normalizeCardSearchText(item.englishName ?? "") === normalizeCardSearchText(englishName ?? cardName) ||
          includesNormalizedSearch(item.japaneseName, cardName) ||
          includesNormalizedSearch(item.englishName, englishName ?? cardName),
      )
      .sort((a, b) => scoreLocalCard(b, cardName, englishName) - scoreLocalCard(a, cardName, englishName))[0] ?? null;

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
      const allCards = directCards.length > 0 ? directCards : await searchYgoProDeckAllCards(term, 3);
      const card = allCards.sort((a, b) => scoreYgoCard(b, term) - scoreYgoCard(a, term))[0];
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
    take: 300,
  });
  const fallback = findFallbackEnglishName(cardName);
  const sortedMappedNames = mappedNames
    .map((map) => ({
      englishName: map.englishName,
      score: scoreNameMap(map, cardName, englishName),
    }))
    .filter((map) => map.score > 0)
    .sort((a, b) => b.score - a.score);

  return [
    englishName,
    fallback,
    ...sortedMappedNames.map((map) => map.englishName),
    cardName,
  ].filter((term, index, terms): term is string => Boolean(term?.trim()) && terms.indexOf(term) === index);
}

function scoreLocalCard(
  card: {
    cardNumber: string | null;
    englishName: string | null;
    japaneseName: string;
    packName: string | null;
    rarity: string | null;
  },
  cardName: string,
  englishName?: string | null,
) {
  return Math.max(
    scoreValues([card.japaneseName, card.englishName, card.cardNumber, card.packName, card.rarity], cardName),
    englishName ? scoreValues([card.englishName, card.japaneseName], englishName) : 0,
  );
}

function scoreNameMap(
  map: {
    japaneseName: string;
    englishName: string;
    kana: string | null;
    alias: string | null;
    cardNumber: string | null;
    searchText: string | null;
  },
  cardName: string,
  englishName?: string | null,
) {
  const score = Math.max(
    scoreValues([map.japaneseName, map.englishName, map.kana, map.alias, map.cardNumber], cardName),
    englishName ? scoreValues([map.englishName, map.japaneseName], englishName) : 0,
  );

  if (score > 0) return score;
  const normalizedCardName = normalizeCardSearchText(cardName);
  if (map.searchText?.startsWith(normalizedCardName)) return 70;
  if (map.searchText?.includes(normalizedCardName)) return 50;
  return 0;
}

function scoreYgoCard(card: YgoProDeckCard, term: string) {
  return scoreValues(
    [
      card.name,
      card.type ?? null,
      ...(card.card_sets?.flatMap((set) => [set.set_code ?? null, set.set_name ?? null, set.set_rarity ?? null]) ?? []),
    ],
    term,
  );
}

function scoreValues(values: Array<string | null | undefined>, query: string) {
  const normalizedQuery = normalizeCardSearchText(query);
  const normalizedValues = values.map((value) => normalizeCardSearchText(value ?? ""));

  if (normalizedValues.some((value) => value === normalizedQuery)) return 100;
  if (normalizedValues.some((value) => value.startsWith(normalizedQuery))) return 80;
  if (normalizedValues.some((value) => value.includes(normalizedQuery))) return 60;
  return 0;
}
