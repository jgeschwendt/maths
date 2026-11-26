/**
The sweep of quadratic twists E^D: D·Y² = x³ + 4x² + 4t⁶ of Ulmer's curve y² + xy = x³ − t⁶ over F₅(t), computed
exactly by `probe/` (`mise run docs`) and read from `twists.tsv`: the L-polynomial of every twist, and for E and
each admissible twist with L(E^D, 1/5) ≠ 0 the invariants of the refined BSD formula and Yun–Zhang's prediction
*/

/**
A rational n/d, kept as the text the probe wrote and as a float for the drawing
*/
type Rational = Readonly<{ text: string; value: number }>;

/**
One row: D, its place classes, the L-polynomial at T = 1/5, and, where computed, |Ш|, τ and the predicted ⟨Z, Z⟩
*/
type Twist = Readonly<{
  admissible: boolean;
  coeffs: readonly number[];
  d: string;
  degOmega?: number;
  eps: number;
  inert: number;
  iz?: Rational;
  izFactors?: string;
  n: number;
  order: number;
  rho?: number;
  sha?: number;
  tamagawa?: number;
  torsion?: number;
}>;

/**
A twist the probe solved: every BSD and Yun–Zhang column is present
*/
type Solved = Twist &
  Required<Pick<Twist, 'degOmega' | 'iz' | 'izFactors' | 'rho' | 'sha' | 'tamagawa' | 'torsion'>>;

const rational = (text: string): Rational => {
  const [n, d = '1'] = text.split('/', 2);
  return { text, value: Number(n) / Number(d) };
};

const optional = <T>(cell: string, read: (s: string) => T): T | undefined =>
  cell === '-' ? undefined : read(cell);

/**
The rows of a TSV the probe wrote, header dropped
*/
const parse = (tsv: string): readonly Twist[] =>
  tsv
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => {
      const c = line.split('\t');
      return {
        admissible: c[4] === 'yes',
        coeffs: c[7].split(',').map(Number),
        d: c[0],
        degOmega: optional(c[11], Number),
        eps: Number(c[6]),
        inert: Number(c[3]),
        iz: optional(c[17], rational),
        izFactors: optional(c[18], String),
        n: Number(c[5]),
        order: Number(c[8]),
        rho: optional(c[15], Number),
        sha: optional(c[14], Number),
        tamagawa: optional(c[12], Number),
        torsion: optional(c[13], Number),
      };
    });

const rows = parse(await Bun.file(new URL('twists.tsv', import.meta.url)).text());

/**
The non-constant twists, E (D = 1) and the constant 2 apart
*/
const twists = rows.filter((r) => r.d !== '1' && r.d !== '2');

/**
The admissible twists with L(E^D, 1/5) ≠ 0: Yun–Zhang's conditions hold and the twisted central value is not zero
*/
const rankZero = twists.filter((r): r is Solved => r.admissible && r.order === 0);

export { type Rational, type Solved, type Twist, parse, rankZero, rational, rows, twists };
