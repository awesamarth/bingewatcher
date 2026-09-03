import { NextResponse } from "next/server";
import { z } from "zod";
import { getRecommendations } from "@/lib/tmdb";

const paramsSchema = z.object({ type: z.enum(["movie", "tv"]), id: z.coerce.number().int().positive() });

export async function GET(_request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) return NextResponse.json({ error: "Invalid title" }, { status: 400 });
  try {
    return NextResponse.json({ results: await getRecommendations(parsed.data.type, parsed.data.id) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load recommendations" }, { status: 502 });
  }
}
