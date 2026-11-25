import { describe, expect, test } from 'bun:test';
import { add, mul, periods, roots, toCurve } from './analytic.ts';
import { curves } from './ec.ts';
import { models } from './model.ts';

/**
Agreement to `digits` significant figures, or absolutely below 10^−digits for a zero
*/
const near = (got: number, want: number, digits = 9): void => {
  expect(Math.abs(got - want)).toBeLessThanOrEqual(10 ** -digits * Math.max(1, Math.abs(want)));
};

describe('L(E, s) at s = 1 (Cremona; LMFDB)', () => {
  test('11a1: L(1) = 0.2538418609', () => {
    near(models['11a1'].at1[0], 0.2538418609);
  });

  test("37a1: L(1) = 0, L'(1) = 0.3059997738", () => {
    near(models['37a1'].at1[0], 0, 12);
    near(models['37a1'].at1[1], 0.3059997738);
  });

  test("389a1: L(1) = L'(1) = 0, L''(1)/2 = 0.7593165003", () => {
    near(models['389a1'].at1[0], 0, 12);
    near(models['389a1'].at1[1], 0, 10);
    near(models['389a1'].at1[2] / 2, 0.7593165003, 8);
  });
});

describe('the period lattice', () => {
  test('ω1 = 2.99345865 on 37a1 and 2.49021256 on 389a1, by the AGM', () => {
    near(periods(curves['37a1']).w1, 2.99345865, 8);
    near(periods(curves['389a1']).w1, 2.49021256, 8);
  });

  test('11a1 meets its mirror once, 37a1 and 389a1 three times', () => {
    expect(
      [curves['11a1'], curves['37a1'], curves['389a1']].map((curve) => roots(curve).length),
    ).toEqual([1, 3, 3]);
  });

  test('℘ maps a generic z onto the curve: y² + y = x³ − x on 37a1', () => {
    const [x, y] = toCurve(curves['37a1'], [0.7, 0.3], periods(curves['37a1']));
    const residual = add(add(mul(y, y), y), [
      x[0] - mul(mul(x, x), x)[0],
      x[1] - mul(mul(x, x), x)[1],
    ]);
    expect(Math.hypot(...residual)).toBeLessThan(1e-6);
  });
});
