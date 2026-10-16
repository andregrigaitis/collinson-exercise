import type { DailyWeather } from "../../domain/types.js";

const DAILY_VARIABLES = [
  "apparent_temperature_max",
  "precipitation_sum",
  "precipitation_hours",
  "wind_speed_10m_max",
  "wind_gusts_10m_max",
  "sunshine_duration",
  "daylight_duration",
  "weather_code",
  "snowfall_sum",
  "rain_sum",
  "temperature_2m_max",
] as const;

type DailyVariable = (typeof DAILY_VARIABLES)[number];

// Open-Meteo returns data as parallel arrays, one per variable.
interface OpenMeteoForecastResponse {
  daily: { time: string[] } & Record<DailyVariable, (number | null)[]>;
  /** snow_depth only exists as hourly data, in metres. */
  hourly?: { time: string[]; snow_depth?: (number | null)[] };
}

/**
 * Lowest snow depth per local date, in cm. Hours are grouped by their
 * YYYY-MM-DD prefix rather than in blocks of 24, so a 23- or 25-hour DST day
 * would still land on the right date. Null hours are skipped; a date with no
 * values at all is null.
 */
function minSnowDepthByDate(
  hourly: OpenMeteoForecastResponse["hourly"],
): Map<string, number> {
  const minByDate = new Map<string, number>();
  hourly?.time.forEach((time, i) => {
    const depth = hourly.snow_depth?.[i];
    if (depth === null || depth === undefined) return;
    const date = time.slice(0, 10);
    const current = minByDate.get(date);
    if (current === undefined || depth < current) minByDate.set(date, depth);
  });
  // m → cm, rounded so 0.29 m is 29 cm and not 28.999999999999996.
  for (const [date, metres] of minByDate) {
    minByDate.set(date, Math.round(metres * 1000) / 10);
  }
  return minByDate;
}

export class OpenMeteoForecastProvider {
  private readonly baseURL = "https://api.open-meteo.com/v1/forecast";

  async daily(
    latitude: number,
    longitude: number,
    days = 7,
  ): Promise<DailyWeather[]> {
    const url = new URL(this.baseURL);
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set("daily", DAILY_VARIABLES.join(","));
    url.searchParams.set("hourly", "snow_depth");
    url.searchParams.set("forecast_days", String(days));
    // Dates and daily boundaries in the location's own timezone.
    url.searchParams.set("timezone", "auto");

    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      throw new Error(
        `Open-Meteo forecast request failed: ${response.status} ${response.statusText}`,
      );
    }

    const { daily, hourly } =
      (await response.json()) as OpenMeteoForecastResponse;
    const snowDepth = minSnowDepthByDate(hourly);
    const value = (variable: DailyVariable, i: number) =>
      daily[variable]?.[i] ?? null;

    return daily.time.map((date, i) => ({
      date,
      apparentTemperatureMax: value("apparent_temperature_max", i),
      precipitationSum: value("precipitation_sum", i),
      precipitationHours: value("precipitation_hours", i),
      windSpeedMax: value("wind_speed_10m_max", i),
      windGustsMax: value("wind_gusts_10m_max", i),
      sunshineDuration: value("sunshine_duration", i),
      daylightDuration: value("daylight_duration", i),
      weatherCode: value("weather_code", i),
      snowfallSum: value("snowfall_sum", i),
      rainSum: value("rain_sum", i),
      temperatureMax: value("temperature_2m_max", i),
      snowDepthMin: snowDepth.get(date) ?? null,
    }));
  }
}
