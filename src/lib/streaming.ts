import "server-only";

import type { MediaType } from "./types";
import { parseStreamingOffers } from "./streaming-offers";

const API = "https://api.movieofthenight.com/v4";

export async function getStreamingOffers(mediaType: MediaType, tmdbId: number, region = "IN") {
  const key = process.env.STREAMING_AVAILABILITY_API_KEY;
  if (!key) return [];
  const response = await fetch(`${API}/shows/${mediaType}/${tmdbId}?country=${region.toLowerCase()}`, {
    headers: { "X-API-Key": key },
    next: { revalidate: 86400 },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Streaming availability request failed (${response.status})`);
  return parseStreamingOffers(await response.json(), region);
}
