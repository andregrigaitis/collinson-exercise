import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OpenMeteoForecastProvider } from "./OpenMeteoForecastProvider.js";

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

// Trimmed from a real Lisbon response (2026-10-16).
const lisbonDaily = {
  time: ["2026-10-16", "2026-10-22"],
  apparent_temperature_max: [30.9, 20.6],
  precipitation_sum: [0, 0.9],
  precipitation_hours: [0, 9],
  wind_speed_10m_max: [19.5, 10.2],
  wind_gusts_10m_max: [49, 25.6],
  sunshine_duration: [39166.47, 26171.23],
  daylight_duration: [40229.42, 39359.78],
  weather_code: [3, 45],
};

describe("OpenMeteoForecastProvider", () => {
  let provider: OpenMeteoForecastProvider;

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    provider = new OpenMeteoForecastProvider();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("turns Open-Meteo's parallel arrays into one DailyWeather per day", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ daily: lisbonDaily }));

    await expect(provider.daily(38.72, -9.14)).resolves.toEqual([
      {
        date: "2026-10-16",
        apparentTemperatureMax: 30.9,
        precipitationSum: 0,
        precipitationHours: 0,
        windSpeedMax: 19.5,
        windGustsMax: 49,
        sunshineDuration: 39166.47,
        daylightDuration: 40229.42,
        weatherCode: 3,
      },
      {
        date: "2026-10-22",
        apparentTemperatureMax: 20.6,
        precipitationSum: 0.9,
        precipitationHours: 9,
        windSpeedMax: 10.2,
        windGustsMax: 25.6,
        sunshineDuration: 26171.23,
        daylightDuration: 39359.78,
        weatherCode: 45,
      },
    ]);
  });

  it("passes null values through instead of turning them into 0", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        daily: {
          ...lisbonDaily,
          time: ["2026-10-16"],
          sunshine_duration: [null],
          precipitation_sum: [0],
        },
      }),
    );

    const [day] = await provider.daily(38.72, -9.14);

    expect(day.sunshineDuration).toBeNull();
    expect(day.precipitationSum).toBe(0);
  });

  it("returns null for a variable Open-Meteo leaves out entirely", async () => {
    const { weather_code: _omitted, ...withoutWeatherCode } = lisbonDaily;
    fetchMock.mockResolvedValue(jsonResponse({ daily: withoutWeatherCode }));

    const [day] = await provider.daily(38.72, -9.14);

    expect(day.weatherCode).toBeNull();
  });

  it("requests every daily variable in the location's timezone", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ daily: lisbonDaily }));

    await provider.daily(38.72, -9.14);

    const url = requestedURL();
    expect(url.origin + url.pathname).toBe(
      "https://api.open-meteo.com/v1/forecast",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      latitude: "38.72",
      longitude: "-9.14",
      daily:
        "apparent_temperature_max,precipitation_sum,precipitation_hours," +
        "wind_speed_10m_max,wind_gusts_10m_max,sunshine_duration," +
        "daylight_duration,weather_code",
      forecast_days: "7",
      timezone: "auto",
    });
  });

  it("throws when Open-Meteo responds with an error status", async () => {
    fetchMock.mockResolvedValue(
      new Response("boom", { status: 400, statusText: "Bad Request" }),
    );

    await expect(provider.daily(38.72, -9.14)).rejects.toThrow(
      "Open-Meteo forecast request failed: 400 Bad Request",
    );
  });
});
