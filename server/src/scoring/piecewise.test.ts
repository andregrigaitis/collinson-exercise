import { describe, expect, it } from "vitest";
import { piecewise, type Curve } from "./piecewise.js";

const temperature: Curve = [
  [-10, 0],
  [18, 1],
  [26, 1],
  [35, 0.3],
  [45, 0],
];

describe("piecewise", () => {
  it("returns y exactly at each point", () => {
    for (const [x, y] of temperature) {
      expect(piecewise(temperature, x)).toBe(y);
    }
  });

  it("interpolates linearly between points", () => {
    expect(piecewise(temperature, 4)).toBeCloseTo(0.5);
    expect(piecewise(temperature, 22)).toBe(1);
    expect(piecewise(temperature, 40)).toBeCloseTo(0.15);
  });

  it("clamps outside the curve to the first/last y", () => {
    expect(piecewise(temperature, -30)).toBe(0);
    expect(piecewise(temperature, 60)).toBe(0);
  });

  it("matches the Lisbon worked example in DECISIONS.md", () => {
    expect(piecewise(temperature, 29.6)).toBeCloseTo(0.72);
  });
});
