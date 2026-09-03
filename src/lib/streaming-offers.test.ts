import { describe, expect, test } from "bun:test";
import { parseStreamingOffers } from "./streaming-offers";

describe("parseStreamingOffers", () => {
  test("keeps the best safe offer for each provider", () => {
    const service = { id: "prime", name: "Prime Video", imageSet: { whiteImage: "https://media.example/prime.svg" } };
    const offers = parseStreamingOffers({ streamingOptions: { in: [
      { service, type: "rent", link: "https://prime.example/rent", price: { formatted: "119 INR" } },
      { service, type: "subscription", link: "https://prime.example/watch" },
      { service: { id: "bad", name: "Bad" }, type: "free", link: "javascript:alert(1)" },
    ] } }, "IN");

    expect(offers).toEqual([{ serviceId: "prime", serviceName: "Prime Video", logoUrl: "https://media.example/prime.svg", type: "subscription", link: "https://prime.example/watch", quality: null, price: null }]);
  });
});
