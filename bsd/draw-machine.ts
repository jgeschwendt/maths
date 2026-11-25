import { type View, at, drawByTerms, frame, grid, size } from './draw-plane.ts';
import { type Timeline, f, text } from './draw.ts';
import type { Machine } from './model.ts';

/**
The terms at which the running sum's drawing is timed
*/
const milestones = [
  1, 2, 3, 4, 5, 6, 8, 10, 13, 16, 20, 25, 30, 40, 50, 70, 100, 150, 200, 300, 500, 700, 1000, 1500,
  2000, 2500,
];

/**
The shared half of figures 5 and 6: the lattice, the running sum drawn from 0 between t = 3 and `end` on a log
clock, and the counter of terms added; returns the SVG and the clock
*/
const machineRun = (
  tl: Timeline,
  m: Machine,
  v: View,
  id: string,
  end: number,
): Readonly<{ svg: string; when: (n: number) => number; marks: readonly number[] }> => {
  const total = m.level1.path.length - 1;
  const when = (n: number): number => 3 + ((end - 3) * Math.log(1 + n)) / Math.log(1 + total);
  const marks = [...milestones.filter((x) => x < total), total];
  const trace = drawByTerms(
    tl,
    m.level1.path.map((z) => at(v, z)),
    0,
    marks,
    when,
  );
  const shown = [1, 2, 3, 5, 10, 20, 50, 100, 200, 500, 1000, 2500].filter((x) => x <= total);
  const [, h] = size(v);
  const origin = at(v, [0, 0]);
  return {
    marks,
    svg: [
      frame(id, v),
      grid(tl, v, m.lattice, 0.2, 1),
      `<g>${tl.life(0.2, { fade: 1 })}<g opacity='.5'>${text(origin[0] + 6, origin[1] - 6, 'start')}</g></g>`,
      `<g clip-path='url(#${id})'><path d='${trace.d}' stroke-dasharray='${f(trace.length)} ${f(trace.length)}' stroke-linejoin='round'>${trace.anim}${tl.life(0, { fade: 0.01 })}</path>`,
      `<circle cx='0' cy='0' r='3' fill='currentColor' stroke='none'>${trace.motion}${tl.life(3, { fade: 0.1, out: end + 0.3 })}</circle></g>`,
      ...shown.map((n, i) =>
        text(
          v.px0 + 4,
          v.py0 + h - 6,
          `${n} term${n > 1 ? 's' : ''} added`,
          tl.life(when(n), {
            fade: 0.05,
            out: i + 1 < shown.length ? when(shown[i + 1]) - 0.05 : tl.endA,
          }),
        ),
      ),
    ].join(''),
    when,
  };
};

export { machineRun };
