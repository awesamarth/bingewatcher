import { NextResponse } from "next/server";
import { z } from "zod";
import { getStreamingOffers } from "@/lib/streaming";
import { getMedia } from "@/lib/tmdb";

const paramsSchema = z.object({ type: z.enum(["movie", "tv"]), id: z.coerce.number().int().positive() });

export async function GET(request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) return NextResponse.json({ error: "Invalid title" }, { status: 400 });
  const searchParams = new URL(request.url).searchParams;
  const seasonValue = searchParams.get("season");
  const seasonNumber = seasonValue === null ? null : Number(seasonValue);
  const region = (searchParams.get("region") ?? "IN").toUpperCase();
  if (seasonNumber !== null && (!Number.isInteger(seasonNumber) || seasonNumber < 0)) return NextResponse.json({ error: "Invalid season" }, { status: 400 });
  if (!/^[A-Z]{2}$/.test(region)) return NextResponse.json({ error: "Invalid region" }, { status: 400 });
  try {
    const [media, streamingOffers] = await Promise.all([
      getMedia(parsed.data.type, parsed.data.id, region, seasonNumber),
      getStreamingOffers(parsed.data.type, parsed.data.id, region).catch((error) => { console.error(error); return []; }),
    ]);
    return NextResponse.json({ media, streamingOffers });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load title" }, { status: 502 });
  }
}
