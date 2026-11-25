import { describe, expect, test } from 'bun:test';
import { periods } from './analytic.ts';
import { curves } from './ec.ts';
import { height, regulator } from './height.ts';
import { models } from './model.ts';

const near = (got: number, want: number, digits = 9): void => {
  expect(Math.abs(got - want)).toBeLessThanOrEqual(10 ** -digits * Math.max(1, Math.abs(want)));
};
const [E1, E2] = [curves['37a1'], curves['389a1']];

describe('heights (Cremona; LMFDB)', () => {
  test('37a1: ĥ(0, 0) = 0.0511114082, and ĥ(O) = 0', () => {
    near(height(E1, E1.generators[0]), 0.0511114082);
    expect(height(E1)).toBe(0);
  });

  test('389a1: the regulator of (0, 0) and (1, 0) is 0.1524601779', () => {
    near(regulator(E2, E2.generators[0], E2.generators[1]), 0.1524601779);
  });
});

describe('the BSD formula, Sha, torsion and Tamagawa numbers all 1', () => {
  test("37a1: L'(1) = Ω·ĥ(P), 0.3059997738 = 5.98691729 × 0.0511114082: the proved rank-1 case", () => {
    const omega = 2 * periods(E1).w1;
    near(omega, 5.98691729, 8);
    near(omega * height(E1, E1.generators[0]), models['37a1'].at1[1]);
  });

  test("389a1: L''(1)/2 = Ω·Reg, 0.7593165003 = 4.98042512 × 0.1524601779: conjectural, holds numerically", () => {
    const omega = 2 * periods(E2).w1;
    near(omega, 4.98042512, 8);
    near(omega * regulator(E2, E2.generators[0], E2.generators[1]), models['389a1'].at1[2] / 2, 8);
  });
});
