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
  }>;
};

const provider = "ygoprodeck";
const defaultTtlDays = 7;

export async function searchYgoProDeckCards(term: string) {
  const query = normalizeCacheQuery(term);
  if (!query) return [];

  const cached = await readCache(query);
  if (cached) return cached;

  const cards = await fetchYgoProDeckCards(term);
  await writeCache(query, cards).catch(() => undefined);
  return cards;
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
