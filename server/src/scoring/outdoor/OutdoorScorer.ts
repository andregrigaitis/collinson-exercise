import type { DailyWeather, DayScore, ScoreFactor } from "../../domain/types.js";
import { outdoorConfig, type OutdoorConfig } from "./config.js";
import { piecewise } from "../piecewise.js";

const REQUIRED_FIELDS = {
  apparentTemperatureMax: "feels-like temperature",
  precipitationSum: "precipitation",
  precipitationHours: "precipitation hours",
  windSpeedMax: "wind speed",
  windGustsMax: "wind gusts",
  sunshineDuration: "sunshine duration",
  daylightDuration: "daylight duration",
  weatherCode: "weather code",
} as const satisfies Partial<Record<keyof DailyWeather, string>>;

type CompleteDay = {
  [K in keyof DailyWeather]: NonNullable<DailyWeather[K]>;
};

export class OutdoorScorer {
  private readonly config: OutdoorConfig = outdoorConfig;

  scoreDay(day: DailyWeather): DayScore {
    const missing = Object.entries(REQUIRED_FIELDS)
      .filter(([field]) => day[field as keyof DailyWeather] === null)
      .map(([, label]) => label);
    if (missing.length > 0) {
      return {
        date: day.date,
        score: null,
        factors: [],
        missingData: `Missing forecast data: ${missing.join(", ")}`,
      };
    }

    const complete = day as CompleteDay;
    const factors = this.factors(complete);
    const gate = this.gate(complete);
    if (gate) {
      return { date: day.date, score: 0, factors, gate };
    }

    let score = factors.reduce((sum, f) => sum + f.weight * f.subScore, 0);

    const { codes, factor } = this.config.thunderstorm;
    const thunderstorm =
      complete.weatherCode >= codes.min && complete.weatherCode <= codes.max;
    if (thunderstorm) score *= factor;

    return {
      date: day.date,
      score: Math.round(score * 1000) / 10,
      factors,
      ...(thunderstorm && { penalty: `Thunderstorm ×${factor}` }),
    };
  }

  private factors(day: CompleteDay): ScoreFactor[] {
    const { weights, curves } = this.config;

    const rain =
      piecewise(curves.rainHours, day.precipitationHours) *
      piecewise(curves.rainAmount, day.precipitationSum);

    // Polar night: no daylight means no sunshine signal, so use the floor.
    const sunshineRatio =
      day.daylightDuration > 0 ? day.sunshineDuration / day.daylightDuration : 0;

    return [
      {
        name: "Rain",
        subScore: rain,
        weight: weights.rain,
        detail: `${day.precipitationSum} mm over ${day.precipitationHours} h`,
      },
      {
        name: "Temperature",
        subScore: piecewise(curves.temperature, day.apparentTemperatureMax),
        weight: weights.temperature,
        detail: `${day.apparentTemperatureMax} °C feels-like`,
      },
      {
        name: "Wind",
        subScore: piecewise(curves.gusts, day.windGustsMax),
        weight: weights.wind,
        detail: `gusts ${day.windGustsMax} km/h`,
      },
      {
        name: "Sunshine",
        subScore: piecewise(curves.sunshine, sunshineRatio),
        weight: weights.sunshine,
        detail: `${Math.round(sunshineRatio * 100)}% of daylight`,
      },
    ];
  }

  /** First unsafe condition found, most dangerous first. */
  private gate(day: CompleteDay): string | undefined {
    const { gates } = this.config;

    if (day.windGustsMax >= gates.gusts) {
      return `Dangerous wind: gusts ${day.windGustsMax} km/h`;
    }
    if (day.windSpeedMax >= gates.sustainedWind) {
      return `Dangerous wind: sustained ${day.windSpeedMax} km/h`;
    }
    if (day.apparentTemperatureMax >= gates.heat) {
      return `Extreme heat: ${day.apparentTemperatureMax} °C feels-like`;
    }
    if (day.apparentTemperatureMax <= gates.cold) {
      return `Extreme cold: ${day.apparentTemperatureMax} °C feels-like`;
    }
    if (day.precipitationHours >= gates.washoutHours) {
      return `Washout: rain for ${day.precipitationHours} h`;
    }
    if (
      day.precipitationSum >= gates.heavyRain.mm &&
      day.precipitationHours >= gates.heavyRain.hours
    ) {
      return `Washout: ${day.precipitationSum} mm over ${day.precipitationHours} h`;
    }
    return undefined;
  }
}
