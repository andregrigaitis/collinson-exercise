import type {
  ActivityScorer,
  DailyWeather,
  DayScore,
  ForecastWeek,
  ScoreFactor,
} from "../../domain/types.js";
import { piecewise } from "../piecewise.js";
import { skiConfig, type SkiConfig } from "./config.js";

const REQUIRED_FIELDS = {
  snowDepthMin: "snow depth",
  snowfallSum: "snowfall",
  temperatureMax: "temperature",
  windGustsMax: "wind gusts",
  rainSum: "rain",
  weatherCode: "weather code",
} as const satisfies Partial<Record<keyof DailyWeather, string>>;

type SkiField = keyof typeof REQUIRED_FIELDS;
type SkiInputs = { [K in SkiField]: number };

export class SkiScorer implements ActivityScorer {
  readonly activity = "SKIING";
  private readonly config: SkiConfig = skiConfig;

  /**
   * Not applicable only when every day has a known base at or below the
   * thin-base gate. A null depth is missing data, not "no snow".
   */
  notApplicable({ weather }: ForecastWeek): string | null {
    const { thinBase } = this.config.gates;
    const noSnow = weather.every(
      (day) => day.snowDepthMin !== null && day.snowDepthMin <= thinBase,
    );
    return noSnow ? "No snow on the ground this week" : null;
  }

  scoreDay(day: DailyWeather): DayScore {
    const missing = (Object.keys(REQUIRED_FIELDS) as SkiField[])
      .filter((field) => day[field] === null)
      .map((field) => REQUIRED_FIELDS[field]);
    if (missing.length > 0) {
      return {
        date: day.date,
        score: null,
        factors: [],
        missingData: `Missing forecast data: ${missing.join(", ")}`,
      };
    }

    const inputs = day as DailyWeather & SkiInputs;
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

  private factors(day: SkiInputs): ScoreFactor[] {
    const { weights, curves } = this.config;
    return [
      {
        name: "Fresh snow",
        subScore: piecewise(curves.freshSnow, day.snowfallSum),
        weight: weights.freshSnow,
        detail: `${day.snowfallSum} cm fresh snow`,
      },
      {
        name: "Temperature",
        subScore: piecewise(curves.temperature, day.temperatureMax),
        weight: weights.temperature,
        detail: `${day.temperatureMax} °C max`,
      },
      {
        name: "Base",
        subScore: piecewise(curves.base, day.snowDepthMin),
        weight: weights.base,
        detail: `${day.snowDepthMin} cm base`,
      },
      {
        name: "Wind",
        subScore: piecewise(curves.gusts, day.windGustsMax),
        weight: weights.wind,
        detail: `gusts ${day.windGustsMax} km/h`,
      },
      {
        name: "Rain",
        subScore: piecewise(curves.rain, day.rainSum),
        weight: weights.rain,
        detail: `${day.rainSum} mm rain`,
      },
    ];
  }

  /** First unfeasible condition found, most dangerous first. */
  private gate(day: SkiInputs): string | undefined {
    const { gates } = this.config;

    if (day.windGustsMax >= gates.gusts) {
      return `Dangerous wind: gusts ${day.windGustsMax} km/h`;
    }
    if (day.temperatureMax <= gates.cold) {
      return `Extreme cold: ${day.temperatureMax} °C max`;
    }
    if (day.snowDepthMin <= gates.thinBase) {
      return `Not enough snow: ${day.snowDepthMin} cm base`;
    }
    return undefined;
  }
}
