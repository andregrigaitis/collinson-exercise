import type {
  ActivityScorer,
  DailyMarine,
  DailyWeather,
  DayScore,
  ScoreFactor,
} from "../../domain/types.js";
import { piecewise } from "../piecewise.js";
import { surfConfig, type SurfConfig } from "./config.js";

interface SurfInputs {
  swellHeight: number;
  swellPeriod: number;
  windSpeed: number;
  weatherCode: number;
}

export class SurfScorer implements ActivityScorer {
  readonly activity = "SURFING";
  private readonly config: SurfConfig = surfConfig;

  notApplicable(marine: DailyMarine[] | null): string | null {
    if (marine === null) return "Sea forecast unavailable right now";
    const noSea = marine.every(
      (day) => day.swellWaveHeightMax === null && day.swellWavePeriodMax === null,
    );
    return noSea ? "No sea nearby" : null;
  }

  scoreDay(day: DailyWeather, marine?: DailyMarine): DayScore {
    const fields = {
      "swell height": marine?.swellWaveHeightMax ?? null,
      "swell period": marine?.swellWavePeriodMax ?? null,
      "wind speed": day.windSpeedMax,
      "weather code": day.weatherCode,
    };
    const missing = Object.entries(fields)
      .filter(([, value]) => value === null)
      .map(([label]) => label);
    if (missing.length > 0) {
      return {
        date: day.date,
        score: null,
        factors: [],
        missingData: `Missing forecast data: ${missing.join(", ")}`,
      };
    }

    const inputs: SurfInputs = {
      swellHeight: fields["swell height"]!,
      swellPeriod: fields["swell period"]!,
      windSpeed: fields["wind speed"]!,
      weatherCode: fields["weather code"]!,
    };
    const factors = this.factors(inputs);
    const gate = this.gate(inputs);
    if (gate) {
      return { date: day.date, score: 0, factors, gate };
    }

    let score = factors.reduce((sum, f) => sum + f.weight * f.subScore, 0);

    const { codes, factor } = this.config.thunderstorm;
    const thunderstorm =
      inputs.weatherCode >= codes.min && inputs.weatherCode <= codes.max;
    if (thunderstorm) score *= factor;

    return {
      date: day.date,
      score: Math.round(score * 1000) / 10,
      factors,
      ...(thunderstorm && { penalty: `Thunderstorm ×${factor}` }),
    };
  }

  private factors(inputs: SurfInputs): ScoreFactor[] {
    const { weights, curves } = this.config;
    return [
      {
        name: "Swell height",
        subScore: piecewise(curves.height, inputs.swellHeight),
        weight: weights.height,
        detail: `${inputs.swellHeight.toFixed(2)} m swell`,
      },
      {
        name: "Swell period",
        subScore: piecewise(curves.period, inputs.swellPeriod),
        weight: weights.period,
        detail: `${inputs.swellPeriod.toFixed(1)} s period`,
      },
      {
        name: "Wind",
        subScore: piecewise(curves.wind, inputs.windSpeed),
        weight: weights.wind,
        detail: `wind ${inputs.windSpeed} km/h`,
      },
    ];
  }

  /** First unfeasible condition found, most dangerous first. */
  private gate(inputs: SurfInputs): string | undefined {
    const { gates } = this.config;

    if (inputs.swellHeight >= gates.tooBig) {
      return `Waves too big: ${inputs.swellHeight.toFixed(2)} m swell`;
    }
    if (inputs.windSpeed >= gates.wind) {
      return `Too windy: wind ${inputs.windSpeed} km/h`;
    }
    if (inputs.swellHeight <= gates.flat) {
      return `Flat: ${inputs.swellHeight.toFixed(2)} m swell`;
    }
    return undefined;
  }
}
