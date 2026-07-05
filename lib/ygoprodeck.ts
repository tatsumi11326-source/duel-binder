import { normalizeCardSearchText } from "@/lib/card-search";
import { prisma } from "@/lib/prisma";

export type YgoProDeckCard = {
  id: number;
  name: string;
  type?: string;
  desc?: string;
  atk?: number;
  def?: number;
  level?: number;
  race?: string;
  attribute?: string;
  card_sets?: Array<{
    set_name?: string;
    set_code?: string;
    set_rarity?: string;
  }>;
  card_images?: Array<{
    id?: number;
    image_url?: string;
    image_url_small?: string;
    image_url_cropped?: string;
  }>;
};

const provider = "ygoprodeck";
const defaultTtlDays = 7;
const allCardsCacheQuery = "__all_cards__";

export async function searchYgoProDeckCards(term: string) {
  const query = normalizeCacheQuery(term);
  if (!query) return [];

  const cached = await readCache(query);
  if (cached) return cached;

  const cards = await fetchYgoProDeckCards(term);
  await writeCache(query, cards).catch(() => undefined);
  return cards;
}

export async function searchYgoProDeckAllCards(term: string, limit = 30) {
  const query = normalizeCacheQuery(term);
  if (!query) return [];

  const cards = await getAllYgoProDeckCards();
  return cards
    .map((card) => ({ card, score: scoreCard(card, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.card.name.localeCompare(b.card.name))
    .slice(0, limit)
    .map((item) => item.card);
}

export function getYgoProDeckImageUrls(card: YgoProDeckCard) {
  const urls = card.card_images?.flatMap((image) => [image.image_url, image.image_url_small, image.image_url_cropped]) ?? [];
  return uniqueValues([...urls, `https://images.ygoprodeck.com/images/cards/${card.id}.jpg`]);
}

export function toProxiedCardImageUrl(url: string | null | undefined) {
  if (!url) return null;
  if (!url.startsWith("https://images.ygoprodeck.com/")) return url;
  return `/api/card-image?url=${encodeURIComponent(url)}`;
}

async function readCache(query: string) {
  try {
    const cache = await prisma.externalCardCache.findUnique({
      where: {
        provider_query: {
          provider,
          query,
        },
      },
    });

    if (!cache) return null;
    if (cache.expiresAt.getTime() < Date.now()) return null;

    return JSON.parse(cache.payload) as YgoProDeckCard[];
  } catch {
    return null;
  }
}

async function writeCache(query: string, cards: YgoProDeckCard[]) {
  const expiresAt = new Date(Date.now() + defaultTtlDays * 24 * 60 * 60 * 1000);
  await prisma.externalCardCache.upsert({
    where: {
      provider_query: {
        provider,
        query,
      },
    },
    update: {
      payload: JSON.stringify(cards),
      expiresAt,
    },
    create: {
      provider,
      query,
      payload: JSON.stringify(cards),
      expiresAt,
    },
  });
}

async function getAllYgoProDeckCards() {
  const cached = await readCache(allCardsCacheQuery);
  if (cached) return cached;

  const url = new URL("https://db.ygoprodeck.com/api/v7/cardinfo.php");
  url.searchParams.set("misc", "yes");

  const response = await fetch(url, { next: { revalidate: 60 * 60 * 24 * 7 } });
  if (!response.ok) return [];

  const data = (await response.json()) as { data?: YgoProDeckCard[] };
  const cards = data.data ?? [];
  await writeCache(allCardsCacheQuery, cards).catch(() => undefined);
  return cards;
}

async function fetchYgoProDeckCards(term: string) {
  const url = new URL("https://db.ygoprodeck.com/api/v7/cardinfo.php");
  url.searchParams.set("fname", term);
  url.searchParams.set("misc", "yes");

  const response = await fetch(url, { next: { revalidate: 60 * 60 * 24 * 2 } });
  if (!response.ok) return [];

  const data = (await response.json()) as { data?: YgoProDeckCard[] };
  return data.data ?? [];
}

function normalizeCacheQuery(term: string) {
  return normalizeCardSearchText(term).slice(0, 200);
}

function scoreCard(card: YgoProDeckCard, query: string) {
  const searchableValues = [
    card.name,
    card.type,
    card.race,
    card.attribute,
    ...(card.card_sets?.flatMap((set) => [set.set_name, set.set_code, set.set_rarity]) ?? []),
  ];

  let bestScore = 0;
  for (const value of searchableValues) {
    if (!value) continue;
    const normalized = normalizeCardSearchText(value);
    if (!normalized) continue;
    if (normalized === query) bestScore = Math.max(bestScore, 100);
    else if (normalized.startsWith(query)) bestScore = Math.max(bestScore, 80);
    else if (normalized.includes(query)) bestScore = Math.max(bestScore, 60);
  }
  return bestScore;
}

function uniqueValues(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}
