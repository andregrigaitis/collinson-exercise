import type {
  ActivityForecast,
  ActivityScorer,
  DailyWeather,
  DayScore,
} from "../domain/types.js";

export interface ForecastProvider {
  /** 7 days of forecast. */
  daily(latitude: number, longitude: number): Promise<DailyWeather[]>;
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
    private readonly provider: ForecastProvider,
    private readonly scorers: ActivityScorer[],
  ) {}

  async activityForecast(
    latitude: number,
    longitude: number,
  ): Promise<ActivityForecast[]> {
    let days: DailyWeather[];
    try {
      days = await this.provider.daily(latitude, longitude);
    } catch (cause) {
      throw new ForecastUnavailableError({ cause });
    }

    const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));

    return this.scorers.map((scorer) => {
      const scores = sorted.map((day) => scorer.scoreDay(day));
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
