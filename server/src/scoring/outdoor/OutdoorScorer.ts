import type {
  ActivityScorer,
  DailyWeather,
  DayScore,
  ScoreFactor,
} from "../../domain/types.js";
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

export type OutdoorGateKind = "wind" | "heat" | "cold" | "washout";

export interface OutdoorGate {
  kind: OutdoorGateKind;
  /** The value that crossed the gate, e.g. "gusts 102.6 km/h" */
  detail: string;
}

/** The DayScore plus which gate fired, for scorers built on top of outdoor. */
export interface OutdoorAssessment {
  score: DayScore;
  gate?: OutdoorGate;
}

const GATE_LABELS: Record<OutdoorGateKind, string> = {
  wind: "Dangerous wind",
  heat: "Extreme heat",
  cold: "Extreme cold",
  washout: "Washout",
};

export class OutdoorScorer implements ActivityScorer {
  readonly activity = "OUTDOOR_SIGHTSEEING";
  private readonly config: OutdoorConfig = outdoorConfig;

  scoreDay(day: DailyWeather): DayScore {
    return this.assess(day).score;
  }

  assess(day: DailyWeather): OutdoorAssessment {
    const missing = Object.entries(REQUIRED_FIELDS)
      .filter(([field]) => day[field as keyof DailyWeather] === null)
      .map(([, label]) => label);
    if (missing.length > 0) {
      return {
        score: {
          date: day.date,
          score: null,
          factors: [],
          missingData: `Missing forecast data: ${missing.join(", ")}`,
        },
      };
    }

    const complete = day as CompleteDay;
    const factors = this.factors(complete);
    const gate = this.gate(complete);
    if (gate) {
      const reason = `${GATE_LABELS[gate.kind]}: ${gate.detail}`;
      return { score: { date: day.date, score: 0, factors, gate: reason }, gate };
    }

    let score = factors.reduce((sum, f) => sum + f.weight * f.subScore, 0);

    const { codes, factor } = this.config.thunderstorm;
    const thunderstorm =
      complete.weatherCode >= codes.min && complete.weatherCode <= codes.max;
    if (thunderstorm) score *= factor;

    return {
      score: {
        date: day.date,
        score: Math.round(score * 1000) / 10,
        factors,
        ...(thunderstorm && { penalty: `Thunderstorm ×${factor}` }),
      },
    };
  }

  private factors(day: CompleteDay): ScoreFactor[] {
    const { weights, curves } = this.config;

    const rain =
      piecewise(curves.rainHours, day.precipitationHours) *
      piecewise(curves.rainAmount, day.precipitationSum);

    // Polar night: no daylight means no sunshine signal, so use the floor.
    const sunshineRatio =
      day.daylightDuration > 0
        ? day.sunshineDuration / day.daylightDuration
        : 0;

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

  /** First unfeasible condition found, most dangerous first. */
  private gate(day: CompleteDay): OutdoorGate | undefined {
    const { gates } = this.config;

    if (day.windGustsMax >= gates.gusts) {
      return { kind: "wind", detail: `gusts ${day.windGustsMax} km/h` };
    }
    if (day.windSpeedMax >= gates.sustainedWind) {
      return { kind: "wind", detail: `sustained ${day.windSpeedMax} km/h` };
    }
    if (day.apparentTemperatureMax >= gates.heat) {
      return { kind: "heat", detail: `${day.apparentTemperatureMax} °C feels-like` };
    }
    if (day.apparentTemperatureMax <= gates.cold) {
      return { kind: "cold", detail: `${day.apparentTemperatureMax} °C feels-like` };
    }
    if (day.precipitationHours >= gates.washoutHours) {
      return { kind: "washout", detail: `rain for ${day.precipitationHours} h` };
    }
    if (
      day.precipitationSum >= gates.heavyRain.mm &&
      day.precipitationHours >= gates.heavyRain.hours
    ) {
      return {
        kind: "washout",
        detail: `${day.precipitationSum} mm over ${day.precipitationHours} h`,
      };
    }
    return undefined;
  }
}
