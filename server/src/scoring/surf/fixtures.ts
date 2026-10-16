import type { DailyMarine, DailyWeather } from "../../domain/types.js";

// Real days: weather from the Forecast API, sea from the Marine API, same
// coordinates. Past days come from the Historical Forecast API so they don't
// change; refetch one with:
//
// curl -s "https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=LAT&longitude=LON&daily=apparent_temperature_max,precipitation_sum,precipitation_hours,wind_speed_10m_max,wind_gusts_10m_max,sunshine_duration,daylight_duration,weather_code&timezone=auto&start_date=DATE&end_date=DATE"
// curl -s "https://marine-api.open-meteo.com/v1/marine?latitude=LAT&longitude=LON&daily=swell_wave_height_max,swell_wave_period_max&timezone=auto&cell_selection=sea&start_date=DATE&end_date=DATE"

export interface SurfDay {
  weather: DailyWeather;
  marine: DailyMarine;
}

/**
 * Lisbon 38.72, -9.14, 2026-10-16 → 22. Live forecast fetched on 2026-10-16,
 * so it won't match a refetch later. Marine matches ai-sessions/surf-scoring.txt;
 * wind differs slightly because the forecast was updated since that session.
 */
export const lisbonWeek: SurfDay[] = [
  {
    weather: {
      date: "2026-10-16",
      apparentTemperatureMax: 30.9,
      precipitationSum: 0.0,
      precipitationHours: 0.0,
      windSpeedMax: 18.9,
      windGustsMax: 47.2,
      sunshineDuration: 39166.47,
      daylightDuration: 40229.42,
      weatherCode: 3,
    },
    marine: {
      date: "2026-10-16",
      swellWaveHeightMax: 1.02,
      swellWavePeriodMax: 10.55,
    },
  },
  {
    weather: {
      date: "2026-10-17",
      apparentTemperatureMax: 23.6,
      precipitationSum: 0.0,
      precipitationHours: 0.0,
      windSpeedMax: 16.4,
      windGustsMax: 41.4,
      sunshineDuration: 39080.22,
      daylightDuration: 40083.1,
      weatherCode: 3,
    },
    marine: {
      date: "2026-10-17",
      swellWaveHeightMax: 0.96,
      swellWavePeriodMax: 10.0,
    },
  },
  {
    weather: {
      date: "2026-10-18",
      apparentTemperatureMax: 22.0,
      precipitationSum: 0.0,
      precipitationHours: 0.0,
      windSpeedMax: 18.2,
      windGustsMax: 46.8,
      sunshineDuration: 37866.47,
      daylightDuration: 39937.17,
      weatherCode: 3,
    },
    marine: {
      date: "2026-10-18",
      swellWaveHeightMax: 0.94,
      swellWavePeriodMax: 8.95,
    },
  },
  {
    weather: {
      date: "2026-10-19",
      apparentTemperatureMax: 23.8,
      precipitationSum: 0.0,
      precipitationHours: 0.0,
      windSpeedMax: 15.3,
      windGustsMax: 36.7,
      sunshineDuration: 38910.02,
      daylightDuration: 39791.76,
      weatherCode: 2,
    },
    marine: {
      date: "2026-10-19",
      swellWaveHeightMax: 0.5,
      swellWavePeriodMax: 13.8,
    },
  },
  {
    weather: {
      date: "2026-10-20",
      apparentTemperatureMax: 20.3,
      precipitationSum: 0.0,
      precipitationHours: 0.0,
      windSpeedMax: 15.0,
      windGustsMax: 39.6,
      sunshineDuration: 38826.28,
      daylightDuration: 39646.97,
      weatherCode: 3,
    },
    marine: {
      date: "2026-10-20",
      swellWaveHeightMax: 0.66,
      swellWavePeriodMax: 12.7,
    },
  },
  {
    weather: {
      date: "2026-10-21",
      apparentTemperatureMax: 21.4,
      precipitationSum: 0.0,
      precipitationHours: 0.0,
      windSpeedMax: 10.0,
      windGustsMax: 30.8,
      sunshineDuration: 38741.83,
      daylightDuration: 39502.94,
      weatherCode: 2,
    },
    marine: {
      date: "2026-10-21",
      swellWaveHeightMax: 0.66,
      swellWavePeriodMax: 9.95,
    },
  },
  {
    weather: {
      date: "2026-10-22",
      apparentTemperatureMax: 20.6,
      precipitationSum: 0.9,
      precipitationHours: 9.0,
      windSpeedMax: 10.2,
      windGustsMax: 25.6,
      sunshineDuration: 26171.23,
      daylightDuration: 39359.78,
      weatherCode: 45,
    },
    marine: {
      date: "2026-10-22",
      swellWaveHeightMax: 0.88,
      swellWavePeriodMax: 9.0,
    },
  },
];

/** Barcelona 41.38, 2.18. 0.02 m swell: flat. */
export const barcelonaFlat: SurfDay = {
  weather: {
    date: "2025-07-01",
    apparentTemperatureMax: 36.8,
    precipitationSum: 0.0,
    precipitationHours: 0.0,
    windSpeedMax: 14.6,
    windGustsMax: 37.1,
    sunshineDuration: 50460.66,
    daylightDuration: 54418.17,
    weatherCode: 3,
  },
  marine: {
    date: "2025-07-01",
    swellWaveHeightMax: 0.02,
    swellWavePeriodMax: 3.45,
  },
};

/** Lisbon 38.72, -9.14. 2.3 m swell: too big for a beginner. */
export const lisbonTooBig: SurfDay = {
  weather: {
    date: "2025-01-06",
    apparentTemperatureMax: 13.1,
    precipitationSum: 0.1,
    precipitationHours: 1.0,
    windSpeedMax: 16.1,
    windGustsMax: 45.4,
    sunshineDuration: 32665.55,
    daylightDuration: 34499.55,
    weatherCode: 3,
  },
  marine: {
    date: "2025-01-06",
    swellWaveHeightMax: 2.3,
    swellWavePeriodMax: 8.2,
  },
};

/** Tarifa 36.01, -5.60. Rideable swell, but 40.1 km/h wind. */
export const tarifaWind: SurfDay = {
  weather: {
    date: "2025-06-16",
    apparentTemperatureMax: 29.0,
    precipitationSum: 0.0,
    precipitationHours: 0.0,
    windSpeedMax: 40.1,
    windGustsMax: 78.5,
    sunshineDuration: 46800.0,
    daylightDuration: 52560.03,
    weatherCode: 3,
  },
  marine: {
    date: "2025-06-16",
    swellWaveHeightMax: 0.7,
    swellWavePeriodMax: 7.55,
  },
};

/** Cocoa Beach 28.32, -80.61. Small swell and a thunderstorm. */
export const cocoaBeachStorm: SurfDay = {
  weather: {
    date: "2025-08-30",
    apparentTemperatureMax: 38.6,
    precipitationSum: 7.9,
    precipitationHours: 1.0,
    windSpeedMax: 22.2,
    windGustsMax: 31.3,
    sunshineDuration: 32165.16,
    daylightDuration: 45940.03,
    weatherCode: 95,
  },
  marine: {
    date: "2025-08-30",
    swellWaveHeightMax: 0.32,
    swellWavePeriodMax: 8.35,
  },
};
