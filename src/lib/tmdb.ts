import "server-only";

import type { DiscoverFilters, Episode, Media, MediaSearchResult, MediaType, Movie, MovieSearchResult, SeasonSummary } from "./types";

const API = "https://api.themoviedb.org/3";
const token = process.env.TMDB_READ_API_KEY;

type TmdbMedia = {
  id: number;
  media_type?: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  original_language: string;
  vote_average?: number;
  vote_count?: number;
};

type TmdbVideo = { key: string; site: string; type: string; official: boolean };
type TmdbProviderResults = Record<string, { flatrate?: { provider_name: string }[]; rent?: { provider_name: string }[] }>;
type TmdbSeasonSummary = { season_number: number; name: string; episode_count: number; air_date: string | null; poster_path: string | null };
type TmdbEpisode = { episode_number: number; name: string; overview: string; runtime: number | null; air_date: string | null; still_path: string | null };

type TmdbDetails = TmdbMedia & {
  runtime?: number | null;
  episode_run_time?: number[];
  number_of_episodes?: number;
  number_of_seasons?: number;
  seasons?: TmdbSeasonSummary[];
  genres: { name: string }[];
  videos?: { results: TmdbVideo[] };
  "watch/providers"?: { results: TmdbProviderResults };
};

type TmdbSeason = {
  season_number: number;
  name: string;
  overview: string;
  air_date: string | null;
  poster_path: string | null;
  episodes: TmdbEpisode[];
  videos?: { results: TmdbVideo[] };
};

async function tmdb<T>(path: string, revalidate = 3600): Promise<T> {
  if (!token) throw new Error("TMDB_READ_API_KEY is not configured");
  const request = () => fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
    next: { revalidate },
    signal: AbortSignal.timeout(12_000),
  });
  let response: Response;
  try {
    response = await request();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 250));
    response = await request();
  }
  if (response.status === 429 || response.status >= 500) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    response = await request();
  }
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`TMDB request failed (${response.status}): ${detail.slice(0, 160)}`);
  }
  return response.json() as Promise<T>;
}

function year(value?: string | null) {
  return value ? Number(value.slice(0, 4)) || null : null;
}

function searchMedia(item: TmdbMedia, fallbackType?: MediaType): MediaSearchResult {
  const mediaType = item.media_type === "tv" || fallbackType === "tv" ? "tv" : "movie";
  return {
    mediaType,
    tmdbId: item.id,
    seasonNumber: null,
    title: mediaType === "tv" ? item.name ?? item.title ?? "Untitled" : item.title ?? item.name ?? "Untitled",
    year: year(mediaType === "tv" ? item.first_air_date : item.release_date),
    posterPath: item.poster_path,
    backdropPath: item.backdrop_path,
    overview: item.overview,
    originalLanguage: item.original_language,
    voteAverage: item.vote_count ? Math.round((item.vote_average ?? 0) * 10) / 10 : null,
    voteCount: item.vote_count ?? 0,
  };
}

function providers(details: TmdbDetails, region: string) {
  const data = details["watch/providers"]?.results[region.toUpperCase()];
  return [...(data?.flatrate ?? []), ...(data?.rent ?? [])]
    .map((provider) => provider.provider_name)
    .filter((name, index, all) => all.indexOf(name) === index);
}

function trailer(videos: TmdbVideo[] = []) {
  return videos.find((video) => video.site === "YouTube" && video.type === "Trailer" && video.official)?.key
    ?? videos.find((video) => video.site === "YouTube" && video.type === "Trailer")?.key
    ?? null;
}

export async function searchMediaTitles(query: string, mediaType?: MediaType, page = 1) {
  const params = new URLSearchParams({ query, include_adult: "false", language: "en-US", page: String(page) });
  const endpoint = mediaType ? `/search/${mediaType}` : "/search/multi";
  const data = await tmdb<{ results: TmdbMedia[]; total_pages: number }>(`${endpoint}?${params}`, 300);
  return {
    results: data.results.filter((item) => item.media_type !== "person").map((item) => searchMedia(item, mediaType)),
    totalPages: data.total_pages,
  };
}

export async function trendingMedia(mediaType?: MediaType, page = 1): Promise<MediaSearchResult[]> {
  const data = await tmdb<{ results: TmdbMedia[] }>(`/trending/${mediaType ?? "all"}/week?language=en-US&page=${page}`, 3600);
  return data.results.filter((item) => item.media_type !== "person").map((item) => searchMedia(item, mediaType));
}

export async function discoverMediaPage(filters: DiscoverFilters = {}): Promise<{ results: MediaSearchResult[]; totalPages: number }> {
  const { mediaType, genreIds = [], providerIds = [], originalLanguage, yearMin, yearMax, runtimeMin, runtimeMax, region = "IN", sort = "popularity.desc", page = 1 } = filters;
  const filtered = genreIds.length || providerIds.length || originalLanguage || yearMin || yearMax || runtimeMin || runtimeMax || sort !== "popularity.desc";
  if (!mediaType && !filtered) return { results: await trendingMedia(undefined, page), totalPages: 20 };
  if (!mediaType) {
    const [movies, shows] = await Promise.all([discoverMediaPage({ ...filters, mediaType: "movie" }), discoverMediaPage({ ...filters, mediaType: "tv" })]);
    return {
      results: movies.results.flatMap((movie, index) => shows.results[index] ? [movie, shows.results[index]] : [movie]),
      totalPages: Math.max(movies.totalPages, shows.totalPages),
    };
  }
  const sortBy = sort === "date.desc" ? mediaType === "movie" ? "primary_release_date.desc" : "first_air_date.desc" : sort;
  const params = new URLSearchParams({ language: "en-US", sort_by: sortBy, include_adult: "false", page: String(page) });
  if (genreIds.length) params.set("with_genres", genreIds.join(","));
  if (providerIds.length) {
    params.set("with_watch_providers", providerIds.join("|"));
    params.set("watch_region", region.toUpperCase());
  }
  if (originalLanguage) params.set("with_original_language", originalLanguage.toLowerCase());
  if (yearMin) params.set(mediaType === "movie" ? "primary_release_date.gte" : "first_air_date.gte", `${yearMin}-01-01`);
  if (yearMax) params.set(mediaType === "movie" ? "primary_release_date.lte" : "first_air_date.lte", `${yearMax}-12-31`);
  if (runtimeMin) params.set("with_runtime.gte", String(runtimeMin));
  if (runtimeMax) params.set("with_runtime.lte", String(runtimeMax));
  if (sort === "vote_average.desc") params.set("vote_count.gte", "100");
  const data = await tmdb<{ results: TmdbMedia[]; total_pages: number }>(`/discover/${mediaType}?${params}`, 3600);
  return { results: data.results.map((item) => searchMedia(item, mediaType)), totalPages: Math.min(data.total_pages, 20) };
}

export async function discoverMedia(filters: DiscoverFilters = {}) {
  return (await discoverMediaPage(filters)).results;
}

export async function popularMedia(mediaType: MediaType, page = 1) {
  const data = await tmdb<{ results: TmdbMedia[] }>(`/${mediaType}/popular?language=en-US&page=${page}`, 3600);
  return data.results.map((item) => searchMedia(item, mediaType));
}

export async function getGenres(mediaType: MediaType) {
  return (await tmdb<{ genres: { id: number; name: string }[] }>(`/genre/${mediaType}/list?language=en-US`, 86400)).genres;
}

export async function getWatchProviders(mediaType: MediaType, region = "IN") {
  const data = await tmdb<{ results: { provider_id: number; provider_name: string; logo_path: string | null; display_priorities: Record<string, number> }[] }>(`/watch/providers/${mediaType}?language=en-US&watch_region=${region}`, 86400);
  return data.results.filter((provider) => provider.display_priorities[region] !== undefined).sort((a, b) => a.display_priorities[region] - b.display_priorities[region]).map((provider) => ({ id: provider.provider_id, name: provider.provider_name, logoPath: provider.logo_path }));
}

export async function getMedia(mediaType: MediaType, tmdbId: number, region = "IN", seasonNumber?: number | null): Promise<Media> {
  const details = await tmdb<TmdbDetails>(`/${mediaType}/${tmdbId}?append_to_response=videos,watch/providers&language=en-US`, 86400);
  const base = searchMedia(details, mediaType);
  const seasonSummaries: SeasonSummary[] | undefined = mediaType === "tv"
    ? (details.seasons ?? []).filter((season) => season.season_number > 0).map((season) => ({
      seasonNumber: season.season_number,
      name: season.name,
      episodeCount: season.episode_count,
      year: year(season.air_date),
      posterPath: season.poster_path,
    }))
    : undefined;

  if (mediaType === "tv" && seasonNumber !== undefined && seasonNumber !== null) {
    const season = await tmdb<TmdbSeason>(`/tv/${tmdbId}/season/${seasonNumber}?append_to_response=videos&language=en-US`, 86400);
    const episodes: Episode[] = season.episodes.map((episode) => ({
      episodeNumber: episode.episode_number,
      name: episode.name,
      overview: episode.overview,
      runtime: episode.runtime,
      airDate: episode.air_date,
      stillPath: episode.still_path,
    }));
    return {
      ...base,
      seasonNumber,
      title: `${base.title}: ${season.name}`,
      year: year(season.air_date),
      posterPath: season.poster_path ?? base.posterPath,
      overview: season.overview || base.overview,
      runtime: episodes.reduce((total, episode) => total + (episode.runtime ?? 0), 0) || null,
      genres: details.genres.map((genre) => genre.name),
      providers: providers(details, region),
      trailerKey: trailer(season.videos?.results) ?? trailer(details.videos?.results),
      episodeCount: episodes.length,
      seasonCount: details.number_of_seasons ?? null,
      seasons: seasonSummaries,
      episodes,
    };
  }

  const estimatedTvRuntime = mediaType === "tv" && details.episode_run_time?.[0] && details.number_of_episodes
    ? details.episode_run_time[0] * details.number_of_episodes
    : null;
  return {
    ...base,
    genres: details.genres.map((genre) => genre.name),
    runtime: mediaType === "movie" ? details.runtime ?? null : estimatedTvRuntime,
    providers: providers(details, region),
    trailerKey: trailer(details.videos?.results),
    episodeCount: mediaType === "tv" ? details.number_of_episodes ?? null : null,
    seasonCount: mediaType === "tv" ? details.number_of_seasons ?? null : null,
    seasons: seasonSummaries,
  };
}

export async function getRecommendations(mediaType: MediaType, tmdbId: number, page = 1) {
  const data = await tmdb<{ results: TmdbMedia[] }>(`/${mediaType}/${tmdbId}/recommendations?language=en-US&page=${page}`, 3600);
  return data.results.map((item) => searchMedia(item, mediaType));
}

export async function searchMovies(query: string, page = 1) {
  const result = await searchMediaTitles(query, "movie", page);
  return result as { results: MovieSearchResult[]; totalPages: number };
}

export async function trendingMovies() {
  return (await trendingMedia("movie")).slice(0, 12) as MovieSearchResult[];
}

export async function getMovie(tmdbId: number, region = "IN"): Promise<Movie> {
  return getMedia("movie", tmdbId, region);
}
