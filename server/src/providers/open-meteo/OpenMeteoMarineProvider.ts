import type { DailyMarine } from "../../domain/types.js";

const DAILY_VARIABLES = [
  "swell_wave_height_max",
  "swell_wave_period_max",
] as const;

type DailyVariable = (typeof DAILY_VARIABLES)[number];

// Same shape as the Forecast API: parallel arrays, one per variable.
interface OpenMeteoMarineResponse {
  daily: { time: string[] } & Record<DailyVariable, (number | null)[]>;
}

export class OpenMeteoMarineProvider {
  private readonly baseURL = "https://marine-api.open-meteo.com/v1/marine";

  async daily(latitude: number, longitude: number): Promise<DailyMarine[]> {
    const url = new URL(this.baseURL);
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set("daily", DAILY_VARIABLES.join(","));
    url.searchParams.set("forecast_days", "7");
    url.searchParams.set("timezone", "auto");
    // Same as the default in every test, but the docs describe the default
    // differently, so don't rely on it.
    url.searchParams.set("cell_selection", "sea");

    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      throw new Error(
        `Open-Meteo marine request failed: ${response.status} ${response.statusText}`,
      );
    }

    const { daily } = (await response.json()) as OpenMeteoMarineResponse;
    const value = (variable: DailyVariable, i: number) =>
      daily[variable]?.[i] ?? null;

    return daily.time.map((date, i) => ({
      date,
      swellWaveHeightMax: value("swell_wave_height_max", i),
      swellWavePeriodMax: value("swell_wave_period_max", i),
    }));
  }
}
