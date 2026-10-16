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

export interface ScoreFactor {
  name: string;
  /** 0–1, unrounded */
  subScore: number;
  /** Share of the weighted sum, e.g. 0.4 */
  weight: number;
  /** Short explanation for the UI, e.g. "29.6 °C feels-like" */
  detail: string;
}

export interface DayScore {
  date: string;
  /** 0–100, one decimal. 0 when gated, null when it can't be scored. */
  score: number | null;
  /** Empty when the day can't be scored. */
  factors: ScoreFactor[];
  /** Why the day is unsafe, e.g. "Dangerous wind: gusts 95 km/h" */
  gate?: string;
  /** e.g. "Thunderstorm ×0.75" */
  penalty?: string;
  /** Why the day can't be scored, e.g. "Missing forecast data: sunshine duration" */
  missingData?: string;
}

export type Activity =
  | "SKIING"
  | "SURFING"
  | "OUTDOOR_SIGHTSEEING"
  | "INDOOR_SIGHTSEEING";

/** Scores one activity, one day at a time. */
export interface ActivityScorer {
  readonly activity: Activity;
  scoreDay(day: DailyWeather): DayScore;
}

export interface ActivityForecast {
  activity: Activity;
  applicable: boolean;
  /** Why the activity isn't applicable. Always null for now. */
  reason: string | null;
  /** Date with the highest score, null if no day could be scored. */
  bestDate: string | null;
  /** In date order. */
  days: DayScore[];
}
