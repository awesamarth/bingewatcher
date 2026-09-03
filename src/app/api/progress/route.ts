import { NextResponse } from "next/server";
import { z } from "zod";
import { getProgress, recordGlobalReaction, setWatched } from "@/lib/library";
import { getSessionId } from "@/lib/session";

const targetSchema = z.object({
  mediaType: z.enum(["movie", "tv"]),
  tmdbId: z.number().int().positive(),
  seasonNumber: z.number().int().nonnegative().nullable().optional(),
  episodeNumber: z.number().int().positive().nullable().optional(),
});

const mutationSchema = targetSchema.extend({
  watched: z.boolean().optional(),
  reaction: z.enum(["Loved it", "Wild", "Not for me"]).nullable().optional(),
});

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const parsed = targetSchema.safeParse({
    mediaType: params.get("type"),
    tmdbId: Number(params.get("id")),
    seasonNumber: params.has("season") ? Number(params.get("season")) : undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "Invalid title" }, { status: 400 });
  return NextResponse.json({ progress: getProgress(await getSessionId(), parsed.data.mediaType, parsed.data.tmdbId, parsed.data.seasonNumber) });
}

export async function POST(request: Request) {
  try {
    const input = mutationSchema.parse(await request.json());
    const sessionId = await getSessionId();
    const progress = input.watched !== undefined
      ? await setWatched({ sessionId, ...input, watched: input.watched })
      : recordGlobalReaction({ sessionId, ...input });
    return NextResponse.json({ progress });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid progress" }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update progress" }, { status: 500 });
  }
}
