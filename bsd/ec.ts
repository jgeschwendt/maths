/**
A rational number n/d in lowest terms with d > 0
*/
type Rational = readonly [bigint, bigint];

/**
An affine rational point, or undefined for the point at infinity
*/
type Point = Readonly<{ x: Rational; y: Rational }> | undefined;

/**
A curve y² + a3·y = x³ + a2·x² + a4·x + a6 from Cremona's table: `a` is the table's [a1, a2, a3, a4, a6],
and a1 = 0 on every curve here, so the arithmetic leaves it out
*/
type Curve = Readonly<{
  a: readonly bigint[];
  conductor: number;
  generators: readonly Point[];
  rank: number;
}>;

/**
One chord-and-tangent step: the line's slope (undefined: vertical), its third meeting point, and P + Q
*/
type Chord = Readonly<{ slope: Rational | undefined; sum: Point; third: Point }>;

const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? a : gcd(b, a % b));

/**
n/d reduced, the sign on the numerator
*/
const rational = (n: bigint, d = 1n): Rational => {
  const g = gcd(n, d);
  return d / g < 0n ? [-n / g, -d / g] : [n / g, d / g];
};
const add = (a: Rational, b: Rational): Rational =>
  rational(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const sub = (a: Rational, b: Rational): Rational => add(a, [-b[0], b[1]]);
const mul = (a: Rational, b: Rational): Rational => rational(a[0] * b[0], a[1] * b[1]);
const isSame = (a: Rational, b: Rational): boolean => a[0] === b[0] && a[1] === b[1];

/**
c0·tⁿ + … + cn at a rational t, by Horner
*/
const poly = (t: Rational, cs: readonly bigint[]): Rational => {
  let value: Rational = [0n, 1n];
  for (const c of cs) {
    value = add(mul(value, t), [c, 1n]);
  }
  return value;
};

/**
The value as a float
*/
const float = (a: Rational): number => Number(a[0]) / Number(a[1]);

/**
The fraction as written: `161/16`, `-1`
*/
const write = (a: Rational): string => (a[1] === 1n ? `${a[0]}` : `${a[0]}/${a[1]}`);

/**
A Cremona allgens line, `389 a 1 [0,1,1,-2,0] 2 [] [0:0:1] [1:0:1]`, as a curve
*/
const parse = (line: string): Curve => {
  const {
    coefficients = '',
    conductor,
    gens = '',
    rank,
  } = /^(?<conductor>\d+) \S+ \S+ \[(?<coefficients>\S+)\] (?<rank>\d+) \[\S*\](?<gens>.*)$/u.exec(
    line,
  )?.groups ?? {};
  const xyz = (gens.match(/-?\d+/gu) ?? []).map(BigInt);
  return {
    a: coefficients.split(',').map(BigInt),
    conductor: Number(conductor),
    // each generator [X:Y:Z] is the point (X/Z, Y/Z)
    generators: Array.from({ length: xyz.length / 3 }, (_, k) => ({
      x: rational(xyz[3 * k], xyz[3 * k + 2]),
      y: rational(xyz[3 * k + 1], xyz[3 * k + 2]),
    })),
    rank: Number(rank),
  };
};

const table = await Bun.file(new URL('allgens.txt', import.meta.url)).text();
const lookup = (key: string): Curve =>
  parse(table.split('\n').find((line) => line.startsWith(`${key} `)) ?? '');

/**
The curves the page draws: ranks 0, 1 and 2
*/
const curves = { '11a1': lookup('11 a 1'), '37a1': lookup('37 a 1'), '389a1': lookup('389 a 1') };

/**
Does P satisfy the equation?
*/
const isOnCurve = (curve: Curve, point: Point): boolean => {
  const [, a2, a3, a4, a6] = curve.a;
  return !point || isSame(poly(point.y, [1n, a3, 0n]), poly(point.x, [1n, a2, a4, a6]));
};

/**
Reflection across the curve's mirror line y = −a3/2: −P
*/
const mirror = (curve: Curve, point: Point): Point =>
  point && { x: point.x, y: rational(-point.y[0] - curve.a[2] * point.y[1], point.y[1]) };

/**
The line through P and Q, the tangent when they coincide
*/
const chord = (curve: Curve, p: Point, q: Point): Chord => {
  if (!p || !q) {
    return { slope: undefined, sum: p ?? q, third: mirror(curve, p ?? q) };
  }
  const [, a2, a3, a4] = curve.a;
  const isTangent = isSame(p.x, q.x);
  const [top, bottom] = isTangent
    ? [poly(p.x, [3n, 2n * a2, a4]), poly(p.y, [2n, a3])]
    : [sub(q.y, p.y), sub(q.x, p.x)];
  if (bottom[0] === 0n || (isTangent && !isSame(p.y, q.y))) {
    return { slope: undefined, sum: undefined, third: undefined };
  }
  const slope = mul(top, rational(bottom[1], bottom[0]));
  const x = sub(poly(slope, [1n, 0n, -a2]), add(p.x, q.x));
  const third = { x, y: add(mul(slope, sub(x, p.x)), p.y) };
  return { slope, sum: mirror(curve, third), third };
};

/**
P + Q
*/
const plus = (curve: Curve, p: Point, q: Point): Point => chord(curve, p, q).sum;

/**
n·P by repeated addition, n of either sign
*/
const times = (curve: Curve, n: number, point: Point): Point => {
  if (n < 0) {
    return mirror(curve, times(curve, -n, point));
  }
  return n === 0 ? undefined : plus(curve, times(curve, n - 1, point), point);
};

/**
a_p = p − #{affine solutions mod p}: right at good primes and, on a minimal model, at bad ones
*/
const trace = (curve: Curve, p: number): number => {
  const [, b, c, d, f] = curve.a.map((v) => ((Number(v) % p) + p) % p);
  // how many y give each value of y² + a3·y, then one lookup per x
  const left = new Int32Array(p);
  for (let y = 0; y < p; y += 1) {
    left[(y * y + c * y) % p] += 1;
  }
  let count = 0;
  for (let x = 0; x < p; x += 1) {
    count += left[(((((x + b) * x) % p) + d) * x + f) % p];
  }
  return p - count;
};

/**
The root number w = −∏ w_p over p | N, w_p = −a_p, for a semistable curve (N squarefree: every bad prime multiplicative);
additive reduction needs local data this model does not compute, so a square factor of N throws
*/
const rootNumber = (curve: Curve): number => {
  let [n, w] = [curve.conductor, -1];
  for (let p = 2; n > 1; p += 1) {
    if (n % p !== 0) {
      continue;
    }
    n /= p;
    if (n % p === 0) {
      throw new RangeError(`conductor ${curve.conductor} is not squarefree`);
    }
    w *= -trace(curve, p);
  }
  return w;
};

/**
a_0 … a_size of the L-series (a_0 = 0): multiplicative, with a_{p^k} = a_p·a_{p^(k−1)} − p·a_{p^(k−2)} at good p
*/
const coefficients = (curve: Curve, size: number): readonly number[] => {
  const a = new Float64Array(size + 1);
  const least = new Int32Array(size + 1);
  a[1] = 1;
  for (let n = 2; n <= size; n += 1) {
    for (let k = least[n] === 0 ? n : size + 1; k <= size; k += n) {
      least[k] ||= n;
    }
    const p = least[n];
    const m = n / p;
    a[n] =
      p === n
        ? trace(curve, p)
        : a[p] * a[m] - (m % p || curve.conductor % p === 0 ? 0 : p * a[m / p]);
  }
  return [...a];
};

export {
  type Chord,
  type Curve,
  type Point,
  type Rational,
  chord,
  coefficients,
  curves,
  float,
  isOnCurve,
  mirror,
  parse,
  plus,
  rational,
  rootNumber,
  times,
  write,
};
