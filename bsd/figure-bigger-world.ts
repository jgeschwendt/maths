import { type Complex, add, sub } from './analytic.ts';
import { type View, at, frame, grid } from './draw-plane.ts';
import {
  type Px,
  type Timeline,
  dot,
  f,
  line,
  pathD,
  polyLength,
  pulse,
  ring,
  svg,
  text,
  timeline,
} from './draw.ts';
import { centered, distance } from './heegner.ts';
import { machines } from './model.ts';

const v: View = { im0: -1.3, im1: 2.3, px0: 23.3, py0: 48, re0: -2.85, re1: 2.85, scale: 62 };

/**
A run's path shifted by a lattice vector, kept to points 0.3 px apart, with its drawn length and end
*/
const walk = (
  path: readonly Complex[],
  shift: Complex,
): Readonly<{ d: string; end: Px; length: number }> => {
  const kept: Px[] = [];
  for (const z of path) {
    // measured on the points as drawn, rounded
    const [x, y] = at(v, add(z, shift)).map((c) => Number(f(c)));
    const l = kept.at(-1);
    if (!l || Math.hypot(x - l[0], y - l[1]) > 0.3) {
      kept.push([x, y]);
    }
  }
  const end = at(v, add(path.at(-1) ?? shift, shift));
  kept.push(end);
  const shown = kept.filter(
    (p, i) =>
      i === 0 ||
      i === kept.length - 1 ||
      Math.hypot(p[0] - kept[i - 1][0], p[1] - kept[i - 1][1]) > 0.25,
  );
  return { d: pathD(shown), end, length: polyLength(kept) + 2 };
};

/**
The vectors laid head to tail from the corner 0, one arrow every `step` seconds from t0, gone at tEnd
*/
const hop = (
  tl: Timeline,
  vs: readonly Complex[],
  t0: number,
  step: number,
  tEnd: number,
): Readonly<{ end: Complex; svg: string }> => {
  let s: Complex = [0, 0];
  let out = '';
  for (const [i, z] of vs.entries()) {
    const [a, c] = [at(v, s), at(v, add(s, z))];
    // +1: rounding must never leave a sliver showing
    const l = Math.hypot(c[0] - a[0], c[1] - a[1]) + 1;
    const [t, u] = [t0 + i * step, [(c[0] - a[0]) / l, (c[1] - a[1]) / l]];
    out += `${line(a, c, ` stroke-width='2' stroke-dasharray='${f(l)} ${f(l)}'`, tl.drawOn(l, t, t + step * 0.8) + tl.life(0, { fade: 0.01, out: tEnd }))}<path d='M${f(c[0] - 7 * u[0] + 4 * u[1])} ${f(c[1] - 7 * u[1] - 4 * u[0])}L${f(c[0])} ${f(c[1])}L${f(c[0] - 7 * u[0] - 4 * u[1])} ${f(c[1] - 7 * u[1] + 4 * u[0])}' stroke-width='2'>${tl.life(t + step * 0.8, { fade: 0.1, out: tEnd })}</path>`;
    s = add(s, z);
  }
  return { end: s, svg: out };
};

/**
6c: at conductor 5 the machine on 389a1 lands six times, never on a corner; the six sum to a corner, and weighted 0 … 5 they do not
*/
const biggerWorld = (): string => {
  const m = machines['389a1'];
  const tl = timeline(38);
  const {
    lattice,
    level1: { z: zk },
  } = m;
  // each walk shifted by the lattice vector that brings its end nearest the corner 0
  const w0 = walk(m.level1.path, sub(centered(zk, lattice), zk));
  const walks = m.six.map(({ path, z }) => walk(path, sub(centered(z, lattice), z)));
  const ends = walks.map((w) => w.end);
  // labels go to the side of the corner's vertical they are on; two ends sit on it, split them
  const [cx0] = at(v, [0, 0]);
  const onLine = ends
    .flatMap((e, i) => (Math.abs(e[0] - cx0) < 2 ? [i] : []))
    .toSorted((a, b) => ends[a][1] - ends[b][1]);
  const side = (i: number): number => {
    const k = onLine.indexOf(i);
    return k === -1 ? Math.sign(ends[i][0] - cx0) : 2 * k - 1;
  };
  const label = (i: number, dy: number, s: string, t: number, fade: number): string =>
    text(
      ends[i][0] + 7 * side(i),
      ends[i][1] + dy,
      s,
      tl.life(t, { fade }),
      side(i) < 0 ? 'end' : 'start',
    );
  const h3 = hop(
    tl,
    m.six.map(({ z }) => centered(z, lattice)),
    19.6,
    0.9,
    27.8,
  );
  const h4 = hop(
    tl,
    m.six.map(({ z }, i) => centered([i * z[0], i * z[1]], lattice)),
    28.6,
    0.8,
    38,
  );
  const [c3, c4] = [at(v, h3.end), at(v, h4.end)];
  const near = at(v, sub(h4.end, centered(h4.end, lattice)));
  const cap = (t0: number, t1: number, lines: readonly string[]): string =>
    `<g>${tl.life(t0, { fade: 0.3, out: t1 })}${lines.map((l, i) => text(200, 16 + i * 15, l, '', 'middle')).join('')}</g>`;
  return svg(
    'at conductor 5 the machine lands six times; the six sum to a corner, weighted they do not',
    282,
    [
      frame('bwc', v),
      grid(tl, v, lattice, 0.1, 0.8),
      `<g clip-path='url(#bwc)'><path d='${w0.d}' stroke-width='1' stroke-linejoin='round' stroke-dasharray='${f(w0.length)} ${f(w0.length)}'>${tl.drawOn(w0.length, 0.8, 4.2)}${tl.life(0, { dim: 6.4, dimTo: 0.12, fade: 0.01, peak: 0.8 })}</path></g>`,
      ring(...w0.end, 8, tl.life(4.2, { dim: 6.4, dimTo: 0.25, fade: 0.2 })),
      ...walks.map((wk, i) => {
        const [t0, t1] = [7 + i * 1.7, 8.5 + i * 1.7];
        return `<g clip-path='url(#bwc)'><path d='${wk.d}' stroke-width='1' stroke-linejoin='round' stroke-dasharray='${f(wk.length)} ${f(wk.length)}'>${tl.drawOn(wk.length, t0, t1)}${tl.life(0, { dim: t1 + 0.2, dimTo: 0.12, fade: 0.01, peak: 0.55 })}</path></g>${dot(...wk.end, 3.5, pulse(tl, 3.5, 8, t1) + tl.life(t1, { fade: 0.15 }))}`;
      }),
      ...ends.map((_, i) => label(i, -6, `${i + 1}`, 8.5 + i * 1.7, 0.2)),
      h3.svg,
      ring(...c3, 9, pulse(tl, 9, 16, 25, 0.2, 0.8) + tl.life(25, { fade: 0.2, out: 27.8 })),
      dot(...c3, 3.5, tl.life(25, { fade: 0.2, out: 27.8 })),
      h4.svg,
      ...ends.map((_, i) => label(i, 14, `×${i}`, 28.2, 0.3)),
      ring(...c4, 8, pulse(tl, 8, 14, 33.4, 0.2, 0.8) + tl.life(33.4, { fade: 0.2 })) +
        dot(...c4, 3.5, tl.life(33.4, { fade: 0.2 })),
      line(c4, near, " stroke-dasharray='3 3' opacity='.6'", tl.life(33.9, { peak: 0.6 })),
      text(
        c4[0] - 12,
        c4[1] + 4,
        `${distance(h4.end, lattice).toFixed(2)} from a corner`,
        tl.life(33.9),
        'end',
      ),
      cap(0.2, 6.5, [
        'before: the machine on this curve',
        'lands on a corner of the grid (no point)',
      ]),
      cap(6.7, 19.3, [
        'same machine, run in a bigger number world:',
        'it lands six times. none is a corner',
      ]),
      cap(19.5, 28.3, [
        'add the six together: they cancel exactly.',
        'that corner was six points hiding',
      ]),
      cap(28.5, tl.endA, ['weigh them 0, 1, 2, 3, 4, 5 before adding:', 'now it does not cancel']),
    ].join(''),
  );
};

export { biggerWorld };
