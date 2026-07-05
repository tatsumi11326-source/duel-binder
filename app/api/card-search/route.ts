import { NextResponse } from "next/server";
import { searchCardCandidates } from "@/lib/card-search-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  return NextResponse.json({
    candidates: await searchCardCandidates(query),
  });
}
