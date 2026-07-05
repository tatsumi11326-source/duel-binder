export type CardSearchPrint = {
  cardNumber: string | null;
  packName: string | null;
  rarity: string | null;
};

export type CardSearchCandidate = {
  atk: number | null;
  attribute: string | null;
  cardType: string | null;
  def: number | null;
  description: string | null;
  englishName: string | null;
  id: string;
  imageUrl: string | null;
  imageUrls: string[];
  japaneseName: string;
  level: number | null;
  prints: CardSearchPrint[];
  race: string | null;
  source: "local" | "ygoprodeck";
};

export function normalizeCardSearchText(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[・･\s　\-‐-‒–—―＿_.,，、。'’"“”/／\\()[\]{}【】「」『』:：;；!！?？+＋]/g, "")
    .replace(/ヴ/g, "ウ")
    .trim();
}

export function includesNormalizedSearch(target: string | null | undefined, query: string) {
  if (!target) return false;
  const normalizedTarget = normalizeCardSearchText(target);
  const normalizedQuery = normalizeCardSearchText(query);
  return normalizedTarget.includes(normalizedQuery);
}
