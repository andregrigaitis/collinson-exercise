import { describe, expect, it, vi } from "vitest";
import type {
  ActivityScorer,
  DailyMarine,
  DailyWeather,
  DayScore,
} from "../domain/types.js";
import { lisbonWeek } from "../scoring/surf/fixtures.js";
import { SurfScorer } from "../scoring/surf/SurfScorer.js";
import {
  ForecastService,
  ForecastUnavailableError,
  type ForecastProvider,
  type MarineProvider,
} from "./ForecastService.js";

function weather(date: string): DailyWeather {
  return {
    date,
    apparentTemperatureMax: 20,
    precipitationSum: 0,
    precipitationHours: 0,
    windSpeedMax: 10,
    windGustsMax: 20,
    sunshineDuration: 36000,
    daylightDuration: 40000,
    weatherCode: 0,
  };
}

function fakeProvider(dates: string[]): ForecastProvider {
  return { daily: async () => dates.map(weather) };
}

function fakeMarine(days: DailyMarine[] = []): MarineProvider {
  return { daily: async () => days };
}

type FakeScore = number | null | "gated";

/** Scores each date from a fixed table, so tests only exercise the service. */
function fakeScorer(scores: Record<string, FakeScore>): ActivityScorer {
  return {
    activity: "OUTDOOR_SIGHTSEEING",
    scoreDay: (day): DayScore => {
      const score = scores[day.date];
      return score === "gated"
        ? { date: day.date, score: 0, factors: [], gate: "Dangerous wind" }
        : { date: day.date, score, factors: [] };
    },
  };
}

async function forecastFor(scores: Record<string, FakeScore>) {
  const service = new ForecastService(
    fakeProvider(Object.keys(scores)),
    fakeMarine(),
    [fakeScorer(scores)],
  );
  const [result] = await service.activityForecast(0, 0);
  return result;
}

describe("ForecastService", () => {
  describe("bestDate", () => {
    it("picks the day with the highest score", async () => {
      const result = await forecastFor({
        "2026-10-16": 62.5,
        "2026-10-17": 91.2,
        "2026-10-18": 0,
      });

      expect(result.bestDate).toBe("2026-10-17");
    });

    it("ignores days that couldn't be scored", async () => {
      const result = await forecastFor({
        "2026-10-16": null,
        "2026-10-17": 12.4,
        "2026-10-18": null,
      });

      expect(result.bestDate).toBe("2026-10-17");
    });

    it("is null when no day can be scored", async () => {
      const result = await forecastFor({
        "2026-10-16": null,
        "2026-10-17": null,
      });

      expect(result.bestDate).toBeNull();
    });

    it("never picks a gated day", async () => {
      const result = await forecastFor({
        "2026-10-16": "gated",
        "2026-10-17": 0,
      });

      expect(result.bestDate).toBe("2026-10-17");
    });

    it("is null when every day is gated", async () => {
      const result = await forecastFor({
        "2026-10-16": "gated",
        "2026-10-17": "gated",
        "2026-10-18": null,
      });

      expect(result.bestDate).toBeNull();
    });

    it("picks the earliest date on a tie", async () => {
      const result = await forecastFor({
        "2026-10-16": 80,
        "2026-10-17": 80,
      });

      expect(result.bestDate).toBe("2026-10-16");
    });
  });

  it("returns one result per scorer, with days in date order", async () => {
    const service = new ForecastService(
      fakeProvider(["2026-10-18", "2026-10-16", "2026-10-17"]),
      fakeMarine(),
      [fakeScorer({ "2026-10-16": 50, "2026-10-17": 60, "2026-10-18": 70 })],
    );

    const results = await service.activityForecast(0, 0);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      activity: "OUTDOOR_SIGHTSEEING",
      applicable: true,
      reason: null,
    });
    expect(results[0].days.map((d) => d.date)).toEqual([
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
    ]);
  });

  it("wraps provider failures in ForecastUnavailableError", async () => {
    const cause = new Error("Open-Meteo forecast request failed: 502 Bad Gateway");
    const service = new ForecastService(
      { daily: async () => Promise.reject(cause) },
      fakeMarine(),
      [fakeScorer({})],
    );

    const error = await service.activityForecast(0, 0).catch((e) => e);

    expect(error).toBeInstanceOf(ForecastUnavailableError);
    expect(error.cause).toBe(cause);
  });

  describe("marine data", () => {
    const weatherWeek = lisbonWeek.map((d) => d.weather);
    const marineWeek = lisbonWeek.map((d) => d.marine);
    const weatherProvider: ForecastProvider = { daily: async () => weatherWeek };
    const outdoor = fakeScorer(
      Object.fromEntries(weatherWeek.map((d) => [d.date, 50])),
    );

    it("passes each scorer the marine day for the same date", async () => {
      const service = new ForecastService(
        weatherProvider,
        fakeMarine([...marineWeek].reverse()),
        [new SurfScorer()],
      );

      const [surf] = await service.activityForecast(38.72, -9.14);

      expect(surf.applicable).toBe(true);
      expect(surf.days.map((d) => d.score)).toEqual([
        85.0, 85.9, 79.5, 81.0, 96.3, 90.8, 86.5,
      ]);
    });

    it("marks surfing not applicable when there's no sea nearby", async () => {
      const inland = marineWeek.map(({ date }) => ({
        date,
        swellWaveHeightMax: null,
        swellWavePeriodMax: null,
      }));
      const service = new ForecastService(weatherProvider, fakeMarine(inland), [
        new SurfScorer(),
        outdoor,
      ]);

      const [surf, outdoorResult] = await service.activityForecast(40.42, -3.7);

      expect(surf).toEqual({
        activity: "SURFING",
        applicable: false,
        reason: "No sea nearby",
        bestDate: null,
        days: [],
      });
      expect(outdoorResult.applicable).toBe(true);
      expect(outdoorResult.days).toHaveLength(7);
    });

    it("keeps the other activities working when only marine fails", async () => {
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      const service = new ForecastService(
        weatherProvider,
        { daily: async () => Promise.reject(new Error("marine 503")) },
        [new SurfScorer(), outdoor],
      );

      const [surf, outdoorResult] = await service.activityForecast(38.72, -9.14);

      expect(surf).toMatchObject({
        applicable: false,
        reason: "Sea forecast unavailable right now",
        days: [],
      });
      expect(outdoorResult).toMatchObject({ applicable: true, reason: null });
      expect(outdoorResult.days).toHaveLength(7);
      expect(error).toHaveBeenCalled();
      error.mockRestore();
    });
  });
});
