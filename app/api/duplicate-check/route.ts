import { NextResponse } from "next/server";
import { findDuplicateOwnedCards } from "@/lib/duplicate-owned-cards";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cardId = parseOptionalInt(searchParams.get("cardId"));
  const excludeOwnedCardId = parseOptionalInt(searchParams.get("excludeOwnedCardId"));

  const matches = await findDuplicateOwnedCards({
    cardId,
    cardNumber: searchParams.get("cardNumber"),
    englishName: searchParams.get("englishName"),
    excludeOwnedCardId,
    japaneseName: searchParams.get("japaneseName"),
    language: searchParams.get("language"),
    rarity: searchParams.get("rarity"),
  });

  return NextResponse.json({ matches });
}

function parseOptionalInt(value: string | null) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}
