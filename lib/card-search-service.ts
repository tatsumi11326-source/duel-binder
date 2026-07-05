import type { CardSearchCandidate, CardSearchPrint } from "@/lib/card-search";
import { includesNormalizedSearch, normalizeCardSearchText } from "@/lib/card-search";
import { findFallbackEnglishName } from "@/lib/fallback-name-map";
import { prisma } from "@/lib/prisma";
import {
  getYgoProDeckImageUrls,
  searchYgoProDeckAllCards,
  searchYgoProDeckCards,
  toProxiedCardImageUrl,
} from "@/lib/ygoprodeck";

type MappedName = {
  englishName: string;
  japaneseName: string;
  score: number;
};

export async function searchCardCandidates(query: string) {
  const keyword = query.trim();
  if (keyword.length < 2) return [];

  const [localCandidates, mappedNames] = await Promise.all([searchLocalCards(keyword), findMappedEnglishNames(keyword)]);
  const remoteTerms =
    mappedNames.length > 0 ? uniqueSearchTerms(mappedNames.map((map) => map.englishName)) : uniqueSearchTerms([keyword]);
  const remoteCandidates = await searchYgoProDeck(remoteTerms, mappedNames, mappedNames.length === 0);

  return mergeCandidates([...localCandidates, ...remoteCandidates]).slice(0, 30);
}

async function searchLocalCards(query: string): Promise<CardSearchCandidate[]> {
  const cards = await prisma.card.findMany({
    include: {
      prints: {
        orderBy: [{ language: "asc" }, { cardNumber: "asc" }],
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });

  return cards
    .filter(
      (card) =>
        includesNormalizedSearch(card.japaneseName, query) ||
        includesNormalizedSearch(card.englishName, query) ||
        includesNormalizedSearch(card.cardNumber, query) ||
        includesNormalizedSearch(card.packName, query) ||
        includesNormalizedSearch(card.rarity, query) ||
        card.prints.some(
          (print) =>
            includesNormalizedSearch(print.cardNumber, query) ||
            includesNormalizedSearch(print.packName, query) ||
            includesNormalizedSearch(print.rarity, query),
        ),
    )
    .slice(0, 20)
    .map((card) => {
      const prints = uniquePrints([
        ...card.prints.map((print) => ({
          cardNumber: print.cardNumber,
          packName: print.packName,
          rarity: print.rarity,
        })),
        {
          cardNumber: card.cardNumber,
          packName: card.packName,
          rarity: card.rarity,
        },
      ]);

      return {
        atk: card.atk,
        attribute: card.attribute,
        cardType: card.cardType,
        def: card.def,
        description: card.description,
        englishName: card.englishName,
        id: `local-${card.id}`,
        imageUrl: card.imageUrl,
        imageUrls: uniqueSearchTerms([card.imageUrl, ...card.prints.map((print) => print.imageUrl)]),
        japaneseName: card.japaneseName,
        level: card.level,
        prints,
        race: card.race,
        source: "local",
      };
    });
}

async function findMappedEnglishNames(query: string): Promise<MappedName[]> {
  const normalizedQuery = normalizeCardSearchText(query);
  const maps = await prisma.nameMap.findMany({
    where: {
      OR: [
        { searchText: { contains: normalizedQuery } },
        { japaneseName: { contains: query } },
        { englishName: { contains: query } },
        { kana: { contains: query } },
        { alias: { contains: query } },
        { cardNumber: { contains: query } },
      ],
    },
    take: 80,
  });
  const exactFallback = findFallbackEnglishName(query);
  const fallbackMap = exactFallback ? [{ englishName: exactFallback, japaneseName: query, score: 100 }] : [];

  return [
    ...fallbackMap,
    ...maps
      .map((map) => ({
        englishName: map.englishName,
        japaneseName: map.japaneseName,
        score: scoreNameMap(map, normalizedQuery),
      }))
      .filter((map) => map.score > 0)
      .sort((a, b) => b.score - a.score),
  ];
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
  normalizedQuery: string,
) {
  const values = [map.japaneseName, map.englishName, map.kana, map.alias, map.cardNumber].map((value) =>
    normalizeCardSearchText(value ?? ""),
  );

  if (values.some((value) => value === normalizedQuery)) return 100;
  if (values.some((value) => value.startsWith(normalizedQuery))) return 80;
  if (map.searchText?.startsWith(normalizedQuery)) return 70;
  if (values.some((value) => value.includes(normalizedQuery))) return 60;
  if (map.searchText?.includes(normalizedQuery)) return 50;
  return 0;
}

async function searchYgoProDeck(
  terms: string[],
  mappedNames: MappedName[],
  allowGlobalFallback: boolean,
): Promise<CardSearchCandidate[]> {
  const candidates: CardSearchCandidate[] = [];

  for (const term of terms.slice(0, 5)) {
    try {
      const directCards = await searchYgoProDeckCards(term);
      for (const card of directCards.slice(0, 20)) {
        candidates.push(toCandidate(card, mappedNames));
      }
    } catch {
      continue;
    }
  }

  if (candidates.length === 0 && allowGlobalFallback) {
    for (const term of terms.slice(0, 1)) {
      try {
        const allCards = await searchYgoProDeckAllCards(term, 18);
        for (const card of allCards) {
          candidates.push(toCandidate(card, mappedNames));
        }
      } catch {
        continue;
      }
    }
  }

  return candidates;
}

function toCandidate(card: Awaited<ReturnType<typeof searchYgoProDeckCards>>[number], mappedNames: MappedName[]): CardSearchCandidate {
  const imageUrls = uniqueSearchTerms(getYgoProDeckImageUrls(card).map(toProxiedCardImageUrl));
  const mappedJapaneseName = mappedNames.find(
    (map) => normalizeCardSearchText(map.englishName) === normalizeCardSearchText(card.name),
  )?.japaneseName;

  return {
    atk: card.atk ?? null,
    attribute: card.attribute ?? null,
    cardType: card.type ?? null,
    def: card.def ?? null,
    description: card.desc ?? null,
    englishName: card.name,
    id: `ygoprodeck-${card.id}`,
    imageUrl: imageUrls[0] ?? null,
    imageUrls,
    japaneseName: mappedJapaneseName ?? card.name,
    level: card.level ?? null,
    prints:
      card.card_sets?.map((set) => ({
        cardNumber: set.set_code ?? null,
        packName: set.set_name ?? null,
        rarity: set.set_rarity ?? null,
      })) ?? [],
    race: card.race ?? null,
    source: "ygoprodeck",
  };
}

function uniqueSearchTerms(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

function uniquePrints(prints: CardSearchPrint[]) {
  const seen = new Set<string>();
  return prints.filter((print) => {
    if (!print.cardNumber && !print.packName && !print.rarity) return false;
    const key = `${print.cardNumber ?? ""}|${print.packName ?? ""}|${print.rarity ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeCandidates(candidates: CardSearchCandidate[]) {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.englishName ?? candidate.japaneseName}-${candidate.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
