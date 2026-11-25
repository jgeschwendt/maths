import type { Curve } from './ec.ts';

/**
A complex number [re, im]
*/
type Complex = readonly [number, number];

/**
The rectangular period lattice Zω1 + Zω2 of a curve with three real roots: ω1 real, ω2 = i·w2
*/
type Lattice = Readonly<{ w1: number; w2: number }>;

const add = (a: Complex, b: Complex): Complex => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Complex, b: Complex): Complex => [a[0] - b[0], a[1] - b[1]];
const mul = (a: Complex, b: Complex): Complex => [
  a[0] * b[0] - a[1] * b[1],
  a[0] * b[1] + a[1] * b[0],
];
const div = (a: Complex, b: Complex): Complex => {
  const d = b[0] ** 2 + b[1] ** 2;
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
};
const exp = (a: Complex): Complex => [
  Math.exp(a[0]) * Math.cos(a[1]),
  Math.exp(a[0]) * Math.sin(a[1]),
];

/**
Lanczos's Γ(z), g = 7: every argument here lies in [½, 1½]
*/
const gamma = (z: number): number => {
  const t = z + 6.5;
  let x = 0.9999999999998099;
  for (const [k, c] of [
    676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406,
    12.507343278686905, -0.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7,
  ].entries()) {
    x += c / (z + k);
  }
  return Math.sqrt(2 * Math.PI) * t ** (z - 0.5) * Math.exp(-t) * x;
};

/**
The upper incomplete Γ(s, x): Γ(s) less the lower series below s + 1, Lentz's continued fraction above
*/
const upperGamma = (s: number, x: number): number => {
  const scale = Math.exp(s * Math.log(x) - x);
  if (x < s + 1) {
    let term = 1 / s;
    let sum = term;
    for (let n = 1; n < 80; n += 1) {
      term *= x / (s + n);
      sum += term;
    }
    return gamma(s) - sum * scale;
  }
  let b = x + 1 - s;
  let c = 1e300;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 200; i += 1) {
    b += 2;
    d = 1 / (b - i * (i - s) * d);
    c = b - (i * (i - s)) / c;
    h *= d * c;
  }
  return scale * h;
};

/**
L(E, s) from the coefficients by the smoothed sum Λ(s) = Σ a_n·[(A/n)^s·Γ(s, n/A) + w·(A/n)^(2−s)·Γ(2−s, n/A)],
A = √N/2π, the root number w = (−1)^rank; terms past 60·A are below 1e−24
*/
const lFunction = (curve: Curve, a: readonly number[]): ((s: number) => number) => {
  const A = Math.sqrt(curve.conductor) / (2 * Math.PI);
  const w = (-1) ** curve.rank;
  return (s) => {
    let sum = 0;
    for (let n = 1; n <= 60 * A; n += 1) {
      sum +=
        a[n] *
        ((A / n) ** s * upperGamma(s, n / A) + w * (A / n) ** (2 - s) * upperGamma(2 - s, n / A));
    }
    return sum / (A ** s * gamma(s));
  };
};

/**
f(1), f′(1) and f″(1) by five-point stencils, h = 10⁻³
*/
const atOne = (f: (s: number) => number): readonly [number, number, number] => {
  const h = 1e-3;
  const [m2, m1, z, p1, p2] = [-2, -1, 0, 1, 2].map((k) => f(1 + k * h));
  return [
    z,
    (m2 - 8 * m1 + 8 * p1 - p2) / (12 * h),
    (-m2 + 16 * m1 - 30 * z + 16 * p1 - p2) / (12 * h * h),
  ];
};

/**
b2, b4, b6: the cubic 4x³ + b2·x² + 2b4·x + b6 whose roots are where the real curve meets its mirror
*/
const invariants = (curve: Curve): readonly [number, number, number] => {
  const [, a2, a3, a4, a6] = curve.a.map(Number);
  return [4 * a2, 2 * a4, a3 * a3 + 4 * a6];
};

/**
The cubic's real roots, descending: Newton from above the largest, then the deflated quadratic
*/
const roots = (curve: Curve): readonly number[] => {
  const [b2, b4, b6] = invariants(curve);
  let e = 9;
  for (let i = 0; i < 50; i += 1) {
    e -= (((4 * e + b2) * e + 2 * b4) * e + b6) / ((12 * e + 2 * b2) * e + 2 * b4);
  }
  const b = b2 + 4 * e;
  const d = b * b - 16 * (2 * b4 + e * b);
  return d < 0 ? [e] : [e, (Math.sqrt(d) - b) / 8, (-Math.sqrt(d) - b) / 8];
};

const agm = (x: number, y: number): number => {
  let [a, b] = [x, y];
  for (let i = 0; i < 40; i += 1) {
    [a, b] = [(a + b) / 2, Math.sqrt(a * b)];
  }
  return a;
};

/**
The period lattice by the arithmetic-geometric mean; the real period Ω is 2ω1, the real locus having two parts
*/
const periods = (curve: Curve): Lattice => {
  const [e1, e2, e3] = roots(curve);
  return {
    w1: Math.PI / agm(Math.sqrt(e1 - e3), Math.sqrt(e1 - e2)),
    w2: Math.PI / agm(Math.sqrt(e1 - e3), Math.sqrt(e2 - e3)),
  };
};

/**
v/(1 − v)², the q-expansion's term
*/
const term = (v: Complex): Complex => div(v, mul(sub([1, 0], v), sub([1, 0], v)));

/**
Weierstrass ℘(z) on the lattice, by its q-expansion in q = e^(−2π·w2/ω1)
*/
const wp = (z: Complex, { w1, w2 }: Lattice): Complex => {
  const k = (2 * Math.PI) / w1;
  const q = Math.exp(-k * w2);
  const u = exp([-k * z[1], k * z[0]]);
  let sum = add([1 / 12, 0], term(u));
  for (let n = 1, qn = q; n < 40; n += 1, qn *= q) {
    const pair = add(term(mul([qn, 0], u)), term(div([qn, 0], u)));
    sum = sub(add(sum, pair), [(2 * qn) / (1 - qn) ** 2, 0]);
  }
  return mul([-(k ** 2), 0], sum);
};

/**
The point of the curve at z ∈ C/Λ: x = ℘ − b2/12, y = (℘′ − a3)/2, ℘′ by a central difference
*/
const toCurve = (curve: Curve, z: Complex, lattice: Lattice): readonly [Complex, Complex] => {
  const h = 1e-5;
  const [ahead, behind] = [wp(add(z, [h, 0]), lattice), wp(sub(z, [h, 0]), lattice)];
  const dp = div(sub(ahead, behind), [2 * h, 0]);
  const x = sub(wp(z, lattice), [invariants(curve)[0] / 12, 0]);
  return [x, div(sub(dp, [Number(curve.a[2]), 0]), [2, 0])];
};

export {
  type Complex,
  type Lattice,
  add,
  atOne,
  div,
  exp,
  invariants,
  lFunction,
  mul,
  periods,
  roots,
  sub,
  toCurve,
};
