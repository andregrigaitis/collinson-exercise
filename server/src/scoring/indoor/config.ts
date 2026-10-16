// indoor = baseline + weatherBonus × (1 − outdoor / 100)
export interface IndoorConfig {
  /** Score on a perfect outdoor day: museums are fine whatever the weather. */
  baseline: number;
  /** Extra points as the outdoor score drops; baseline + weatherBonus = 100. */
  weatherBonus: number;
}

export const indoorConfig: IndoorConfig = {
  baseline: 60,
  weatherBonus: 40,
};
