import type { DailyWeather } from "../../domain/types.js";

// Real days from Open-Meteo's Historical Forecast API, so they don't change
// between runs. Each one can be refetched with:
//
// curl -s "https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=LAT&longitude=LON&daily=apparent_temperature_max,precipitation_sum,precipitation_hours,wind_speed_10m_max,wind_gusts_10m_max,sunshine_duration,daylight_duration,weather_code&timezone=auto&start_date=DATE&end_date=DATE"

/** Lisbon 38.72, -9.14. The worked example in ai-sessions/outdoor-scoring.txt. */
export const lisbonClear: DailyWeather = {
  date: "2026-10-15",
  apparentTemperatureMax: 29.6,
  precipitationSum: 0,
  precipitationHours: 0,
  windSpeedMax: 9.2,
  windGustsMax: 24.8,
  sunshineDuration: 39260.56,
  daylightDuration: 40376.02,
  weatherCode: 1,
};

/** Miami 25.77, -80.19. Thunderstorm, little rain. */
export const miamiThunderstorm: DailyWeather = {
  date: "2025-06-10",
  apparentTemperatureMax: 36.8,
  precipitationSum: 7.2,
  precipitationHours: 1,
  windSpeedMax: 17.6,
  windGustsMax: 29.2,
  sunshineDuration: 32710.45,
  daylightDuration: 49388.0,
  weatherCode: 95,
};

/** Miami 25.77, -80.19. 88 mm in 3 h: heavy but short, so not a washout. */
export const miamiShortDownpour: DailyWeather = {
  date: "2026-07-01",
  apparentTemperatureMax: 39.3,
  precipitationSum: 88.2,
  precipitationHours: 3,
  windSpeedMax: 14.0,
  windGustsMax: 18.7,
  sunshineDuration: 28982.12,
  daylightDuration: 49391.82,
  weatherCode: 95,
};

/** Miami 25.77, -80.19. 68 mm over 7 h: heavy-rain washout. */
export const miamiHeavyRain: DailyWeather = {
  date: "2025-06-02",
  apparentTemperatureMax: 38.5,
  precipitationSum: 68.1,
  precipitationHours: 7,
  windSpeedMax: 19.8,
  windGustsMax: 40.7,
  sunshineDuration: 26660.94,
  daylightDuration: 49163.25,
  weatherCode: 80,
};

/** Bergen 60.39, 5.32. Only 5.9 mm, but over 12 h: all-day drizzle washout. */
export const bergenDrizzle: DailyWeather = {
  date: "2025-10-06",
  apparentTemperatureMax: 10.0,
  precipitationSum: 5.9,
  precipitationHours: 12,
  windSpeedMax: 24.5,
  windGustsMax: 43.2,
  sunshineDuration: 0,
  daylightDuration: 39511.07,
  weatherCode: 61,
};

/** Wellington -41.29, 174.78. Gusts over the gate, nothing else gated. */
export const wellingtonGusts: DailyWeather = {
  date: "2025-01-06",
  apparentTemperatureMax: 10.1,
  precipitationSum: 1.1,
  precipitationHours: 8,
  windSpeedMax: 47.7,
  windGustsMax: 102.6,
  sunshineDuration: 19809.14,
  daylightDuration: 54059.99,
  weatherCode: 51,
};

/** Galway 53.27, -9.05. Storm Éowyn: gusts, sustained wind and washout all gate. */
export const galwayStormEowyn: DailyWeather = {
  date: "2025-01-24",
  apparentTemperatureMax: 5.8,
  precipitationSum: 10.8,
  precipitationHours: 16,
  windSpeedMax: 79.9,
  windGustsMax: 172.4,
  sunshineDuration: 6984.46,
  daylightDuration: 30737.3,
  weatherCode: 63,
};

/** Kuwait City 29.38, 47.99. Above the 45 °C heat gate. */
export const kuwaitHeat: DailyWeather = {
  date: "2026-07-13",
  apparentTemperatureMax: 46.8,
  precipitationSum: 0,
  precipitationHours: 0,
  windSpeedMax: 16.6,
  windGustsMax: 34.2,
  sunshineDuration: 44889.29,
  daylightDuration: 49943.96,
  weatherCode: 0,
};

/** Yakutsk 62.03, 129.73. Far below the −10 °C cold gate. */
export const yakutskCold: DailyWeather = {
  date: "2026-01-10",
  apparentTemperatureMax: -46.7,
  precipitationSum: 0,
  precipitationHours: 0,
  windSpeedMax: 8.5,
  windGustsMax: 15.8,
  sunshineDuration: 18000.0,
  daylightDuration: 20934.22,
  weatherCode: 3,
};

/** Tromsø 69.65, 18.96. Polar night: daylight_duration is 0. */
export const tromsoPolarNight: DailyWeather = {
  date: "2025-12-20",
  apparentTemperatureMax: 0.5,
  precipitationSum: 2.5,
  precipitationHours: 5,
  windSpeedMax: 11.2,
  windGustsMax: 15.5,
  sunshineDuration: 0,
  daylightDuration: 0,
  weatherCode: 55,
};
