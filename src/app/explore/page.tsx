import { ExploreClient } from "@/components/explore-client";
import { SiteNav } from "@/components/site-nav";
import { WebMCPTools } from "@/components/webmcp-tools";
import { discoverMedia, getGenres, getWatchProviders, popularMedia, trendingMedia } from "@/lib/tmdb";

export const metadata = { title: "Explore movies and shows" };

export default async function ExplorePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const value = (name: string) => typeof query[name] === "string" ? query[name] : undefined;
  const number = (name: string, min: number, max: number) => { const parsed = Number(value(name)); return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : undefined; };
  const ids = (name: string) => value(name)?.split(",").map(Number).filter((id) => Number.isInteger(id) && id > 0).slice(0, 20) ?? [];
  const type = value("type");
  const mediaType: "movie" | "tv" | "all" = type === "movie" || type === "tv" ? type : "all";
  const sort = value("sort");
  const region = value("region")?.toUpperCase();
  const initial = {
    query: value("q")?.slice(0, 120),
    mediaType,
    genreIds: ids("genres"), providerIds: ids("providers"),
    language: /^[a-z]{2}$/i.test(value("language") ?? "") ? value("language")?.toLowerCase() : undefined,
    yearMin: number("yearMin", 1870, 2100), yearMax: number("yearMax", 1870, 2100),
    runtimeMin: number("runtimeMin", 1, 1000), runtimeMax: number("runtimeMax", 1, 1000),
    region: /^[A-Z]{2}$/.test(region ?? "") ? region : "IN",
    sort: sort === "vote_average.desc" || sort === "date.desc" ? sort : "popularity.desc",
  };
  const [trending, trendingMovies, trendingShows, movies, shows, movieGenres, tvGenres, movieProviders, tvProviders] = await Promise.all([
    discoverMedia().catch(() => []),
    trendingMedia("movie").catch(() => []),
    trendingMedia("tv").catch(() => []),
    popularMedia("movie").catch(() => []),
    popularMedia("tv").catch(() => []),
    getGenres("movie").catch(() => []),
    getGenres("tv").catch(() => []),
    getWatchProviders("movie").catch(() => []),
    getWatchProviders("tv").catch(() => []),
  ]);

  return (
    <main className="min-h-screen [overflow-anchor:none] bg-canvas">
      <WebMCPTools surface="explore" />
      <SiteNav active="explore" />
      <ExploreClient key={JSON.stringify(initial)} trending={trending} trendingMovies={trendingMovies} trendingShows={trendingShows} movies={movies} shows={shows} genres={[...movieGenres, ...tvGenres].filter((genre, index, all) => all.findIndex((item) => item.name === genre.name) === index)} providers={[...movieProviders, ...tvProviders].filter((provider, index, all) => all.findIndex((item) => item.id === provider.id) === index).slice(0, 20)} initial={initial} />
    </main>
  );
}
