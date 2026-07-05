import { NextResponse } from "next/server";
import type { CardSearchCandidate, CardSearchPrint } from "@/lib/card-search";
import { includesNormalizedSearch, normalizeCardSearchText } from "@/lib/card-search";
import { findFallbackEnglishName } from "@/lib/fallback-name-map";
import { prisma } from "@/lib/prisma";
import { getYgoProDeckImageUrls, searchYgoProDeckAllCards, searchYgoProDeckCards, toProxiedCardImageUrl } from "@/lib/ygoprodeck";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ candidates: [] });
  }

  const [localCandidates, mappedNames] = await Promise.all([searchLocalCards(query), findMappedEnglishNames(query)]);
  const remoteTerms = uniqueSearchTerms([query, ...mappedNames]);
  const remoteCandidates = await searchYgoProDeck(remoteTerms);

  return NextResponse.json({
    candidates: mergeCandidates([...localCandidates, ...remoteCandidates]).slice(0, 30),
  });
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

async function findMappedEnglishNames(query: string) {
  const maps = await prisma.nameMap.findMany({ take: 500 });
  const exactFallback = findFallbackEnglishName(query);

  return [
    exactFallback,
    ...maps
      .filter(
        (map) =>
          includesNormalizedSearch(map.japaneseName, query) ||
          includesNormalizedSearch(map.kana, query) ||
          includesNormalizedSearch(map.alias, query) ||
          includesNormalizedSearch(map.cardNumber, query),
      )
      .map((map) => map.englishName),
  ].filter((name): name is string => Boolean(name));
}

async function searchYgoProDeck(terms: string[]): Promise<CardSearchCandidate[]> {
  const candidates: CardSearchCandidate[] = [];

  for (const term of terms.slice(0, 3)) {
    try {
      const directCards = await searchYgoProDeckCards(term);
      const allCards = directCards.length >= 12 ? [] : await searchYgoProDeckAllCards(term, 18);

      for (const card of [...directCards, ...allCards].slice(0, 20)) {
        candidates.push(toCandidate(card));
      }
    } catch {
      continue;
    }
  }

  return candidates;
}

function toCandidate(card: Awaited<ReturnType<typeof searchYgoProDeckCards>>[number]): CardSearchCandidate {
  const imageUrls = uniqueSearchTerms(getYgoProDeckImageUrls(card).map(toProxiedCardImageUrl));

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
    japaneseName: card.name,
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
