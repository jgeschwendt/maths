import { describe, expect, test } from 'bun:test';
import { curves, isOnCurve, rootNumber } from './ec.ts';
import { family, taylor, zero } from './family.ts';

/**
L^(r)(1)/r!, the leading Taylor coefficient at s = 1, from Cremona's allbsd/allbsd.00000-09999 and
allbsd.10000-19999 (https://github.com/JohnCremona/ecdata), for t = −5 … 5
*/
const published = [
  1.94012327352391, 2.31725898149045, 2.15549113508343, 1.58672467947253, 2.80026132581427,
  0.554939366544176, 3.67744352088055, 1.77649928744214, 7.43665029776803, 3.07641352659711,
  3.08144005705017,
];

describe('the family y² + y = x³ + x + t from Cremona’s table', () => {
  test('t runs −5 … 5, each model [0, 0, 1, 1, t], ranks 0 1 0 1 0 1 0 2 1 2 0', () => {
    expect(family.map((m) => m.t)).toEqual([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5]);
    expect(family.map((m) => m.curve.a.join(','))).toEqual(family.map((m) => `0,0,1,1,${m.t}`));
    expect(family.map((m) => m.curve.rank)).toEqual([0, 1, 0, 1, 0, 1, 0, 2, 1, 2, 0]);
  });

  test('the conductor is |Δ| = 64 + 27(4t + 1)², squarefree: every bad prime multiplicative', () => {
    for (const { curve, t } of family) {
      expect(curve.conductor).toBe(64 + 27 * (4 * t + 1) ** 2);
      expect([1, -1]).toContain(rootNumber(curve));
    }
  });

  test('the generators lie on their curves, one per unit of rank (no torsion)', () => {
    for (const { curve } of family) {
      expect(curve.generators.length).toBe(curve.rank);
      expect(curve.generators.every((g) => isOnCurve(curve, g))).toBe(true);
    }
  });
});

describe('the root number from the bad primes', () => {
  test('w = (−1)^rank on the family and on 11a1, 37a1, 389a1', () => {
    for (const curve of [family.map((m) => m.curve), Object.values(curves)].flat()) {
      expect(rootNumber(curve)).toBe((-1) ** curve.rank);
    }
  });

  test('a square in the conductor, additive reduction, is refused', () => {
    expect(() => rootNumber({ ...curves['37a1'], conductor: 49 })).toThrow(RangeError);
  });
});

describe('the order of the zero at s = 1, found numerically', () => {
  test(`L^(k)(1)/k! below ${zero} for k < rank, then the leading one to 8 digits of Cremona's`, () => {
    for (const [k, { at1, curve, order }] of family.entries()) {
      const c = taylor(at1);
      expect(order).toBe(curve.rank);
      expect(c.slice(0, order).every((v) => Math.abs(v) < zero)).toBe(true);
      expect(Math.abs(c[order] - published[k])).toBeLessThan(1e-8 * published[k]);
    }
  });
});
