import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenMeteoMarineProvider } from "./OpenMeteoMarineProvider.js";

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

describe("OpenMeteoMarineProvider", () => {
  let provider: OpenMeteoMarineProvider;

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    provider = new OpenMeteoMarineProvider();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("turns the parallel arrays into one DailyMarine per day", async () => {
    // Trimmed from a real Lisbon response (2026-10-16).
    fetchMock.mockResolvedValue(
      jsonResponse({
        daily: {
          time: ["2026-10-16", "2026-10-17"],
          swell_wave_height_max: [1.02, 0.96],
          swell_wave_period_max: [10.55, 10.0],
        },
      }),
    );

    await expect(provider.daily(38.72, -9.14)).resolves.toEqual([
      { date: "2026-10-16", swellWaveHeightMax: 1.02, swellWavePeriodMax: 10.55 },
      { date: "2026-10-17", swellWaveHeightMax: 0.96, swellWavePeriodMax: 10.0 },
    ]);
  });

  it("passes nulls through for inland places (Madrid returns 200, all null)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        daily: {
          time: ["2026-10-16"],
          swell_wave_height_max: [null],
          swell_wave_period_max: [null],
        },
      }),
    );

    await expect(provider.daily(40.4165, -3.70256)).resolves.toEqual([
      { date: "2026-10-16", swellWaveHeightMax: null, swellWavePeriodMax: null },
    ]);
  });

  it("requests both swell variables, 7 days, local timezone and sea cells", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        daily: {
          time: [],
          swell_wave_height_max: [],
          swell_wave_period_max: [],
        },
      }),
    );

    await provider.daily(38.72, -9.14);

    const url = requestedURL();
    expect(url.origin + url.pathname).toBe(
      "https://marine-api.open-meteo.com/v1/marine",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      latitude: "38.72",
      longitude: "-9.14",
      daily: "swell_wave_height_max,swell_wave_period_max",
      forecast_days: "7",
      timezone: "auto",
      cell_selection: "sea",
    });
  });

  it("sends an abort signal so slow requests time out", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        daily: {
          time: [],
          swell_wave_height_max: [],
          swell_wave_period_max: [],
        },
      }),
    );

    await provider.daily(38.72, -9.14);

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("throws when the Marine API responds with an error status", async () => {
    fetchMock.mockResolvedValue(
      new Response("boom", { status: 503, statusText: "Service Unavailable" }),
    );

    await expect(provider.daily(38.72, -9.14)).rejects.toThrow(
      "Open-Meteo marine request failed: 503 Service Unavailable",
    );
  });
});
