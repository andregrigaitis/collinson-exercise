import type { DailyWeather } from "../../domain/types.js";

// Real days from Open-Meteo's Historical Forecast API (they don't change).
// snowDepthMin is the lowest hourly snow_depth of the local date, in cm.
// Refetch one with:
//
// curl -s "https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=LAT&longitude=LON&daily=apparent_temperature_max,precipitation_sum,precipitation_hours,wind_speed_10m_max,wind_gusts_10m_max,sunshine_duration,daylight_duration,weather_code,snowfall_sum,rain_sum,temperature_2m_max&hourly=snow_depth&timezone=auto&start_date=DATE&end_date=DATE"
//
// The cold gate reuses yakutskCold from ../outdoor/fixtures.ts (19 cm base, −41.6 °C).

/** Chamonix 45.9237, 6.8694. Valley base 3 cm: thin-base gate. */
export const chamonixThinBase: DailyWeather = {
  date: "2026-01-05",
  apparentTemperatureMax: -6.2,
  precipitationSum: 0.0,
  precipitationHours: 0.0,
  windSpeedMax: 7.7,
  windGustsMax: 15.8,
  sunshineDuration: 31001.98,
  daylightDuration: 31672.61,
  weatherCode: 3,
  snowfallSum: 0.0,
  rainSum: 0.0,
  temperatureMax: -2.3,
  snowDepthMin: 3.0,
};

/** Chamonix. 17.7 mm rain at 3.5 °C, base exactly 10 cm: gated by the inclusive thin-base gate. */
export const chamonixRain: DailyWeather = {
  date: "2026-01-08",
  apparentTemperatureMax: 0.3,
  precipitationSum: 24.8,
  precipitationHours: 19.0,
  windSpeedMax: 17.1,
  windGustsMax: 38.9,
  sunshineDuration: 0.0,
  daylightDuration: 31911.86,
  weatherCode: 73,
  snowfallSum: 1.61,
  rainSum: 17.7,
  temperatureMax: 3.5,
  snowDepthMin: 10.0,
};

/** Chamonix. 10.4 cm fresh snow, −1.8 °C, 20 cm base: best day of the month. */
export const chamonixPowder: DailyWeather = {
  date: "2026-01-10",
  apparentTemperatureMax: -6.2,
  precipitationSum: 16.7,
  precipitationHours: 23.0,
  windSpeedMax: 19.0,
  windGustsMax: 40.3,
  sunshineDuration: 0.0,
  daylightDuration: 32093.82,
  weatherCode: 86,
  snowfallSum: 10.36,
  rainSum: 0.0,
  temperatureMax: -1.8,
  snowDepthMin: 20.0,
};

/** Zermatt 46.0207, 7.7491. No new snow, −5.9 °C, 42 cm base, calm. */
export const zermattCalm: DailyWeather = {
  date: "2026-01-05",
  apparentTemperatureMax: -9.8,
  precipitationSum: 0.0,
  precipitationHours: 0.0,
  windSpeedMax: 5.4,
  windGustsMax: 9.0,
  sunshineDuration: 30956.21,
  daylightDuration: 31630.55,
  weatherCode: 3,
  snowfallSum: 0.0,
  rainSum: 0.0,
  temperatureMax: -5.9,
  snowDepthMin: 42.0,
};

/** Zermatt. Clear day after the storm, −2.1 °C, 54 cm base. */
export const zermattAfterStorm: DailyWeather = {
  date: "2026-01-11",
  apparentTemperatureMax: -5.9,
  precipitationSum: 0.0,
  precipitationHours: 1.0,
  windSpeedMax: 17.2,
  windGustsMax: 32.0,
  sunshineDuration: 31488.3,
  daylightDuration: 32151.02,
  weatherCode: 71,
  snowfallSum: 0.0,
  rainSum: 0.0,
  temperatureMax: -2.1,
  snowDepthMin: 54.0,
};

/** Zermatt. 8.8 °C max: soft snow. */
export const zermattWarm: DailyWeather = {
  date: "2026-01-13",
  apparentTemperatureMax: 4.7,
  precipitationSum: 0.0,
  precipitationHours: 0.0,
  windSpeedMax: 9.2,
  windGustsMax: 17.3,
  sunshineDuration: 26782.5,
  daylightDuration: 32357.76,
  weatherCode: 3,
  snowfallSum: 0.0,
  rainSum: 0.0,
  temperatureMax: 8.8,
  snowDepthMin: 45.0,
};

/** Cairngorm 57.11, -3.64. 21.7 cm fresh snow, but gusts 73.8 km/h. */
export const cairngormGusts: DailyWeather = {
  date: "2026-01-03",
  apparentTemperatureMax: -15.8,
  precipitationSum: 32.3,
  precipitationHours: 24.0,
  windSpeedMax: 41.8,
  windGustsMax: 73.8,
  sunshineDuration: 0.0,
  daylightDuration: 24793.42,
  weatherCode: 75,
  snowfallSum: 21.7,
  rainSum: 1.5,
  temperatureMax: -7.4,
  snowDepthMin: 12.0,
};

/** Tignes 45.4683, 6.9056. Thunderstorm (code 96) with a 115 cm base. */
export const tignesThunderstorm: DailyWeather = {
  date: "2025-05-04",
  apparentTemperatureMax: 4.6,
  precipitationSum: 15.3,
  precipitationHours: 18.0,
  windSpeedMax: 11.3,
  windGustsMax: 18.7,
  sunshineDuration: 3460.35,
  daylightDuration: 52018.34,
  weatherCode: 96,
  snowfallSum: 0.0,
  rainSum: 14.2,
  temperatureMax: 6.4,
  snowDepthMin: 115.0,
};

/**
 * Real daily minimum depths (cm) for whole weeks, for the applicability rule.
 * notApplicable only reads snowDepthMin, so the other fields are left null.
 */
function depthWeek(depths: [date: string, cm: number | null][]): DailyWeather[] {
  return depths.map(([date, snowDepthMin]) => ({
    date,
    apparentTemperatureMax: null,
    precipitationSum: null,
    precipitationHours: null,
    windSpeedMax: null,
    windGustsMax: null,
    sunshineDuration: null,
    daylightDuration: null,
    weatherCode: null,
    snowfallSum: null,
    rainSum: null,
    temperatureMax: null,
    snowDepthMin,
  }));
}

/** Lisbon 38.72, -9.14, 8–14 Jan 2026: no snow at all. */
export const lisbonJanuaryWeek = depthWeek([
  ["2026-01-08", 0.0],
  ["2026-01-09", 0.0],
  ["2026-01-10", 0.0],
  ["2026-01-11", 0.0],
  ["2026-01-12", 0.0],
  ["2026-01-13", 0.0],
  ["2026-01-14", 0.0],
]);

/** Chamonix, 13–19 Oct 2025: off-season, no snow. */
export const chamonixOctoberWeek = depthWeek([
  ["2025-10-13", 0.0],
  ["2025-10-14", 0.0],
  ["2025-10-15", 0.0],
  ["2025-10-16", 0.0],
  ["2025-10-17", 0.0],
  ["2025-10-18", 0.0],
  ["2025-10-19", 0.0],
]);

/** Niseko 42.8048, 140.6874 (134 m), 8–14 Jan 2026: deep snow at low elevation. */
export const nisekoJanuaryWeek = depthWeek([
  ["2026-01-08", 47.0],
  ["2026-01-09", 59.0],
  ["2026-01-10", 56.0],
  ["2026-01-11", 47.0],
  ["2026-01-12", 52.0],
  ["2026-01-13", 69.0],
  ["2026-01-14", 78.0],
]);
