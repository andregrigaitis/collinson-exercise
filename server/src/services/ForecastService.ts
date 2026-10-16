import type {
  ActivityForecast,
  ActivityScorer,
  DailyMarine,
  DailyWeather,
  DayScore,
} from "../domain/types.js";

export interface ForecastProvider {
  /** 7 days of forecast. */
  daily(latitude: number, longitude: number): Promise<DailyWeather[]>;
}

export interface MarineProvider {
  /** 7 days of sea forecast. */
  daily(latitude: number, longitude: number): Promise<DailyMarine[]>;
}

/** The forecast provider failed (network, timeout, bad status). */
export class ForecastUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("Forecast provider failed", options);
    this.name = "ForecastUnavailableError";
  }
}

export class ForecastService {
  constructor(
    private readonly forecastProvider: ForecastProvider,
    private readonly marineProvider: MarineProvider,
    private readonly scorers: ActivityScorer[],
  ) {}

  async activityForecast(
    latitude: number,
    longitude: number,
  ): Promise<ActivityForecast[]> {
    const [weatherResult, marineResult] = await Promise.allSettled([
      this.forecastProvider.daily(latitude, longitude),
      this.marineProvider.daily(latitude, longitude),
    ]);

    if (weatherResult.status === "rejected") {
      throw new ForecastUnavailableError({ cause: weatherResult.reason });
    }

    // Marine only matters for some activities; the rest still work without it.
    let marine: DailyMarine[] | null = null;
    if (marineResult.status === "fulfilled") {
      marine = marineResult.value;
    } else {
      console.error(marineResult.reason);
    }

    const days = [...weatherResult.value].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const marineByDate = new Map(marine?.map((day) => [day.date, day]));

    return this.scorers.map((scorer) => {
      const reason = scorer.notApplicable?.(marine) ?? null;
      if (reason) {
        return {
          activity: scorer.activity,
          applicable: false,
          reason,
          bestDate: null,
          days: [],
        };
      }

      const scores = days.map((day) =>
        scorer.scoreDay(day, marineByDate.get(day.date)),
      );
      return {
        activity: scorer.activity,
        applicable: true,
        reason: null,
        bestDate: bestDate(scores),
        days: scores,
      };
    });
  }
}

/** Highest score wins; on a tie, the earliest date. Gated days never win. */
function bestDate(days: DayScore[]): string | null {
  let best: DayScore | null = null;
  for (const day of days) {
    if (day.score === null || day.gate) continue;
    if (best === null || day.score > (best.score ?? -Infinity)) best = day;
  }
  return best?.date ?? null;
}
