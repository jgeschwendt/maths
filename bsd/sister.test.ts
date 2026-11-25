import { describe, expect, test } from 'bun:test';
import {
  addPoints,
  badFibres,
  field,
  height6,
  negate,
  points,
  residue,
  sister,
  toSums,
  trace,
  vanishing,
} from './sister.ts';

const { P, Q } = points;

describe('F_{5^k}', () => {
  test('a field: every non-zero element has an inverse, 1 + 4 = 0, and χ counts (5^k − 1)/2 squares', () => {
    for (const k of [1, 2, 3]) {
      const f = field(k);
      const units = Array.from({ length: f.size - 1 }, (_, a) => a + 1);
      expect(units.every((a) => units.some((b) => f.mul(a, b) === 1))).toBe(true);
      expect(f.add(1, 4)).toBe(0);
      expect(units.filter((a) => f.chi(a) === 1).length).toBe((f.size - 1) / 2);
    }
  });

  test('a trace by χ equals a count of every (x, y): y² + xy = x³ + a6 over F₂₅', () => {
    const f = field(2);
    for (const a6 of [0, 3, 7, 24]) {
      let n = 1;
      for (let x = 0; x < f.size; x += 1) {
        for (let y = 0; y < f.size; y += 1) {
          const lhs = f.add(f.mul(y, y), f.mul(x, y));
          n += lhs === f.add(f.mul(x, f.mul(x, x)), a6) ? 1 : 0;
        }
      }
      expect(trace(f, 1, a6)).toBe(f.size + 1 - n);
    }
  });
});

describe('the local factors (Ulmer 2002, 2.2–2.3)', () => {
  test('t = 0 is a split node, a = 1; ∞ is good, y² = x³ − 1, supersingular as 5 ≡ 2 mod 3, a = 0', () => {
    const f = field(1);
    expect(trace(f, 1, 0)).toBe(1);
    expect(trace(f, 0, 4)).toBe(0);
  });

  test('the six I₁ fibres, the roots of 1 − 432t⁶, lie in F₂₅ and are split nodes (µ₄ ⊂ F₅): a = 1', () => {
    const f = field(2);
    const roots = Array.from({ length: f.size }, (_, t) => t).filter((t) => {
      const t6 = f.mul(f.mul(t, f.mul(t, t)), f.mul(t, f.mul(t, t)));
      return t !== 0 && f.add(1, f.mul(3, t6)) === 0;
    });
    expect(roots.length).toBe(6);
    for (const t of roots) {
      const t6 = f.mul(f.mul(t, f.mul(t, t)), f.mul(t, f.mul(t, t)));
      expect(trace(f, 1, f.mul(4, t6))).toBe(1);
    }
  });

  test('deg n = 7 places of bad reduction, so deg L = 7 − 4 = 3', () => {
    expect(badFibres()).toBe(7);
    expect(sister.lPoly.length - 1).toBe(3);
  });
});

describe('L(T), exact', () => {
  test('S_1 … S_3 give L = 1 − 5T − 25T² + 125T³, and S_4, S_5, counted, are the ones it implies', () => {
    expect(sister.lPoly).toEqual([1, -5, -25, 125]);
    expect(toSums(sister.lPoly, 5)).toEqual(sister.sums);
    expect(sister.sums).toEqual([-5, -75, -125, -1875, -3125]);
  });

  test('the functional equation: L(T) = (5T)³·L(1/(25T)), sign +1', () => {
    const c = sister.lPoly;
    // the coefficients of T^j: 5³·c_j = 25^j·c_(3−j)
    expect(c.map((cj) => 125 * cj)).toEqual(c.map((_, j) => 25 ** j * c[3 - j]));
  });

  test('L = (1 − 5T)²(1 + 5T): the zero at T = 1/5 has order exactly 2 = the rank of Ulmer’s Theorem 9.2', () => {
    expect(sister.zero).toEqual({ order: 2, rest: [1, 5] });
    expect(vanishing([1, 5], 5).order).toBe(0);
  });

  test('over F₂₅, L(T)·L(−T) = (1 − 25T²)³: order 3, Ulmer’s rank there (1 + 2)', () => {
    const c = sister.lPoly;
    const product = Array.from({ length: 7 }, (_, k) =>
      c.reduce((s, ci, i) => s + ci * (c[k - i] ?? 0) * (-1) ** (k - i), 0),
    );
    expect(product).toEqual([1, 0, -75, 0, 1875, 0, -15_625]);
    expect(vanishing([1, -75, 1875, -15_625], 25).order).toBe(3);
  });
});

describe('the points, exact', () => {
  test('P = (t², 0) and Q = (0, 2t³) satisfy y² + xy = x³ − t⁶ in F₅[t], and so do P ± Q', () => {
    for (const R of [P, Q, addPoints(P, Q), addPoints(P, negate(Q))]) {
      expect(residue(R)).toEqual([]);
    }
    expect(addPoints(P, Q)).toEqual({ x: [0, 3, 3], y: [0, 2, 3, 4] });
  });

  test('6ĥ: P 4, Q 3, P ± Q 7 each, so ⟨P, Q⟩ = 0, the parallelogram law holds, and det = ⅔·½ = ⅓ ≠ 0: independent', () => {
    expect(sister.gram).toEqual([
      [4, 0],
      [0, 3],
    ]);
    const [sum, difference] = [addPoints(P, Q), addPoints(P, negate(Q))];
    expect(height6(difference)).toBe(7);
    expect(height6(sum) + height6(difference)).toBe(2 * (height6(P) + height6(Q)));
  });

  test('the formula is refused off its hypotheses: a point meeting O, a division that is not exact', () => {
    expect(() => height6({ x: [0, 0, 0, 1], y: [] })).toThrow(RangeError);
    expect(() => addPoints({ x: [1], y: [] }, { x: [0, 0, 1], y: [1] })).toThrow(RangeError);
  });
});
