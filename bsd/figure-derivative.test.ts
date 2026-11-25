import { describe, expect, test } from 'bun:test';
import type { Complex } from './analytic.ts';
import { derivative, inCell, wrap } from './figure-derivative.ts';
import { type Form, compose, distance, reduce } from './heegner.ts';
import { machines, models } from './model.ts';

const { lattice, six } = machines['389a1'];
const zs = six.map(({ z }) => z);
const sum = (weight: (i: number) => number): Complex => [
  zs.reduce((s, z, i) => s + weight(i) * z[0], 0),
  zs.reduce((s, z, i) => s + weight(i) * z[1], 0),
];

describe('389a1 at conductor 5: the six points in σ-orbit order', () => {
  test('each τ_i is a Heegner form of level 389, and class i + 1 is [2, −1, 22] times class i', () => {
    // τ = (−B + √−175)/2A back to the form [A, B, C]
    const forms = six.map(({ tau }): Form => {
      const a = Math.round(Math.sqrt(175) / (2 * tau[1]));
      const b = Math.round(-2 * a * tau[0]);
      return [a, b, (b * b + 175) / (4 * a)];
    });
    for (const [a, b, c] of forms) {
      expect([a % 389, (((b - 5 * 185) % 778) + 778) % 778, Number.isSafeInteger(c)]).toEqual([
        0,
        0,
        true,
      ]);
    }
    const classes = forms.map((form) => reduce(form));
    const distinct = new Set(classes.map(String));
    expect(distinct.size).toBe(6);
    for (const [i, c] of classes.entries()) {
      expect(compose([2, -1, 22], c)).toEqual(classes[(i + 1) % 6]);
    }
  });

  test('the plain sum is a corner: 0 on the curve', () => {
    expect(
      distance(
        sum(() => 1),
        lattice,
      ),
    ).toBeLessThan(1e-12);
  });

  test('weighted 0 … 5 from z₀: 0.412983 from Λ; from any start, either way round σ, never a corner', () => {
    expect(
      distance(
        sum((i) => i),
        lattice,
      ),
    ).toBeCloseTo(0.412983, 6);
    const ds = [1, 5].flatMap((g) =>
      [0, 1, 2, 3, 4, 5].map((k) =>
        distance(
          sum((i) => (g * i + 6 - k) % 6),
          lattice,
        ),
      ),
    );
    expect(Math.min(...ds)).toBeGreaterThan(0.4);
  });
});

describe('the figure', () => {
  test('a step on the torus is cut at the grid and every piece lies in the cell', () => {
    const pieces = wrap([2, 1.5], [3, 2.5], lattice);
    expect(pieces).toHaveLength(3);
    // the closed cell: a cut lands on its edge
    for (const [x, y] of pieces.flat()) {
      expect([x, y].map((c, k) => c >= -1e-12 && c <= [lattice.w1, lattice.w2][k] + 1e-12)).toEqual(
        [true, true],
      );
    }
    expect(inCell([-1, 5], lattice)).toEqual([lattice.w1 - 1, 5 - 2 * lattice.w2]);
  });

  test('it shows the computed distance and bend', () => {
    const drawn = derivative();
    expect(drawn).toContain(
      `${distance(
        sum((i) => i),
        lattice,
      ).toFixed(2)} from a corner`,
    );
    expect(drawn).toContain(`bend ${(models['389a1'].at1[2] / 2).toFixed(3)}`);
  });
});
