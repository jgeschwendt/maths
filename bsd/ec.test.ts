import { describe, expect, test } from 'bun:test';
import {
  type Point,
  chord,
  coefficients,
  curves,
  isOnCurve,
  parse,
  plus,
  rational,
  times,
  write,
} from './ec.ts';

const point = (x: bigint, y: bigint): Point => ({ x: rational(x), y: rational(y) });
const shown = (p: Point): string => (p ? `${write(p.x)},${write(p.y)}` : 'O');
const all = [curves['11a1'], curves['37a1'], curves['389a1']];

describe("Cremona's table", () => {
  test('the three curves: minimal models with a1 = 0, conductors 11, 37, 389, ranks 0, 1, 2', () => {
    expect(all.map(({ a, conductor, rank }) => [a.join(','), conductor, rank])).toEqual([
      ['0,-1,1,-10,-20', 11, 0],
      ['0,0,1,-1,0', 37, 1],
      ['0,1,1,-2,0', 389, 2],
    ]);
  });

  test('generators: (5, 5) on 11a1 (torsion), (0, 0) on 37a1, (0, 0) and (1, 0) on 389a1', () => {
    expect(all.map((curve) => curve.generators.map((g) => shown(g)))).toEqual([
      ['5,5'],
      ['0,0'],
      ['0,0', '1,0'],
    ]);
    expect(parse('5 a 1 [0,0,0,0,1] 0 [] [3:6:8]').generators).toEqual([
      { x: [3n, 8n], y: [3n, 4n] },
    ]);
  });
});

describe('chord and tangent', () => {
  test('11a1: the multiples of (5, 5) are (16, −61), (16, 60), (5, −6), then the point at infinity', () => {
    const [curve] = all;
    const [g] = curve.generators;
    expect([1, 2, 3, 4, 5].map((n) => shown(times(curve, n, g)))).toEqual([
      '5,5',
      '16,-61',
      '16,60',
      '5,-6',
      'O',
    ]);
    expect(chord(curve, times(curve, 4, g), g).slope).toBeUndefined();
  });

  test('37a1: nP for n = 1 … 10 lie on the curve, 10P = (161/16, −2065/64), −P = (0, −1)', () => {
    const curve = curves['37a1'];
    const [g] = curve.generators;
    const multiples = Array.from({ length: 10 }, (_, n) => times(curve, n + 1, g));
    expect(multiples.every((p) => isOnCurve(curve, p))).toBe(true);
    expect(multiples.map((p) => shown(p).split(',', 1)[0])).toEqual([
      '0',
      '1',
      '-1',
      '2',
      '1/4',
      '6',
      '-5/9',
      '21/25',
      '-20/49',
      '161/16',
    ]);
    expect(shown(times(curve, 10, g))).toBe('161/16,-2065/64');
    expect(times(curve, -1, g)).toEqual(point(0n, -1n));
  });

  test('389a1: P + Q = (−2, −1) and 2P + 2Q = (39, 246); (1, 1) is off the curve', () => {
    const curve = curves['389a1'];
    const [p, q] = curve.generators;
    expect(curve.generators.every((g) => isOnCurve(curve, g))).toBe(true);
    expect(plus(curve, p, q)).toEqual(point(-2n, -1n));
    expect(plus(curve, times(curve, 2, p), times(curve, 2, q))).toEqual(point(39n, 246n));
    expect(isOnCurve(curve, point(1n, 1n))).toBe(false);
  });
});

describe('a_n by point counting', () => {
  test('a_1 … a_10 of 11a1, 37a1 and 389a1 (Cremona; LMFDB)', () => {
    expect(all.map((curve) => coefficients(curve, 10).slice(1).join(','))).toEqual([
      '1,-2,-1,2,1,2,-2,0,-2,-2',
      '1,-2,-3,2,-2,6,-1,0,6,4',
      '1,-2,-2,2,-3,4,-5,0,1,6',
    ]);
  });

  test('at the conductor a_N is the root number (−1)^rank: 1, −1, 1', () => {
    expect(all.map((curve) => coefficients(curve, curve.conductor)[curve.conductor])).toEqual([
      1, -1, 1,
    ]);
  });
});
