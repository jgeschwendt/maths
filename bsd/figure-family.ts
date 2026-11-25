import { locus } from './draw-curve.ts';
import {
  type Px,
  type Win,
  clip,
  dot,
  isInside,
  line,
  mapper,
  pathD,
  ring,
  svg,
  text,
} from './draw.ts';
import { type Point, float, plus, times, write } from './ec.ts';
import { type Member, family, taylor } from './family.ts';

/**
The real curve's window and the graph's: s from 0.7 to 1.3, the height scaled to each member with 0 marked
*/
const plane: Win = { px0: 8, px1: 188, py0: 50, py1: 190, x0: -2, x1: 3.5, y0: -5, y1: 4 };
const graphAt = (y0: number, y1: number): Win => ({
  px0: 210,
  px1: 368,
  py0: 50,
  py1: 190,
  x0: 0.7,
  x1: 1.3,
  y0,
  y1,
});

/**
Where the dial starts, and the strip's column of t
*/
const start = -5;
const cx = (t: number): number => 240 + t * 28;

const minus = (s: string): string => s.replace('-', '−');
const coordinates = (p: Point): string => (p ? `(${write(p.x)}, ${write(p.y)})` : '');

/**
a·P + b·Q for |a|, |b| ≤ 3, the generators' small combinations
*/
const combinations = ({ curve }: Member): readonly Point[] => {
  const [p, q] = curve.generators;
  const span = [-3, -2, -1, 0, 1, 2, 3];
  return span.flatMap((a) =>
    (q ? span : [0]).map((b) => plus(curve, times(curve, a, p), times(curve, b, q))),
  );
};

/**
The curve with its generators lit and their small combinations faint
*/
const curvePanel = (m: Member): string => {
  const { px, py } = mapper(plane);
  const names = ['P', 'Q'];
  const near = combinations(m).filter(
    (p): p is NonNullable<Point> => p !== undefined && isInside(plane, float(p.x), float(p.y)),
  );
  const lines =
    m.curve.rank === 0
      ? ['no point of infinite order']
      : m.curve.generators.map((g, k) => `${names[k]} = ${coordinates(g)}`);
  return [
    `<g opacity='.25'>${line([plane.px0, py(0)], [plane.px1, py(0)], " stroke-width='1'")}${line([px(0), plane.py0], [px(0), plane.py1], " stroke-width='1'")}</g>`,
    `<g clip-path='url(#fmc)'>${locus(m.curve, plane)
      .map((c) => `<path d='${c.d}' stroke-width='2'/>`)
      .join('')}</g>`,
    `<g opacity='.35'>${near.map((p) => dot(px(float(p.x)), py(float(p.y)), 2)).join('')}</g>`,
    m.curve.generators
      .map((g, k) => {
        const [x, y] = g ? [px(float(g.x)), py(float(g.y))] : [0, 0];
        return `${dot(x, y, 4)}${text(x + 7, y - 6, names[k])}`;
      })
      .join(''),
    ...lines.map((s, j) => text(98, 222 + j * 15, minus(s), '', 'middle')),
  ].join('');
};

/**
L(s) near s = 1, its value at 1 lit, with what the Taylor coefficients say
*/
const graphPanel = (m: Member): string => {
  const ss = Array.from({ length: 121 }, (_, j) => 0.7 + j / 200);
  const vs = ss.map((s) => m.value(s));
  const [lo, hi] = [Math.min(0, ...vs), Math.max(0, ...vs)];
  const pad = (hi - lo) * 0.08;
  const w = graphAt(lo - pad, hi + pad);
  const { px, py } = mapper(w);
  const pts = ss.map((s, j): Px => [px(s), py(vs[j])]);
  const [c0, c1, c2] = taylor(m.at1).map((c) => c.toFixed(3));
  const says = [
    [`L(1) = ${c0}`, 'not zero'],
    ['L(1) = 0', `slope ${c1}`],
    ['L(1) = 0, slope 0', `bend ${c2}`],
  ][m.order];
  return [
    `<g opacity='.45'>${line([w.px0, py(0)], [w.px1, py(0)], " stroke-width='1'")}${text(w.px1 + 4, py(0) + 4, '0')}${text(w.px1 + 4, py(hi) + 4, hi.toFixed(2))}${line([px(1), w.py0], [px(1), w.py1], " stroke-dasharray='2 3' stroke-width='1'")}${text(px(1), w.py1 + 13, 's = 1', '', 'middle')}${text(w.px0, w.py1 + 13, '0.7')}${text(w.px1, w.py1 + 13, '1.3', '', 'end')}</g>`,
    `<path d='${pathD(pts)}' stroke-width='2'/>`,
    dot(px(1), py(m.at1[0]), 3.5),
    ...says.map((s, j) => text(289, 222 + j * 15, minus(s), '', 'middle')),
  ].join('');
};

/**
The strip under the panels: each t with its generators as dots and its numerical zero order as rings
*/
const strip = (current: number): string =>
  [
    `<g opacity='.6'>${text(8, 262, 't')}${text(8, 280, 'points')}${text(8, 298, 'zeros')}</g>`,
    ...family.map((m) => {
      const x = cx(m.t);
      const marks = (k: number, y: number, draw: (x: number, y: number) => string): string =>
        Array.from({ length: k }, (_, j) => draw(x + (j - (k - 1) / 2) * 9, y)).join('');
      return `<g opacity='${m.t === current ? 1 : 0.4}'>${text(x, 262, minus(String(m.t)), '', 'middle')}${marks(m.curve.rank, 276, (a, b) => dot(a, b, 3))}${marks(m.order, 294, (a, b) => ring(a, b, 3))}</g>`;
    }),
  ].join('');

/**
One member's frame: its equation and label, the two panels, the strip with its column lit
*/
const frame = (m: Member): string =>
  `<g data-t='${m.t}' display='${m.t === start ? 'inline' : 'none'}'>${text(200, 16, minus(`y² + y = x³ + x + ${m.t}`.replace('+ -', '- ')), '', 'middle')}<g opacity='.55'>${text(200, 32, `Cremona ${m.label}, conductor ${m.curve.conductor}, rank ${m.curve.rank}`, '', 'middle')}</g>${curvePanel(m)}${graphPanel(m)}<rect x='${cx(m.t) - 13}' y='248' width='26' height='56' rx='5' opacity='.35' stroke-width='1'/>${strip(m.t)}</g>`;

/**
The dial's script: dial.ts as JavaScript, wired to every `[data-dial]` on the page
*/
const transpiler = new Bun.Transpiler({ loader: 'ts' });
const script = (source: string): string =>
  `<script type="module">${transpiler.transformSync(source)}for (const root of document.querySelectorAll('[data-dial]')) wire(root);</script>`;

const dialSource = await Bun.file(new URL('dial.ts', import.meta.url)).text();

/**
Watch a rank being born: y² + y = x³ + x + t on a dial, the real curve and its points beside L(s) near 1
*/
const familyDial = (): string =>
  `<div data-dial>${svg(
    'y² + y = x³ + x + t on a dial: the points needed and the zeros of L at s = 1 change together',
    310,
    `${clip('fmc', plane)}${family.map((m) => frame(m)).join('')}`,
  )}<div class="row dial"><button type="button" class="btn btn-sm btn-outline" data-step="-1" aria-label="t down">‹</button><input type="range" min="${family[0].t}" max="${family.at(-1)?.t}" step="1" value="${start}" aria-label="t"><button type="button" class="btn btn-sm btn-outline" data-step="1" aria-label="t up">›</button><output>t = ${minus(String(start))}</output></div>${script(dialSource)}</div>`;

export { familyDial };
