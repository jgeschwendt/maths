import { type Complex, type Lattice, atOne, lFunction, periods } from './analytic.ts';
import { type Curve, coefficients, curves } from './ec.ts';
import { type Run, conductor5, hecke5, level1 } from './heegner.ts';

/**
A curve's L-series: a_n to 12 000 (the Hecke images of conductor 5 need 8 400 on 389a1), L(s), and L, L′, L″ at 1
*/
type Series = Readonly<{
  a: readonly number[];
  at1: readonly [number, number, number];
  curve: Curve;
  value: (s: number) => number;
}>;

/**
A curve of positive rank's period lattice and the machine's runs: at τ_K, the six of conductor 5 in class order, and the six Hecke images
*/
type Machine = Readonly<{
  hecke: readonly Complex[];
  lattice: Lattice;
  level1: Run;
  six: readonly Run[];
}>;

const series = (curve: Curve): Series => {
  const a = coefficients(curve, 12_000);
  const value = lFunction(curve, a);
  return { a, at1: atOne(value), curve, value };
};

const machine = ({ a, curve }: Series, size: number): Machine => ({
  hecke: hecke5(curve, a),
  lattice: periods(curve),
  level1: level1(curve, a, size),
  six: conductor5(curve, a),
});

/**
The 1960s evidence: the running total of log(N_p/p) over primes p, N_p = p + 1 − a_p the points mod p counted with
infinity, against log log p, and its least-squares slope over p ≥ 100, which tends to the rank
*/
const tally = ({
  a,
}: Series): Readonly<{ points: readonly (readonly [number, number])[]; slope: number }> => {
  const points: (readonly [number, number])[] = [];
  const composite = new Uint8Array(a.length);
  let sum = 0;
  for (let p = 2; p < a.length; p += 1) {
    if (composite[p] === 1) {
      continue;
    }
    for (let k = p * p; k < a.length; k += p) {
      composite[k] = 1;
    }
    sum += Math.log((p + 1 - a[p]) / p);
    points.push([Math.log(Math.log(p)), sum]);
  }
  const fit = points.filter(([x]) => x >= Math.log(Math.log(100)));
  const [mx, my] = [0, 1].map((k) => fit.reduce((s, q) => s + q[k], 0) / fit.length);
  const slope =
    fit.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0) /
    fit.reduce((s, [x]) => s + (x - mx) ** 2, 0);
  return { points, slope };
};

/**
The three curves' series
*/
const models = {
  '11a1': series(curves['11a1']),
  '37a1': series(curves['37a1']),
  '389a1': series(curves['389a1']),
};

/**
The machine on the two curves of positive rank, the level-1 runs drawn at 200 and 2 500 terms
*/
const machines = { '37a1': machine(models['37a1'], 200), '389a1': machine(models['389a1'], 2500) };

export { type Machine, type Series, machines, models, tally };
