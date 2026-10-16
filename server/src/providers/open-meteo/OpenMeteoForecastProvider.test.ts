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

// Trimmed from a real Lisbon response (2026-10-16). The snow, rain and
// temperature_2m_max arrays come from a later fetch on the same day.
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
  snowfall_sum: [0, 0],
  rain_sum: [0, 0],
  temperature_2m_max: [30.3, 23.5],
};

const lisbonHourly = {
  time: ["2026-10-16T00:00", "2026-10-16T01:00", "2026-10-22T00:00"],
  snow_depth: [0, 0, 0],
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
    fetchMock.mockResolvedValue(
      jsonResponse({ daily: lisbonDaily, hourly: lisbonHourly }),
    );

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
        snowfallSum: 0,
        rainSum: 0,
        temperatureMax: 30.3,
        snowDepthMin: 0,
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
        snowfallSum: 0,
        rainSum: 0,
        temperatureMax: 23.5,
        snowDepthMin: 0,
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
        "daylight_duration,weather_code,snowfall_sum,rain_sum," +
        "temperature_2m_max",
      hourly: "snow_depth",
      forecast_days: "7",
      timezone: "auto",
    });
  });

  describe("snow depth (hourly only)", () => {
    const hoursOf = (date: string, hours: number[]) =>
      hours.map((h) => `${date}T${String(h).padStart(2, "0")}:00`);
    const range = (from: number, to: number) =>
      Array.from({ length: to - from + 1 }, (_, i) => from + i);

    async function depthsFor(
      dates: string[],
      hourly: { time: string[]; snow_depth: (number | null)[] },
    ) {
      fetchMock.mockResolvedValue(
        jsonResponse({ daily: { time: dates }, hourly }),
      );
      const days = await provider.daily(45.92, 6.87);
      return days.map((d) => d.snowDepthMin);
    }

    it("takes the daily minimum and converts metres to cm", async () => {
      // Chamonix, 2026-01-11: the hourly series swings from 0.29 to 0.44 m.
      const depths = await depthsFor(["2026-01-11"], {
        time: hoursOf("2026-01-11", [0, 1, 2]),
        snow_depth: [0.44, 0.29, 0.31],
      });

      // 0.29 × 100 would be 28.999999999999996 without rounding.
      expect(depths).toEqual([29]);
    });

    it("groups hours by local date, so 23- and 25-hour DST days work", async () => {
      // Made-up series: Open-Meteo itself returns 24 hours on DST days
      // (it uses one fixed offset per response), but grouping by date
      // must not depend on that. Spring forward has no 02:00; fall back
      // has 02:00 twice. Grouping in blocks of 24 would move the next
      // day's first hour into the short day and its last into the long one.
      const springForward = hoursOf("2026-03-29", [0, 1, ...range(3, 23)]); // 23 h
      const nextDay = hoursOf("2026-03-30", range(0, 23));
      const fallBack = hoursOf("2025-10-26", [0, 1, 2, 2, ...range(3, 23)]); // 25 h
      const dayAfter = hoursOf("2025-10-27", range(0, 23));

      const spring = await depthsFor(["2026-03-29", "2026-03-30"], {
        time: [...springForward, ...nextDay],
        snow_depth: [
          ...springForward.map(() => 0.4),
          0.1, // first hour of the 30th: must not count for the 29th
          ...nextDay.slice(1).map(() => 0.3),
        ],
      });
      expect(spring).toEqual([40, 10]);

      fetchMock.mockReset();
      const fall = await depthsFor(["2025-10-26", "2025-10-27"], {
        time: [...fallBack, ...dayAfter],
        snow_depth: [
          ...fallBack.slice(0, -1).map(() => 0.4),
          0.05, // 25th hour of the 26th: must not count for the 27th
          ...dayAfter.map(() => 0.3),
        ],
      });
      expect(fall).toEqual([5, 30]);
    });

    it("skips null hours, and is null when a date has no values", async () => {
      const depths = await depthsFor(["2026-01-10", "2026-01-11"], {
        time: [
          ...hoursOf("2026-01-10", [0, 1]),
          ...hoursOf("2026-01-11", [0, 1]),
        ],
        snow_depth: [null, 0.2, null, null],
      });

      expect(depths).toEqual([20, null]);
    });

    it("is null when the response has no hourly values", async () => {
      const depths = await depthsFor(["2026-01-10"], {
        time: [],
        snow_depth: [],
      });

      expect(depths).toEqual([null]);
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
