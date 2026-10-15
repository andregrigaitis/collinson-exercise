/** Points [x, y], sorted by x ascending. */
export type Curve = readonly (readonly [x: number, y: number])[];

/**
 * Linear interpolation between the curve's points.
 * Values outside the curve are clamped to the first/last y.
 */
export function piecewise(curve: Curve, x: number): number {
  const [firstX, firstY] = curve[0];
  if (x <= firstX) return firstY;

  for (let i = 1; i < curve.length; i++) {
    const [x1, y1] = curve[i];
    if (x === x1) return y1;
    if (x < x1) {
      const [x0, y0] = curve[i - 1];
      return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
    }
  }

  return curve[curve.length - 1][1];
}
