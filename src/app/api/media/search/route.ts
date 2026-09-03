import { NextResponse } from "next/server";
import { discoverQuerySchema } from "@/lib/discovery";
import { searchMediaTitlesFiltered } from "@/lib/tmdb";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ error: "Enter at least two characters" }, { status: 400 });
  const parsed = discoverQuerySchema.safeParse(Object.fromEntries(params));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid search filters" }, { status: 400 });
  const filters = parsed.data;
  try {
    const result = await searchMediaTitlesFiltered(query, {
      mediaType: filters.type,
      genreIds: filters.genres?.split(",").map(Number),
      providerIds: filters.providers?.split(",").map(Number),
      originalLanguage: filters.language?.toLowerCase(),
      yearMin: filters.yearMin,
      yearMax: filters.yearMax,
      runtimeMin: filters.runtimeMin,
      runtimeMax: filters.runtimeMax,
      region: filters.region,
      sort: filters.sort,
      page: filters.page,
    });
    return NextResponse.json({ ...result, totalPages: Math.min(result.totalPages, 20) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Search failed" }, { status: 502 });
  }
}
