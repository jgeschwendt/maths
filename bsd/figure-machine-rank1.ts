import { toCurve } from './analytic.ts';
import { locus } from './draw-curve.ts';
import { machineRun } from './draw-machine.ts';
import { type View, at } from './draw-plane.ts';
import {
  type Px,
  type Win,
  captions,
  clip,
  dot,
  f,
  line,
  mapper,
  pulse,
  ring,
  svg,
  text,
  timeline,
} from './draw.ts';
import { curves } from './ec.ts';
import { machines } from './model.ts';

/**
5: on 37a1 the running sum at τ_K settles inside a cell, and ℘ carries it to the curve's point (0, 0)
*/
const machineRank1 = (): string => {
  const m = machines['37a1'];
  const curve = curves['37a1'];
  const tl = timeline(30);
  const v: View = { im0: -2.85, im1: 0.75, px0: 8, py0: 50, re0: -0.55, re1: 3.45, scale: 63.5 };
  const run = machineRun(tl, m, v, 'm1c', 14);
  const { w1, w2 } = m.lattice;
  const z = at(v, m.level1.z);
  const cell = [Math.floor(m.level1.z[0] / w1), Math.floor(m.level1.z[1] / w2)];
  const [c0, c1] = [
    at(v, [cell[0] * w1, (cell[1] + 1) * w2]),
    at(v, [(cell[0] + 1) * w1, cell[1] * w2]),
  ];
  const [x, y] = toCurve(
    curve,
    [m.level1.z[0] - cell[0] * w1, m.level1.z[1] - cell[1] * w2],
    m.lattice,
  );
  const landed = `(${f(x[0])}, ${f(y[0])})`;
  const w: Win = { px0: 276, px1: 394, py0: 128, py1: 272, x0: -1.4, x1: 1.75, y0: -2.4, y1: 1.4 };
  const { px, py } = mapper(w);
  const p: Px = [px(Number(f(x[0]))), py(Number(f(y[0])))];
  const [t0, tin] = [14.3, 18.1];
  return svg(
    'on the rank-1 curve the running sum settles inside a cell, at the point (0, 0)',
    300,
    [
      run.svg,
      `<rect x='${f(c0[0])}' y='${f(c0[1])}' width='${f(c1[0] - c0[0])}' height='${f(c1[1] - c0[1])}' fill='currentColor' stroke='none'>${tl.life(t0, { peak: 0.1 })}</rect>`,
      ring(...z, 7, tl.life(t0, { fade: 0.2 })) + dot(...z, 3, tl.life(t0, { fade: 0.2 })),
      text(z[0] + 11, z[1] + 4, 'it settles here', tl.life(t0 + 0.3, { out: t0 + 3.6 })),
      `<g>${tl.life(tin, { fade: 0.6 })}${clip('m1i', w)}<rect x='${w.px0}' y='${w.py0}' width='${w.px1 - w.px0}' height='${w.py1 - w.py0}' opacity='.4' stroke-width='1'/><g clip-path='url(#m1i)'>${locus(
        curve,
        w,
      )
        .map((c) => `<path d='${c.d}'/>`)
        .join('')}</g>${text((w.px0 + w.px1) / 2, w.py0 - 8, 'the curve', '', 'middle')}</g>`,
      line(z, p, " stroke-dasharray='3 3' opacity='.6'", tl.life(tin + 0.6, { peak: 0.6 })),
      dot(...p, 3.5, pulse(tl, 3.5, 8, tin + 0.9, 0.15, 0.6) + tl.life(tin + 0.9, { fade: 0.1 })),
      text(p[0] + 7, p[1] - 7, landed, tl.life(tin + 1)),
      captions(tl, [
        [
          0.3,
          7,
          ['the curve, rolled flat: each cell is one', 'copy of it, the corners are "no point"'],
        ],
        [
          7.2,
          14,
          [
            "the machine adds the graph's numbers,",
            'one term at a time; the dot is the running sum',
          ],
        ],
        [t0, tin, ['it settles strictly inside a cell,', 'not on a corner']],
        [
          tin + 0.2,
          30,
          [
            'inside a cell = an actual point of the curve;',
            `here exactly ${landed}, the P that makes all others`,
          ],
        ],
      ]),
    ].join(''),
  );
};

export { machineRank1 };
