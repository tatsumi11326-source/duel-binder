import { NextResponse } from "next/server";

const allowedHost = "images.ygoprodeck.com";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return new NextResponse("Missing image url", { status: 400 });
  }

  let imageUrl: URL;
  try {
    imageUrl = new URL(rawUrl);
  } catch {
    return new NextResponse("Invalid image url", { status: 400 });
  }

  if (imageUrl.protocol !== "https:" || imageUrl.hostname !== allowedHost) {
    return new NextResponse("Unsupported image host", { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(imageUrl, { next: { revalidate: 60 * 60 * 24 * 30 } });
  } catch {
    return NextResponse.redirect(imageUrl);
  }

  if (!response.ok || !response.body) {
    return NextResponse.redirect(imageUrl);
  }

  return new NextResponse(response.body, {
    headers: {
      "Cache-Control": "public, max-age=2592000, immutable",
      "Content-Type": response.headers.get("content-type") ?? "image/jpeg",
    },
  });
}
