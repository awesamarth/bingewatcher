import { NextResponse } from "next/server";
import { personalRecommendations } from "@/lib/library";
import { getSessionId } from "@/lib/session";

export async function GET(request: Request) {
  const page = Number(new URL(request.url).searchParams.get("page") ?? 1);
  if (!Number.isInteger(page) || page < 1 || page > 20) return NextResponse.json({ error: "Invalid page" }, { status: 400 });
  try {
    return NextResponse.json({ results: await personalRecommendations(await getSessionId(), page) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load recommendations" }, { status: 502 });
  }
}
