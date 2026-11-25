/**
The sister world: E: y² + xy = x³ − t⁶ over F₅(t), Ulmer's curve (Annals 155, 2002) with d = 6 = 5 + 1, all exact.
Its L-function is a polynomial in T = 5^−s, read off by counting points on every fibre E_t; at the centre T = 1/5
it vanishes to order 2, and two points with coordinates in F₅[t] are independent by Shioda's height formula.
*/

/**
A polynomial by its coefficients, constant first: integers for L, residues mod 5 for F₅[t]
*/
type Poly = readonly number[];

/**
A point with coordinates in F₅[t]
*/
type Section = Readonly<{ x: Poly; y: Poly }>;

/**
F_{5^k}: an element is an integer below 5^k, read in base 5 as a polynomial in a primitive root α
*/
type Field = Readonly<{
  add: (a: number, b: number) => number;
  chi: (a: number) => number;
  mul: (a: number, b: number) => number;
  size: number;
}>;

/**
What the page draws: S_1 … S_5, L, its zero at T = 1/5, and 6⟨·,·⟩ on P and Q
*/
type Sister = Readonly<{
  gram: readonly (readonly number[])[];
  lPoly: Poly;
  sums: readonly number[];
  zero: Readonly<{ order: number; rest: Poly }>;
}>;

const p = 5;
const mod = (a: number): number => ((a % p) + p) % p;

const field = (k: number): Field => {
  const size = p ** k;
  const top = size / p;
  const add = (a: number, b: number): number => {
    let s = 0;
    for (let u = 1; u < size; u *= p) {
      s += ((Math.floor(a / u) + Math.floor(b / u)) % p) * u;
    }
    return s;
  };
  // α^k = g for the first g whose α has order 5^k − 1: v·α shifts v's digits up and folds the top one through g
  for (let g = 1; ; g += 1) {
    const exp = [1];
    while (exp.length < size) {
      const v = exp.at(-1) ?? 1;
      let fold = (v % top) * p;
      for (let c = 0; c < Math.floor(v / top); c += 1) {
        fold = add(fold, g);
      }
      exp.push(fold);
    }
    if (exp.indexOf(1, 1) === size - 1) {
      const log = new Int32Array(size);
      for (const [i, v] of exp.entries()) {
        log[v] = i;
      }
      const mul = (a: number, b: number): number =>
        a === 0 || b === 0 ? 0 : exp[(log[a] + log[b]) % (size - 1)];
      // α is no square, so the squares are its even powers
      const chi = (a: number): number => (a === 0 ? 0 : 1 - 2 * (log[a] % 2));
      return { add, chi, mul, size };
    }
  }
};

/**
A fibre's trace a = 5^k + 1 − #(points of its cubic y² + a1·xy = x³ + a6 over F_{5^k}): each x carries 1 + χ(disc)
values of y. On the minimal model this is a at good fibres, 1 or −1 at split or non-split nodes, 0 at cusps (Ulmer,
PCMI notes, arXiv:1101.1939, 8.3)
*/
const trace = (f: Field, a1: number, a6: number): number => {
  let s = 0;
  for (let x = 0; x < f.size; x += 1) {
    const x2 = f.mul(x, x);
    const cubic = f.add(f.mul(x, x2), a6);
    s -= f.chi(f.add(f.mul(a1, x2), f.mul(4, cubic)));
  }
  return s;
};

const sixth = (f: Field, t: number): number => {
  const t3 = f.mul(t, f.mul(t, t));
  return f.mul(t3, t3);
};

/**
S_k: the traces summed over every fibre of P¹(F_{5^k}). Finite t: y² + xy = x³ − t⁶, minimal everywhere (c4 = 1).
At ∞, x = t²x′, y = t³y′, t = 1/t′ give y′² + t′x′y′ = x′³ − 1, at t′ = 0 y² = x³ − 1: good (Ulmer 2002, 2.3, b = 0)
*/
const sum = (k: number): number => {
  const f = field(k);
  const minus1 = p - 1;
  // fibres sharing t⁶ share a cubic: count each cubic once
  const traces = new Map<number, number>();
  let s = trace(f, 0, minus1);
  for (let t = 0; t < f.size; t += 1) {
    const a6 = f.mul(minus1, sixth(f, t));
    if (!traces.has(a6)) {
      traces.set(a6, trace(f, 1, a6));
    }
    s += traces.get(a6) ?? 0;
  }
  return s;
};

/**
The polynomial L(T) = exp(Σ S_k T^k / k), by Newton's identities k·c_k = Σ S_i·c_{k−i}, from the sums S_1 … S_n
*/
const fromSums = (sums: readonly number[]): Poly => {
  const c = [1];
  for (let k = 1; k <= sums.length; k += 1) {
    c.push(sums.slice(0, k).reduce((s, si, i) => s + si * c[k - 1 - i], 0) / k);
  }
  return c;
};

/**
The sums S_1 … S_n a polynomial implies, Newton's identities run the other way: S_k = −Σ ωᵏ over L's inverse roots ω
*/
const toSums = (c: Poly, n: number): readonly number[] => {
  const s: number[] = [];
  for (let k = 1; k <= n; k += 1) {
    s.push(k * (c[k] ?? 0) - s.reduce((a, si, j) => a + si * (c[k - 1 - j] ?? 0), 0));
  }
  return s;
};

/**
The geometric places of bad reduction: Δ = t⁶(1 − 432t⁶) vanishes at 0 and six points, all in F₂₅; ∞ is good.
c4 = 1, so each is a node, conductor exponent 1, and deg L = deg n − 4 (Ulmer, PCMI notes, Theorem 9.3)
*/
const badFibres = (): number => {
  const f = field(2);
  let n = 0;
  for (let t = 0; t < f.size; t += 1) {
    const t6 = sixth(f, t);
    const factor = f.add(1, f.mul(p - mod(432), t6));
    n += f.mul(t6, factor) === 0 ? 1 : 0;
  }
  return n;
};

/**
L divided by (1 − qT) as long as it divides exactly: the order of the zero at T = 1/q and what is left
*/
const vanishing = (c: Poly, q: number): Readonly<{ order: number; rest: Poly }> => {
  // c = (1 − qT)·b: b_i = c_i + q·b_(i−1), exact when c_n + q·b_(n−1) = 0
  const b: number[] = [];
  for (let i = 0; i < c.length - 1; i += 1) {
    b.push(c[i] + q * (b.at(-1) ?? 0));
  }
  if (c.length === 1 || (c.at(-1) ?? 0) + q * (b.at(-1) ?? 0) !== 0) {
    return { order: 0, rest: c };
  }
  const r = vanishing(b, q);
  return { order: r.order + 1, rest: r.rest };
};

/**
L(s) = L(5^−s) as a float, for the drawing
*/
const atS = (c: Poly, s: number): number => c.reduce((v, ci, i) => v + ci * p ** (-i * s), 0);

// F₅[t]: residues mod 5, trailing zeros trimmed
const trim = (a: Poly): Poly => {
  const b = a.map((c) => mod(c));
  while (b.at(-1) === 0) {
    b.pop();
  }
  return b;
};
const plus = (a: Poly, b: Poly): Poly =>
  trim(Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? 0) + (b[i] ?? 0)));
const neg = (a: Poly): Poly => trim(a.map((c) => -c));
const minus = (a: Poly, b: Poly): Poly => plus(a, neg(b));
const times = (a: Poly, b: Poly): Poly => {
  const c = Array.from({ length: a.length + b.length }, () => 0);
  for (const [i, ai] of a.entries()) {
    for (const [j, bj] of b.entries()) {
      c[i + j] += ai * bj;
    }
  }
  return trim(c);
};

/**
a/b in F₅[t], which must divide exactly
*/
const over = (a: Poly, b: Poly): Poly => {
  const r = [...a];
  const q = Array.from({ length: Math.max(a.length - b.length + 1, 0) }, () => 0);
  // 1/lead: c·c³ = c⁴ = 1 mod 5
  const inv = mod((b.at(-1) ?? 0) ** 3);
  for (let i = q.length - 1; i >= 0; i -= 1) {
    q[i] = mod(r[i + b.length - 1] * inv);
    for (const [j, bj] of b.entries()) {
      r[i + j] -= q[i] * bj;
    }
  }
  if (trim(r).length > 0) {
    throw new RangeError('not exact');
  }
  return trim(q);
};

/**
y² + xy − x³ + t⁶, zero exactly when the point is on E
*/
const residue = ({ x, y }: Section): Poly => {
  const [lhs, x2] = [times(plus(y, x), y), times(x, x)];
  return plus(minus(lhs, times(x2, x)), [0, 0, 0, 0, 0, 0, 1]);
};

/**
A + B for x(A) ≠ x(B): λ = Δy/Δx, x = λ² + λ − x_A − x_B, y = −(λ + 1)x − (y_A − λx_A)
*/
const addPoints = (a: Section, b: Section): Section => {
  const l = over(minus(b.y, a.y), minus(b.x, a.x));
  const l1 = plus(l, [1]);
  const x = minus(times(l1, l), plus(a.x, b.x));
  const nu = minus(a.y, times(l, a.x));
  return { x, y: neg(plus(times(l1, x), nu)) };
};

/**
−A = (x, −y − x)
*/
const negate = ({ x, y }: Section): Section => ({ x, y: neg(plus(y, x)) });

/**
The order of t in a polynomial, Infinity for 0
*/
const order = (a: Poly): number => (a.length === 0 ? Infinity : a.findIndex((c) => c !== 0));

/**
6·ĥ(R) by Shioda's formula ĥ = 2χ + 2(R·O) − Σ contr (Schütt–Shioda, arXiv:0907.0298, 11.8), for R with x of
degree ≤ 2 and y ≤ 3, so R meets O nowhere, ∞ included: (R·O) = 0. χ = 1, a rational surface (Δ of degree 12). The
I₁ fibres have one component, contr 0; at the I₆ fibre t = 0 the charts x = tʲx′, y = tʲy′ turn E into
y′² + x′y′ = tʲx′³ − t^(6−2j), two lines at t = 0 for j < 3 and a conic at j = 3, so R meets component
i = min(ord x, ord y, 3), contr i(6 − i)/6
*/
const height6 = ({ x, y }: Section): number => {
  if (x.length > 3 || y.length > 4) {
    throw new RangeError('meets O');
  }
  const i = Math.min(order(x), order(y), 3);
  return 12 - i * (6 - i);
};

/**
The two points: y = 0 forces x³ = t⁶, and x = 0 forces y² = −t⁶ = (2t³)², as 2² = −1 mod 5
*/
const points = { P: { x: [0, 0, 1], y: [] }, Q: { x: [], y: [0, 0, 0, 2] } } as const;

/**
The sister world computed: L from S_1 … S_3 (deg L = 7 − 4), and ⟨P, Q⟩ = (ĥ(P + Q) − ĥ(P) − ĥ(Q))/2
*/
const compute = (): Sister => {
  const sums = [1, 2, 3, 4, 5].map((k) => sum(k));
  const lPoly = fromSums(sums.slice(0, badFibres() - 4));
  const { P, Q } = points;
  const pq = (height6(addPoints(P, Q)) - height6(P) - height6(Q)) / 2;
  return {
    gram: [
      [height6(P), pq],
      [pq, height6(Q)],
    ],
    lPoly,
    sums,
    zero: vanishing(lPoly, p),
  };
};

const sister = compute();

export {
  type Poly,
  type Section,
  addPoints,
  atS,
  badFibres,
  field,
  fromSums,
  height6,
  negate,
  points,
  residue,
  sister,
  sum,
  toSums,
  trace,
  vanishing,
};
