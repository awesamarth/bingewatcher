export type StreamingOffer = {
  serviceId: string;
  serviceName: string;
  logoUrl: string | null;
  type: string;
  link: string;
  quality: string | null;
  price: string | null;
};

const priority: Record<string, number> = { subscription: 0, free: 1, addon: 2, rent: 3, buy: 4 };
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

function httpsUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function parseStreamingOffers(data: unknown, region: string): StreamingOffer[] {
  if (!record(data) || !record(data.streamingOptions)) return [];
  const rawOffers = data.streamingOptions[region.toLowerCase()];
  if (!Array.isArray(rawOffers)) return [];

  const offers = rawOffers.flatMap((raw): StreamingOffer[] => {
    if (!record(raw) || !record(raw.service)) return [];
    const link = httpsUrl(raw.link);
    const { id, name, imageSet } = raw.service;
    if (!link || typeof id !== "string" || typeof name !== "string") return [];
    const images = record(imageSet) ? imageSet : {};
    return [{
      serviceId: id,
      serviceName: name,
      logoUrl: httpsUrl(images.whiteImage) ?? httpsUrl(images.darkThemeImage),
      type: typeof raw.type === "string" ? raw.type : "subscription",
      link,
      quality: typeof raw.quality === "string" ? raw.quality : null,
      price: record(raw.price) && typeof raw.price.formatted === "string" ? raw.price.formatted : null,
    }];
  }).sort((a, b) => (priority[a.type] ?? 9) - (priority[b.type] ?? 9));

  return offers.filter((offer, index) => offers.findIndex((item) => item.serviceId === offer.serviceId) === index).slice(0, 6);
}
