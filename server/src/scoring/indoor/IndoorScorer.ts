import type {
  ActivityScorer,
  DailyWeather,
  DayScore,
} from "../../domain/types.js";
import type { OutdoorScorer } from "../outdoor/OutdoorScorer.js";
import { indoorConfig, type IndoorConfig } from "./config.js";

export class IndoorScorer implements ActivityScorer {
  readonly activity = "INDOOR_SIGHTSEEING";
  private readonly config: IndoorConfig = indoorConfig;

  constructor(private readonly outdoor: OutdoorScorer) {}

  scoreDay(day: DailyWeather): DayScore {
    const { score: outdoor, gate } = this.outdoor.assess(day);

    // Getting there is the problem, not the museum.
    if (gate?.kind === "wind") {
      return {
        date: day.date,
        score: 0,
        factors: [],
        gate: `Dangerous wind: risky to travel (${gate.detail})`,
      };
    }

    // subScore = 1 − outdoor/100. Outdoors ruled out (heat, cold, washout)
    // counts as outdoor 0; unknown outdoors adds nothing to the baseline.
    let subScore: number;
    let detail: string;
    if (gate) {
      subScore = 1;
      detail = `outdoor ruled out (${outdoor.gate})`;
    } else if (outdoor.score === null) {
      subScore = 0;
      detail = "outdoor conditions unknown";
    } else {
      subScore = 1 - outdoor.score / 100;
      detail = `outdoor score ${outdoor.score}`;
    }

    const { baseline, weatherBonus } = this.config;
    const score = baseline + weatherBonus * subScore;

    return {
      date: day.date,
      score: Math.round(score * 10) / 10,
      factors: [
        {
          name: "Weather outside",
          subScore,
          // So that 100 − weight × (1 − subScore) × 100 = score.
          weight: weatherBonus / 100,
          detail,
        },
      ],
    };
  }
}
