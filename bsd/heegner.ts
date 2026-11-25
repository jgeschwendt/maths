import { type Complex, type Lattice, add, exp, mul } from './analytic.ts';
import type { Curve } from './ec.ts';

/**
A binary quadratic form A·x² + B·xy + C·y²
*/
type Form = readonly [number, number, number];

/**
A run of the machine: τ in the upper half plane, the running sums of Σ a_n/n·qⁿ (q = e^(2πiτ)) from 0, and the last
*/
type Run = Readonly<{ path: readonly Complex[]; tau: Complex; z: Complex }>;

/**
The discriminant of the order of conductor 5 in K = Q(√−7)
*/
const D5 = -175;

const egcd = (a: number, b: number): readonly [number, number, number] => {
  if (b === 0) {
    return [Math.abs(a), Math.sign(a), 0];
  }
  const [g, x, y] = egcd(b, a % b);
  return [g, y, x - Math.trunc(a / b) * y];
};
const mod = (a: number, m: number): number => ((a % m) + m) % m;
const gcd = (a: number, b: number, c: number): number => egcd(egcd(a, b)[0], c)[0];
const key = (form: Form): string => form.join(',');

/**
The reduced form of a class of discriminant −175: |B| ≤ A ≤ C, B ≥ 0 when either bound is tight
*/
const reduce = (form: Form): Form => {
  let [a, b, c] = form;
  while (b > a || b <= -a || a > c || (a === c && b < 0)) {
    if (b > a || b <= -a) {
      b = mod(b + a - 1, 2 * a) - a + 1;
      c = (b * b - D5) / (4 * a);
    } else {
      [a, b, c] = [c, -b, a];
    }
  }
  return [a, b, c];
};

/**
Composition of two primitive forms of discriminant −175 (Cohen, A Course in Computational Algebraic Number
Theory, Algorithm 5.4.7), reduced
*/
const compose = (f: Form, g: Form): Form => {
  const [[a1, b1], [a2, b2, c2]] = f[0] > g[0] ? [g, f] : [f, g];
  const s = (b1 + b2) / 2;
  const [d, y1] = egcd(a2, a1);
  const [d1, x2, v] = egcd(s, d);
  const [v1, v2] = [a1 / d1, a2 / d1];
  const b3 = b2 + 2 * v2 * mod(-y1 * v * (b2 - s) - x2 * c2, v1);
  return reduce([v1 * v2, b3, (b3 * b3 - D5) / (4 * v1 * v2)]);
};

/**
The six classes of discriminant −175, a cyclic group: the powers gⁱ of g = [2, −1, 22]
*/
const ringClassGroup = (): readonly Form[] => {
  const powers: Form[] = [[1, 1, 44]];
  for (
    let next = compose([2, -1, 22], [1, 1, 44]);
    key(next) !== '1,1,44';
    next = compose([2, -1, 22], next)
  ) {
    powers.push(next);
  }
  return powers;
};

/**
Terms of Σ a_n/n·qⁿ needed at Im τ = y for a tail below 10⁻¹³, from |a_n| ≤ 2n
*/
const terms = (y: number): number =>
  Math.ceil(Math.log(2e13 / (1 - Math.exp(-2 * Math.PI * y))) / (2 * Math.PI * y));

/**
The machine: the running sums of Σ a_n/n·qⁿ at τ, the modular parametrisation's image of τ in C/Λ
*/
const run = (a: readonly number[], tau: Complex, size = terms(tau[1])): Run => {
  const q = exp([-2 * Math.PI * tau[1], 2 * Math.PI * tau[0]]);
  const path: Complex[] = [[0, 0]];
  let qn: Complex = [1, 0];
  for (let n = 1; n <= size; n += 1) {
    qn = mul(qn, q);
    path.push(add(path[n - 1], [(a[n] / n) * qn[0], (a[n] / n) * qn[1]]));
  }
  return { path, tau, z: path[size] };
};

/**
The least B ≥ 0 with B² ≡ −7 (mod 4N): N splits in K, and τ_K = (−B + √−7)/2N is the Heegner point of level 1
*/
const heegnerB = (curve: Curve): number => {
  let b = 0;
  while ((b * b + 7) % (4 * curve.conductor) !== 0) {
    b += 1;
  }
  return b;
};

const tauK = (curve: Curve): Complex => [
  -heegnerB(curve) / (2 * curve.conductor),
  Math.sqrt(7) / (2 * curve.conductor),
];

/**
The level-1 run at τ_K
*/
const level1 = (curve: Curve, a: readonly number[], size?: number): Run =>
  run(a, tauK(curve), size);

/**
The six Heegner points of conductor 5, one per class: in class f0·gⁱ (f0 the class of 5·τ_K) the form [N·m, B, C],
B ≡ 5·B_K (mod 2N), of least m, and its run at τ = (−B + √−175)/(2N·m)
*/
const conductor5 = (curve: Curve, a: readonly number[]): readonly Run[] => {
  const n = curve.conductor;
  const bk = heegnerB(curve);
  const found = new Map<string, Form>();
  const beta = mod(5 * bk, 2 * n);
  for (let m = 1; found.size < 6; m += 1) {
    // B ≡ β (mod 2N) across (−N·m, N·m]
    for (let b = beta - 2 * n * Math.floor((beta + n * m) / (2 * n)); b <= n * m; b += 2 * n) {
      const c = (b * b - D5) / (4 * n * m);
      if (!Number.isSafeInteger(c) || gcd(n * m, b, c) !== 1 || gcd(m, b, c * n) !== 1) {
        continue;
      }
      const k = key(reduce([n * m, b, c]));
      found.set(k, found.get(k) ?? [n * m, b, c]);
    }
  }
  const f0 = reduce([n, 5 * bk, (25 * bk * bk - D5) / (4 * n)]);
  return ringClassGroup().map((g) => {
    const [A, B] = found.get(key(compose(g, f0))) ?? [1, 0];
    return run(a, [-B / (2 * A), Math.sqrt(-D5) / (2 * A)]);
  });
};

/**
The six Hecke images of τ_K at 5, (τ_K + j)/5 and 5·τ_K, whose runs give the same six points modulo Λ
*/
const hecke5 = (curve: Curve, a: readonly number[]): readonly Complex[] => {
  const tau = tauK(curve);
  const images: readonly Complex[] = [
    ...[0, 1, 2, 3, 4].map((j): Complex => [(tau[0] + j) / 5, tau[1] / 5]),
    [5 * tau[0], 5 * tau[1]],
  ];
  return images.map((t) => run(a, t).z);
};

/**
The distance from z to the lattice (1/k)·Λ
*/
const distance = (z: Complex, { w1, w2 }: Lattice, k = 1): number => {
  const [u, v] = [(z[0] * k) / w1, (z[1] * k) / w2];
  return Math.hypot(((u - Math.round(u)) * w1) / k, ((v - Math.round(v)) * w2) / k);
};

/**
z shifted by a lattice vector to its copy nearest 0
*/
const centered = (z: Complex, { w1, w2 }: Lattice): Complex => [
  z[0] - Math.round(z[0] / w1) * w1,
  z[1] - Math.round(z[1] / w2) * w2,
];

export {
  type Form,
  type Run,
  centered,
  compose,
  conductor5,
  distance,
  hecke5,
  heegnerB,
  level1,
  reduce,
  ringClassGroup,
  run,
};
