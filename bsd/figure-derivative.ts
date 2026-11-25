import { type Complex, type Lattice, add, sub } from './analytic.ts';
import { type View, at } from './draw-plane.ts';
import {
  type Key,
  type Px,
  type Timeline,
  type Win,
  captions,
  dot,
  f,
  line,
  mapper,
  pathD,
  polyLength,
  pulse,
  ring,
  svg,
  text,
  timeline,
} from './draw.ts';
import { centered, distance } from './heegner.ts';
import { machines, models } from './model.ts';

/**
z moved by a lattice vector into the cell [0, ω1) × [0, ω2)
*/
const inCell = (z: Complex, { w1, w2 }: Lattice): Complex => [
  z[0] - Math.floor(z[0] / w1) * w1,
  z[1] - Math.floor(z[1] / w2) * w2,
];

/**
The segment a → b in C cut where it crosses the grid, each piece moved back into the cell: the step on the torus C/Λ
*/
const wrap = (
  a: Complex,
  b: Complex,
  lattice: Lattice,
): readonly (readonly [Complex, Complex])[] => {
  const cuts = [lattice.w1, lattice.w2].flatMap((w, k) => {
    const [lo, hi] = [Math.min(a[k], b[k]), Math.max(a[k], b[k])];
    return Array.from(
      { length: Math.max(0, Math.ceil(hi / w) - Math.floor(lo / w) - 1) },
      (_, n) => ((Math.floor(lo / w) + 1 + n) * w - a[k]) / (b[k] - a[k]),
    );
  });
  const p = (t: number): Complex => [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
  const ts = [0, ...cuts.toSorted((x, y) => x - y), 1];
  return ts.slice(1).map((t1, i) => {
    const mid = p((ts[i] + t1) / 2);
    const shift = sub(mid, inCell(mid, lattice));
    return [sub(p(ts[i]), shift), sub(p(t1), shift)];
  });
};

const { lattice: L, six } = machines['389a1'];
const zs = six.map(({ z }) => z);
const steps = zs.map((z) => centered(z, L));
const v: View = { im0: 0, im1: L.w2, px0: 168, py0: 64, re0: 0, re1: L.w1, scale: 224 / L.w1 };
const pts = zs.map((z) => at(v, inCell(z, L)));

/**
The steps of the weighted walk: z_i taken i times
*/
const repeated = steps.flatMap((c, i) => Array.from({ length: i }, () => c));

/**
The plain walk's clock [start, seconds a step, gone] and the weighted walk's; tw, the weighted walk's end
*/
const [clock1, clock2] = [[7, 1.1, 17.6] as const, [19, 0.8, 39.1] as const];
const tw = clock2[0] + repeated.length * clock2[1];

/**
When z_i is added, once in the plain walk and i times in the weighted, for its point to pulse
*/
const starts = (i: number): readonly number[] => [
  clock1[0] + i * clock1[1],
  ...Array.from({ length: i }, (_, k) => clock2[0] + ((i * (i - 1)) / 2 + k) * clock2[1]),
];

/**
The label of point i: to its right, or its left within 30 px of the cell's right edge; below when it is the lower of two points within 12 px
*/
const label = (i: number, s: string, life: string): string => {
  const [x, y] = pts[i];
  const isLow = pts.some((q, j) => j !== i && Math.hypot(q[0] - x, q[1] - y) < 12 && q[1] < y);
  const isRight = x > at(v, [L.w1, 0])[0] - 30;
  return text(x + (isRight ? -7 : 7), y + (isLow ? 13 : -5), s, life, isRight ? 'end' : 'start');
};

/**
An arrowhead at b on the segment a → b
*/
const head = (a: Px, b: Px, life: string): string => {
  const n = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const u = [(b[0] - a[0]) / n, (b[1] - a[1]) / n];
  return `<path d='M${f(b[0] - 6 * u[0] + 3.5 * u[1])} ${f(b[1] - 6 * u[1] - 3.5 * u[0])}L${f(b[0])} ${f(b[1])}L${f(b[0] - 6 * u[0] - 3.5 * u[1])} ${f(b[1] - 6 * u[1] + 3.5 * u[0])}'>${life}</path>`;
};

/**
One step s → s + c on the torus, drawn on piece by piece over 3/4 of `step` from t, dimmed once drawn and gone at tEnd
*/
const stepOn = (
  tl: Timeline,
  s: Complex,
  c: Complex,
  t: number,
  [, step, tEnd]: readonly number[],
): string => {
  const pieces = wrap(s, add(s, c), L).map(([a, b]): readonly [Px, Px] => [at(v, a), at(v, b)]);
  const rate = (step * 0.75) / (polyLength(pieces.flat()) || 1);
  let t1 = t;
  const drawn = pieces.map(([a, b]) => {
    // +1: rounding must never leave a sliver showing
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) + 1;
    const t0 = t1;
    t1 += (l - 1) * rate;
    return line(
      a,
      b,
      ` stroke-dasharray='${f(l)} ${f(l)}'`,
      tl.drawOn(l, t0, t1) + tl.life(0, { dim: t1 + 0.3, dimTo: 0.4, fade: 0.01, out: tEnd }),
    );
  });
  const [a, b] = pieces.at(-1) ?? [at(v, s), at(v, s)];
  return (
    drawn.join('') + head(a, b, tl.life(t1, { dim: t1 + 0.3, dimTo: 0.4, fade: 0.05, out: tEnd }))
  );
};

/**
The steps laid tip to tail on the torus from the corner 0, one every `step` seconds from t0; the SVG and the sum in C
*/
const walk = (
  tl: Timeline,
  cs: readonly Complex[],
  clock: readonly number[],
): Readonly<{ end: Complex; svg: string }> => {
  let end: Complex = [0, 0];
  let out = '';
  for (const [i, c] of cs.entries()) {
    out += stepOn(tl, end, c, clock[0] + i * clock[1], clock);
    end = add(end, c);
  }
  return { end, svg: out };
};

/**
The graph of L(389a1, s) near s = 1 in `w`: drawn on at 0.8, its height and flat slope lit at tz, the parabola of its bend at tb
*/
const graph = (tl: Timeline, w: Win, tz: number, tb: number): string => {
  const { at1, value } = models['389a1'];
  const { px, py } = mapper(w);
  const curve = Array.from({ length: 91 }, (_, j): Px => {
    const s = w.x0 + ((w.x1 - w.x0) * j) / 90;
    return [px(s), py(value(s))];
  });
  const bend = Array.from({ length: 61 }, (_, j): Px => {
    const s = 0.62 + (0.76 * j) / 60;
    return [px(s), py((at1[2] / 2) * (s - 1) ** 2)];
  });
  const [lc, lb, lt] = [polyLength(curve), polyLength(bend), px(1.28) - px(0.72)];
  return [
    text((w.px0 + w.px1) / 2, 56, 'the graph, L(s)', '', 'middle'),
    `<g opacity='.45'>${line([w.px0, py(0)], [w.px1, py(0)], " stroke-width='1'")}${line([px(1), w.py0], [px(1), w.py1], " stroke-dasharray='2 3' stroke-width='1'")}${text(px(1), w.py1 + 14, 's = 1', '', 'middle')}</g>`,
    `<path d='${pathD(curve)}' stroke-dasharray='${f(lc)} ${f(lc)}'>${tl.drawOn(lc, 0.8, 3)}${tl.life(0, { fade: 0.01 })}</path>`,
    dot(px(1), py(at1[0]), 3.5, pulse(tl, 3.5, 8, tz) + tl.life(tz, { fade: 0.15 })),
    line(
      [px(0.72), py(0)],
      [px(1.28), py(0)],
      ` stroke-width='3' stroke-dasharray='${f(lt)} ${f(lt)}'`,
      tl.drawOn(lt, tz + 0.6, tz + 1.2) + tl.life(0, { fade: 0.01 }),
    ),
    `<path d='${pathD(bend)}' stroke-width='3' stroke-dasharray='${f(lb)} ${f(lb)}' opacity='.6'>${tl.drawOn(lb, tb, tb + 1.2)}</path>`,
    text(80, 262, 'height 0, slope 0', tl.life(tz + 0.4), 'middle'),
    text(80, 280, `bend ${(at1[2] / 2).toFixed(3)}`, tl.life(tb + 0.6), 'middle'),
  ].join('');
};

/**
The cell, its four corners, and the six points in σ's order, each pulsing as it is added
*/
const torus = (tl: Timeline): string =>
  [
    text(280, 56, 'the points, on C/Λ', '', 'middle'),
    `<g>${tl.life(0.2, { fade: 0.8 })}<rect x='${f(v.px0)}' y='${f(v.py0)}' width='224' height='${f(L.w2 * v.scale)}' stroke-width='1' opacity='.5'/><g opacity='.7'>${(
      [
        [0, 0],
        [L.w1, 0],
        [0, L.w2],
        [L.w1, L.w2],
      ] as const
    )
      .map((z) => ring(...at(v, z), 3.5))
      .join('')}</g></g>`,
    ...pts.map((p, i) =>
      dot(
        ...p,
        3.5,
        tl.anim(
          'r',
          starts(i).flatMap((t): Key[] => [
            [t, 3.5],
            [t + 0.15, 7],
            [t + 0.6, 3.5],
          ]),
        ) + tl.life(1 + i * 0.8, { fade: 0.2 }),
      ),
    ),
    ...pts.map((_, i) =>
      label(i, `z${'₀₁₂₃₄₅'[i]}`, tl.life(1 + i * 0.8, { fade: 0.2, out: 18.4 })),
    ),
    ...pts.map((_, i) => label(i, `×${i}`, tl.life(18.6, { fade: 0.3 }))),
  ].join('');

/**
7: on 389a1 the six Heegner points of conductor 5 on the torus C/Λ laid tip to tail: once each they land on a corner; 0 … 5 times by their place in σ's orbit they do not; beside them the graph's height, slope and bend at 1
*/
const derivative = (): string => {
  const tl = timeline(40);
  const [plain, weighted] = [walk(tl, steps, clock1), walk(tl, repeated, clock2)];
  const [pz, pw] = [at(v, inCell(plain.end, L)), at(v, inCell(weighted.end, L))];
  const corner = at(v, sub(inCell(weighted.end, L), centered(weighted.end, L)));
  return svg(
    'six Heegner points on the torus of 389a1: added they land on a corner, weighted 0 to 5 they do not; beside them the graph of L at s = 1: height 0, slope 0, bend not 0',
    292,
    [
      graph(
        tl,
        { px0: 12, px1: 148, py0: 64, py1: 200, x0: 0.55, x1: 1.45, y0: -0.04, y1: 0.18 },
        14.2,
        tw + 0.6,
      ),
      torus(tl),
      plain.svg,
      ring(...pz, 9, pulse(tl, 9, 16, 13.8, 0.2, 0.8) + tl.life(13.8, { fade: 0.2, out: 17.6 })),
      text(280, 262, 'adds to nothing: a corner', tl.life(14.2), 'middle'),
      weighted.svg,
      dot(...pw, 4, pulse(tl, 4, 9, tw, 0.2, 0.8) + tl.life(tw, { fade: 0.2 })),
      line(pw, corner, " stroke-dasharray='3 3' opacity='.7'", tl.life(tw + 0.3, { peak: 0.7 })),
      text(
        280,
        280,
        `something survives: ${distance(weighted.end, L).toFixed(2)} from a corner`,
        tl.life(tw + 0.6),
        'middle',
      ),
      captions(tl, [
        [0.3, 6.8, ['389a1: six Heegner points, each the last', 'moved by one symmetry σ']],
        [
          6.9,
          17.8,
          [
            'add them tip to tail: they land on a corner,',
            'zero, as the graph has height and slope 0',
          ],
        ],
        [
          18,
          tw + 0.4,
          ['now add each one as often as its place:', 'z₁ once, z₂ twice … z₅ five times'],
        ],
        [
          tw + 0.5,
          tl.endA,
          ['off every corner: something survives,', 'as the graph keeps its bend'],
        ],
      ]),
    ].join(''),
  );
};

export { derivative, inCell, wrap };
