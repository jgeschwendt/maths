import { describe, expect, test } from 'bun:test';
import { constant, twists as figure } from './figure-twists.ts';
import { type Twist, rankZero, rational, rows, twists } from './twists.ts';

const byD = (d: string): Twist | undefined => rows.find((r) => r.d === d);

/**
L(1/5) as an exact fraction n/5^deg
*/
const atCentre = (coeffs: readonly number[]): readonly [bigint, bigint] => {
  const n = coeffs.length - 1;
  return [coeffs.reduce((s, c, i) => s + BigInt(c) * 5n ** BigInt(n - i), 0n), 5n ** BigInt(n)];
};

describe('the probe sweep', () => {
  test('E: L = (1 − 5T)²(1 + 5T), a double zero, |Ш| = 1 with Reg = 1/3 from the heights ⅔ and ½', () => {
    expect(byD('1')).toMatchObject({
      coeffs: [1, -5, -25, 125],
      degOmega: 1,
      order: 2,
      sha: 1,
      tamagawa: 6,
      torsion: 1,
    });
  });

  test('D = 2t + 1: L(E^D, 1/5) = 24/5, so |Ш| = (24/5)·5/τ = 1 with τ = 6·2·2 = 24', () => {
    const row = byD('2t+1');
    const [n, d] = atCentre(row?.coeffs ?? []);
    expect(n * 5n).toBe(24n * d);
    expect(row).toMatchObject({ admissible: true, degOmega: 2, sha: 1, tamagawa: 24 });
  });

  test('1250 twists, 463 admissible, 401 of them with L(E^D, 1/5) ≠ 0 and 62 with a zero', () => {
    const admissible = twists.filter((r) => r.admissible);
    expect([twists.length, admissible.length, rankZero.length]).toEqual([1250, 463, 401]);
    expect(admissible.filter((r) => r.order > 0).length).toBe(62);
  });

  test('every rank-0 twist has |Ш| a positive square and no torsion', () => {
    for (const r of rankZero) {
      expect(Number.isSafeInteger(Math.sqrt(r.sha))).toBe(true);
      expect(r.sha).toBeGreaterThan(0);
      expect(r.torsion).toBe(1);
    }
  });

  test('|Ш| takes these values, with these counts', () => {
    const counts = new Map<number, number>();
    for (const r of rankZero) {
      counts.set(r.sha, (counts.get(r.sha) ?? 0) + 1);
    }
    expect(
      Object.fromEntries(
        counts
          .entries()
          .toArray()
          .toSorted(([a], [b]) => a - b),
      ),
    ).toEqual({
      1: 152,
      4: 72,
      9: 52,
      16: 47,
      25: 18,
      36: 16,
      49: 8,
      64: 12,
      81: 2,
      100: 6,
      121: 4,
      144: 8,
      169: 2,
      289: 2,
    });
  });

  test('the prediction is I(D) = |Ш|·τ / 4128 on every one: BSD and the identity differ by a constant', () => {
    expect(constant()).toBe(4128);
    for (const r of rankZero) {
      expect(r.iz.value * 4128).toBeCloseTo(r.sha * r.tamagawa, 9);
    }
  });

  test('the five simplest D predict 1/172, 1/1032, 1/1032, 1/172 and 1/43', () => {
    const five = ['2t+1', '2t+2', '2t+3', '2t+4', 't^2+4'].map((d) => byD(d)?.iz?.text);
    expect(five).toEqual(['1/172', '1/1032', '1/1032', '1/172', '1/43']);
    expect(byD('2t+1')?.izFactors).toBe('2^-2·43^-1');
  });

  test('a rational reads as text and as a float', () => {
    expect(rational('3/4')).toEqual({ text: '3/4', value: 0.75 });
    expect(rational('5').value).toBe(5);
  });

  test('the figure draws every twist once', () => {
    expect(figure().includes('401 twists')).toBe(true);
  });
});
