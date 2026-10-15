import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenMeteoGeocodingProvider } from "./OpenMeteoGeocodingProvider.js";

const fetchMock = vi.fn();

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function requestedURL(): URL {
  return new URL(String(fetchMock.mock.calls[0][0]));
}

describe("OpenMeteoGeocodingProvider", () => {
  let provider: OpenMeteoGeocodingProvider;

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    provider = new OpenMeteoGeocodingProvider();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("maps Open-Meteo results to domain Locations", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        results: [
          {
            id: 2988507,
            name: "Paris",
            latitude: 48.85341,
            longitude: 2.3488,
            country: "France",
            admin1: "Île-de-France",
            timezone: "Europe/Paris",
          },
        ],
      }),
    );

    await expect(provider.search("Paris")).resolves.toEqual([
      {
        id: "2988507",
        name: "Paris",
        country: "France",
        region: "Île-de-France",
        latitude: 48.85341,
        longitude: 2.3488,
      },
    ]);
  });

  it("leaves country and region undefined when Open-Meteo omits them", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        results: [{ id: 1, name: "Nowhere", latitude: 0, longitude: 0 }],
      }),
    );

    const [location] = await provider.search("Nowhere");

    expect(location.country).toBeUndefined();
    expect(location.region).toBeUndefined();
  });

  it("returns [] when Open-Meteo has no matches", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ generationtime_ms: 0.05 }));

    await expect(provider.search("zzzzqqq")).resolves.toEqual([]);
  });

  it.each(["", "   "])(
    "returns [] for blank input %j without calling Open-Meteo",
    async (name) => {
      await expect(provider.search(name)).resolves.toEqual([]);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("sends a trimmed name with the expected query params", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    await provider.search("  London  ");

    const url = requestedURL();
    expect(url.origin + url.pathname).toBe(
      "https://geocoding-api.open-meteo.com/v1/search",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      name: "London",
      count: "3",
      language: "en",
      format: "json",
    });
  });

  it("passes a custom count through", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    await provider.search("London", 10);

    expect(requestedURL().searchParams.get("count")).toBe("10");
  });

  it("sends an abort signal so slow requests time out", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    await provider.search("London");

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("throws when Open-Meteo responds with an error status", async () => {
    fetchMock.mockResolvedValue(
      new Response("boom", { status: 500, statusText: "Internal Server Error" }),
    );

    await expect(provider.search("London")).rejects.toThrow(
      "Open-Meteo geocoding request failed: 500 Internal Server Error",
    );
  });

  it("propagates network failures", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    await expect(provider.search("London")).rejects.toThrow("fetch failed");
  });
});
