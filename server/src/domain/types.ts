export interface Location {
  id: string;
  name: string;
  country?: string;
  region?: string;
  latitude: number;
  longitude: number;
}

/**
 * One day of forecast, local to the location. Units follow Open-Meteo's
 * defaults. null means Open-Meteo had no value; the scorer decides what to do.
 */
export interface DailyWeather {
  /** YYYY-MM-DD, location's local date. */
  date: string;
  /** °C */
  apparentTemperatureMax: number | null;
  /** mm */
  precipitationSum: number | null;
  /** hours */
  precipitationHours: number | null;
  /** km/h, at 10 m */
  windSpeedMax: number | null;
  /** km/h, at 10 m */
  windGustsMax: number | null;
  /** seconds */
  sunshineDuration: number | null;
  /** seconds */
  daylightDuration: number | null;
  /** WMO code, worst condition of the day */
  weatherCode: number | null;
}
