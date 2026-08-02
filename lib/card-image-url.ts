const ygoProDeckImageHost = "images.ygoprodeck.com";
const proxyPrefix = "/api/card-image?url=";

export function toDirectCardImageUrl(value: string | null | undefined) {
  if (!value) return null;
  if (!value.startsWith(proxyPrefix)) return value;

  try {
    const directUrl = decodeURIComponent(value.slice(proxyPrefix.length));
    const parsed = new URL(directUrl);
    return parsed.protocol === "https:" && parsed.hostname === ygoProDeckImageHost ? directUrl : value;
  } catch {
    return value;
  }
}

export function toCardThumbnailUrl(value: string | null | undefined) {
  const directUrl = toDirectCardImageUrl(value);
  if (!directUrl) return null;

  try {
    const parsed = new URL(directUrl);
    if (parsed.protocol !== "https:" || parsed.hostname !== ygoProDeckImageHost) return directUrl;
    parsed.pathname = parsed.pathname.replace("/images/cards/", "/images/cards_small/");
    return parsed.toString();
  } catch {
    return directUrl;
  }
}
