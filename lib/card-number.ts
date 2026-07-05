export function normalizeCardNumber(value: string | null | undefined) {
  const normalized = value
    ?.normalize("NFKC")
    .trim()
    .toUpperCase()
    .replace(/[‐‑‒–—―ーｰ−]/g, "-")
    .replace(/\s+/g, "")
    .replace(/_/g, "-")
    .replace(/-+/g, "-");

  if (!normalized) return "";

  const jpMatch = normalized.match(/^([A-Z]{2,8})-?JP-?(\d{1,3})$/);
  if (jpMatch) return `${jpMatch[1]}-JP${jpMatch[2].padStart(3, "0")}`;

  const letterNumberMatch = normalized.match(/^([A-Z]{1,8})-?(\d{1,3})$/);
  if (letterNumberMatch) {
    const digits = letterNumberMatch[2].length <= 2 ? letterNumberMatch[2].padStart(2, "0") : letterNumberMatch[2];
    return `${letterNumberMatch[1]}-${digits}`;
  }

  return normalized;
}

export function nextCardNumber(value: string | null | undefined) {
  const normalized = normalizeCardNumber(value);
  const match = normalized.match(/^(.*?)(\d+)$/);
  if (!match) return "";

  const nextNumber = String(Number(match[2]) + 1).padStart(match[2].length, "0");
  return `${match[1]}${nextNumber}`;
}

export function cardNumberPrefix(value: string | null | undefined) {
  const normalized = normalizeCardNumber(value);
  return normalized.replace(/\d+$/, "");
}

