import { roots } from './analytic.ts';
import {
  type Px,
  type Timeline,
  type Win,
  dot,
  f,
  isInside,
  line,
  lineSpan,
  mapper,
  pathD,
  polyLength,
  pulse,
  ring,
  text,
} from './draw.ts';
import { type Curve, type Point, chord, float } from './ec.ts';

/**
One chord-and-tangent step in floats: from A through B, the third meeting point and the sum; no slope is vertical
*/
type Step = Readonly<{ a: Px; b: Px; slope?: number; sum?: Px; third?: Px }>;

/**
How a step is drawn: when its line dims, its sum's label and the label's offset, slowed for the first step
*/
type StepStyle = Readonly<{
  dimAt: number;
  dx?: number;
  dy?: number;
  label: string;
  slow?: boolean;
}>;

const xy = (point: Point): Px | undefined => point && [float(point.x), float(point.y)];
const dash = (length: number): string =>
  ` stroke-width='1' stroke-dasharray='${f(length)} ${f(length)}'`;

/**
The step from p through q, in floats
*/
const step = (curve: Curve, p: Point, q: Point): Step => {
  const { slope, sum, third } = chord(curve, p, q);
  return {
    a: xy(p) ?? [0, 0],
    b: xy(q) ?? [0, 0],
    slope: slope && float(slope),
    sum: xy(sum),
    third: xy(third),
  };
};

/**
The steps P → 2P → … → (count + 1)·P, each the line through nP and P
*/
const multiples = (curve: Curve, start: Point, count: number): readonly Step[] => {
  const out: Step[] = [];
  let r = start;
  for (let n = 0; n < count; n += 1) {
    out.push(step(curve, r, start));
    r = chord(curve, r, start).sum;
  }
  return out;
};

/**
The real locus as paths: the unbounded branch from e1, and the egg between e3 and e2 when there is one
*/
const locus = (curve: Curve, w: Win): readonly Readonly<{ d: string; length: number }>[] => {
  const [, a2, a3, a4, a6] = curve.a.map(Number);
  const { px, py } = mapper(w);
  const ys = (x: number): Px => {
    const r = Math.sqrt(Math.max(0, 4 * (((x + a2) * x + a4) * x + a6) + a3 * a3));
    return [(-a3 + r) / 2, (-a3 - r) / 2];
  };
  const e = roots(curve);
  const [e1, e2, e3] = e;
  const span = Math.sqrt(w.x1 + 0.5 - e1);
  // the branch from its lower end through e1 to its upper end, denser near e1
  const branch = Array.from({ length: 181 }, (_, k): Px => {
    const x = e1 + (span * Math.abs(k - 90)) ** 2 / 8100;
    return [px(x), py(ys(x)[k < 90 ? 1 : 0])];
  });
  const egg = Array.from({ length: 181 }, (_, k): Px => {
    const x = e3 + ((e2 - e3) * (1 - Math.cos((Math.PI * k) / 90))) / 2;
    return [px(x), py(ys(x)[k <= 90 ? 0 : 1])];
  });
  const parts: readonly (readonly Px[])[] = e.length === 3 ? [branch, egg] : [branch];
  return parts.map((p) => ({ d: pathD(p), length: polyLength(p) }));
};

/**
The locus drawn on between t0 and t1
*/
const curveLayer = (tl: Timeline, curve: Curve, w: Win, t0: number, t1: number): string =>
  locus(curve, w)
    .map(
      (c) =>
        `<path d='${c.d}' stroke-width='2.2' stroke-dasharray='${f(c.length)} ${f(c.length)}'>${tl.drawOn(c.length, t0, t1)}${tl.life(0, { fade: 0.01 })}</path>`,
    )
    .join('');

/**
The mirror line y = −a3/2, dashed, labelled at x
*/
const mirrorLine = (tl: Timeline, w: Win, curve: Curve, t: number, x: number): string => {
  const y = mapper(w).py(-Number(curve.a[2]) / 2);
  return `<g>${tl.life(t)}<g opacity='.4'>${line([w.px0, y], [w.px1, y], " stroke-dasharray='2 4' stroke-width='1'")}${text(x, y + 13, 'mirror')}</g></g>`;
};

/**
One step drawn from t: the line, the third point, its drop across the mirror, the sum lighting with its label
*/
const stepSvg = (tl: Timeline, w: Win, s: Step, t: number, o: StepStyle): string => {
  const { px, py } = mapper(w);
  const k = o.slow === true ? 1.5 : 1;
  const [tDrop, tLit] = [t + 1.35 * k, t + 2 * k];
  const pa: Px = [px(s.a[0]), py(s.a[1])];
  if (s.slope === undefined || !s.third || !s.sum) {
    const sp = lineSpan(w, pa, [0, -1], [0, pa[1] - w.py0], 0);
    return line(
      sp.from,
      sp.to,
      dash(sp.length),
      tl.drawOn(sp.length, t, t + 0.9 * k) +
        tl.life(t, { dim: o.dimAt, dimTo: 0.4, fade: 0.05, peak: 0.8 }),
    );
  }
  const [p3, ps] = [s.third, s.sum].map((p): Px => [px(p[0]), py(p[1])]);
  const d: Px = [px(1) - px(0), py(s.slope) - py(0)];
  const along = (p: Px): number =>
    ((p[0] - pa[0]) * d[0] + (p[1] - pa[1]) * d[1]) / Math.hypot(...d);
  const sp = lineSpan(w, pa, d, [0, along([px(s.b[0]), py(s.b[1])]), along(p3)], 22);
  // drawn from A's end
  const [p0, p1] = Math.abs(sp.lo) < Math.abs(sp.hi) ? [sp.from, sp.to] : [sp.to, sp.from];
  const [isThirdShown, isSumShown] = [isInside(w, ...s.third), isInside(w, ...s.sum)];
  const fall = [
    [tDrop, p3[1]],
    [t + 1.95 * k, ps[1]],
  ] as const;
  const dx = o.dx ?? 7;
  return [
    line(
      p0,
      p1,
      dash(sp.length),
      tl.drawOn(sp.length, t, t + 0.9 * k) +
        tl.life(t, { dim: o.dimAt, dimTo: 0.12, fade: 0.05, peak: 0.65 }),
    ),
    isThirdShown ? ring(...p3, 4.5, tl.life(t + k, { dim: o.dimAt, dimTo: 0, fade: 0.2 })) : '',
    isThirdShown && isSumShown
      ? line(
          p3,
          [ps[0], p3[1]],
          " stroke-dasharray='3 3' opacity='.7'",
          tl.anim('y2', fall) + tl.life(tDrop, { dim: o.dimAt, dimTo: 0, fade: 0.1, peak: 0.7 }),
        ) + dot(...p3, 2.5, tl.anim('cy', fall) + tl.life(tDrop, { fade: 0.1, out: tLit }))
      : '',
    isSumShown
      ? dot(...ps, 3.5, pulse(tl, 3.5, 8, tLit) + tl.life(tLit, { fade: 0.1 })) +
        text(
          ps[0] + dx,
          ps[1] + (o.dy ?? -6),
          o.label,
          tl.life(tLit, { dim: o.dimAt + 1.5, dimTo: 0.55, fade: 0.2 }),
          dx < 0 ? 'end' : 'start',
        )
      : '',
  ].join('');
};

/**
An arrowhead at the frame's edge where the ray from an on-page point toward an off-page one leaves it
*/
const edgeMark = (w: Win, from: Px, to: Px): Readonly<{ d: string; x: number; y: number }> => {
  const { px, py } = mapper(w);
  const a: Px = [px(from[0]), py(from[1])];
  const sp = lineSpan(w, a, [px(to[0]) - a[0], py(to[1]) - a[1]], [0, 1e9], 0);
  const [[x, y], [ux, uy]] = [sp.to, sp.u];
  const head = (s: number): string => `${f(x - 8 * ux + s * 5 * uy)} ${f(y - 8 * uy - s * 5 * ux)}`;
  return { d: `M${head(1)}L${f(x)} ${f(y)}L${head(-1)}`, x, y };
};

export { type Step, curveLayer, edgeMark, locus, mirrorLine, multiples, step, stepSvg };
