import { NextResponse } from "next/server";
import { z } from "zod";
import { searchMediaTitles } from "@/lib/tmdb";

const typeSchema = z.enum(["movie", "tv"]);

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ error: "Enter at least two characters" }, { status: 400 });
  const parsedType = params.get("type") ? typeSchema.safeParse(params.get("type")) : null;
  const page = Number(params.get("page") ?? 1);
  if (parsedType && !parsedType.success) return NextResponse.json({ error: "Invalid media type" }, { status: 400 });
  if (!Number.isInteger(page) || page < 1 || page > 20) return NextResponse.json({ error: "Invalid page" }, { status: 400 });
  try {
    const result = await searchMediaTitles(query, parsedType?.data, page);
    return NextResponse.json({ ...result, totalPages: Math.min(result.totalPages, 20) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Search failed" }, { status: 502 });
  }
}
