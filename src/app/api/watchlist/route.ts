import { NextResponse } from "next/server";
import { z } from "zod";
import { addToWatchlist, listWatchlist, removeFromWatchlist } from "@/lib/library";
import { getSessionId } from "@/lib/session";

const itemSchema = z.object({
  mediaType: z.enum(["movie", "tv"]),
  tmdbId: z.number().int().positive(),
  seasonNumber: z.number().int().nonnegative().nullable().optional(),
});

export async function GET() {
  try {
    return NextResponse.json({ items: listWatchlist(await getSessionId()) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Could not load watchlist" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const input = itemSchema.parse(await request.json());
    const media = await addToWatchlist(await getSessionId(), input.mediaType, input.tmdbId, input.seasonNumber);
    return NextResponse.json({ media }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid title" }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update watchlist" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const input = itemSchema.parse(await request.json());
    removeFromWatchlist(await getSessionId(), input.mediaType, input.tmdbId, input.seasonNumber);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid title" }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: "Could not update watchlist" }, { status: 500 });
  }
}
