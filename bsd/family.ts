import { atOne, lFunction } from './analytic.ts';
import { type Curve, coefficients, parse } from './ec.ts';

/**
One curve of the family: its parameter t, Cremona label, L(s), L, L′ and L″ at 1, and the order of the zero found
*/
type Member = Readonly<{
  at1: readonly [number, number, number];
  curve: Curve;
  label: string;
  order: number;
  t: number;
  value: (s: number) => number;
}>;

/**
Below this a Taylor coefficient L^(k)(1)/k! counts as zero: a floating-point threshold, not a proof
*/
const zero = 1e-8;

/**
L^(k)(1)/k! for k = 0, 1, 2
*/
const taylor = (at1: readonly [number, number, number]): readonly number[] => [
  at1[0],
  at1[1],
  at1[2] / 2,
];

const member = (line: string): Member => {
  const curve = parse(line);
  // the smoothed sum reads a_n up to 60·A = 30·√N/π
  const size = Math.ceil((30 * Math.sqrt(curve.conductor)) / Math.PI);
  const value = lFunction(curve, coefficients(curve, size));
  const at1 = atOne(value);
  return {
    at1,
    curve,
    label: line.split(' ').slice(0, 3).join(''),
    order: taylor(at1).findIndex((c) => Math.abs(c) >= zero),
    t: Number(curve.a[4]),
    value,
  };
};

/**
y² + y = x³ + x + t for t = −5 … 5, in order of t, from `family.txt`
*/
const table = await Bun.file(new URL('family.txt', import.meta.url)).text();
const family: readonly Member[] = table
  .split('\n')
  .filter((line) => /^\d/u.test(line))
  .map((line) => member(line));

export { type Member, family, taylor, zero };
