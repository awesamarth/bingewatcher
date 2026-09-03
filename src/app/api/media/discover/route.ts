import { NextResponse } from "next/server";
import { discoverQuerySchema } from "@/lib/discovery";
import { discoverMediaPage, getGenres, getWatchProviders, popularMedia, trendingMedia } from "@/lib/tmdb";
import type { DiscoverFilters, MediaType } from "@/lib/types";

function unique<T extends { id: number }>(items: T[]) {
  return items.filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const parsed = discoverQuerySchema.safeParse({
    type: params.get("type") ?? undefined,
    genres: params.get("genres") ?? params.get("genre") ?? undefined,
    genreNames: params.get("genreNames") ?? undefined,
    providers: params.get("providers") ?? params.get("provider") ?? undefined,
    language: params.get("language") ?? undefined,
    yearMin: params.get("yearMin") ?? undefined,
    yearMax: params.get("yearMax") ?? undefined,
    runtimeMin: params.get("runtimeMin") ?? undefined,
    runtimeMax: params.get("runtimeMax") ?? undefined,
    region: params.get("region") ?? undefined,
    sort: params.get("sort") ?? undefined,
    page: params.get("page") ?? undefined,
    trending: params.get("trending") ?? undefined,
    popular: params.get("popular") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid filters" }, { status: 400 });

  const input = parsed.data;

  try {
    const types: MediaType[] = input.type ? [input.type] : ["movie", "tv"];
    const [genreLists, providerLists] = input.page === 1 || input.genreNames
      ? await Promise.all([
        Promise.all(types.map((type) => getGenres(type))),
        input.page === 1 ? Promise.all(types.map((type) => getWatchProviders(type, input.region))) : Promise.resolve([]),
      ])
      : [[], []];
    const genreNames = input.genreNames?.split(",").map((name) => name.trim()).filter(Boolean) ?? [];
    const availableGenres = unique(genreLists.flat());
    const namedGenreIds = genreNames.map((name) => availableGenres.find((genre) => genre.name.toLowerCase() === name.toLowerCase())?.id);
    const unknownGenre = genreNames.find((_, index) => namedGenreIds[index] === undefined);
    if (unknownGenre) return NextResponse.json({ error: `Unknown ${input.type} genre: ${unknownGenre}` }, { status: 400 });
    const resolvedGenreIds = [...new Set([...(input.genres?.split(",").map(Number) ?? []), ...namedGenreIds.filter((id): id is number => id !== undefined)])];
    const filters: DiscoverFilters = {
      mediaType: input.type,
      genreIds: resolvedGenreIds,
      providerIds: input.providers?.split(",").map(Number),
      originalLanguage: input.language,
      yearMin: input.yearMin,
      yearMax: input.yearMax,
      runtimeMin: input.runtimeMin,
      runtimeMax: input.runtimeMax,
      region: input.region.toUpperCase(),
      sort: input.sort,
      page: input.page,
    };
    const page = input.trending === "true"
      ? { results: await trendingMedia(input.type, input.page) }
      : input.popular === "true" && input.type
        ? { results: await popularMedia(input.type, input.page) }
        : await discoverMediaPage(filters);
    if (input.page > 1) return NextResponse.json({ ...page, resolvedGenreIds });
    return NextResponse.json({ ...page, resolvedGenreIds, genres: availableGenres, providers: unique(providerLists.flat()) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not discover titles" }, { status: 502 });
  }
}
