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
] as const;

type DailyVariable = (typeof DAILY_VARIABLES)[number];

// Open-Meteo returns daily data as parallel arrays, one per variable.
interface OpenMeteoForecastResponse {
  daily: { time: string[] } & Record<DailyVariable, (number | null)[]>;
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
    url.searchParams.set("forecast_days", String(days));
    // Dates and daily boundaries in the location's own timezone.
    url.searchParams.set("timezone", "auto");

    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      throw new Error(
        `Open-Meteo forecast request failed: ${response.status} ${response.statusText}`,
      );
    }

    const { daily } = (await response.json()) as OpenMeteoForecastResponse;
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
    }));
  }
}
