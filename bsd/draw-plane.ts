import type { Complex, Lattice } from './analytic.ts';
import { type Px, type Timeline, f, line, pathD, ring } from './draw.ts';

/**
A view of the complex plane: re0..re1 × im0..im1 at `scale` pixels per unit, its top-left corner at px0, py0
*/
type View = Readonly<{
  im0: number;
  im1: number;
  px0: number;
  py0: number;
  re0: number;
  re1: number;
  scale: number;
}>;

/**
The pixel of z
*/
const at = (v: View, z: Complex): Px => [
  v.px0 + (z[0] - v.re0) * v.scale,
  v.py0 + (v.im1 - z[1]) * v.scale,
];

/**
The view's pixel width and height
*/
const size = (v: View): Px => [(v.re1 - v.re0) * v.scale, (v.im1 - v.im0) * v.scale];

/**
The clip rectangle of the view
*/
const frame = (id: string, v: View): string => {
  const [w, h] = size(v);
  return `<defs><clipPath id='${id}'><rect x='${f(v.px0)}' y='${f(v.py0)}' width='${f(w)}' height='${f(h)}'/></clipPath></defs>`;
};

/**
The lattice's grid lines and corners in view, fading in at t: each cell one copy of the curve, each corner the point at infinity
*/
const grid = (tl: Timeline, v: View, { w1, w2 }: Lattice, t: number, fade: number): string => {
  const [w, h] = size(v);
  const is = Array.from(
    { length: Math.floor(v.re1 / w1) - Math.ceil(v.re0 / w1) + 1 },
    (_, k) => Math.ceil(v.re0 / w1) + k,
  );
  const js = Array.from(
    { length: Math.floor(v.im1 / w2) - Math.ceil(v.im0 / w2) + 1 },
    (_, k) => Math.ceil(v.im0 / w2) + k,
  );
  const lines = [
    ...is.map((i) => line([at(v, [i * w1, 0])[0], v.py0], [at(v, [i * w1, 0])[0], v.py0 + h])),
    ...js.map((j) => line([v.px0, at(v, [0, j * w2])[1]], [v.px0 + w, at(v, [0, j * w2])[1]])),
  ];
  const corners = is.flatMap((i) => js.map((j) => ring(...at(v, [i * w1, j * w2]), 3.5)));
  return `<g>${tl.life(t, { fade })}<g opacity='.3' stroke-width='1'>${lines.join('')}</g><g opacity='.7'>${corners.join('')}</g></g>`;
};

/**
A path of pixels drawn on term by term: the stroke and a dot riding its tip reach term m at when(m), for each
milestone m from `first` on; points closer than minStep to the last kept are dropped
*/
const drawByTerms = (
  tl: Timeline,
  pixels: readonly Px[],
  first: number,
  milestones: readonly number[],
  when: (m: number) => number,
  minStep = 0.3,
): Readonly<{ anim: string; d: string; length: number; motion: string }> => {
  const pts = pixels.map((p): Px => [Number(f(p[0])), Number(f(p[1]))]);
  const kept: Px[] = [pts[first]];
  const cum: number[] = Array.from({ length: pts.length }, () => 0);
  let length = 0;
  for (let n = first + 1; n < pts.length; n += 1) {
    const last = kept.at(-1) ?? pts[first];
    const s = Math.hypot(pts[n][0] - last[0], pts[n][1] - last[1]);
    if (s >= minStep || n === pts.length - 1) {
      kept.push(pts[n]);
      length += s;
    }
    cum[n] = length;
  }
  const ms = milestones.filter((m) => m >= first);
  const t0 = when(first);
  return {
    anim: tl.anim('stroke-dashoffset', [
      [0, length],
      [t0, length],
      ...ms.map((m) => [when(m), length - cum[m]] as const),
    ]),
    d: pathD(kept),
    length,
    motion: `<animateMotion dur='${tl.duration}s' repeatCount='indefinite' path='${pathD(kept)}' calcMode='linear' keyPoints='0;0;${ms.map((m) => (cum[m] / length).toFixed(4)).join(';')};1' keyTimes='0;${(t0 / tl.duration).toFixed(4)};${ms.map((m) => (when(m) / tl.duration).toFixed(4)).join(';')};1'/>`,
  };
};

export { type View, at, drawByTerms, frame, grid, size };
