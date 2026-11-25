import type { Complex } from './analytic.ts';
import { machineRun } from './draw-machine.ts';
import { type View, at, drawByTerms } from './draw-plane.ts';
import { type Px, captions, dot, f, line, pulse, ring, svg, text, timeline } from './draw.ts';
import { machines } from './model.ts';

/**
6: on 389a1 the same machine lands on a corner of the grid, the point at infinity; a 1 000× inset shows the landing
*/
const machineRank2 = (): string => {
  const m = machines['389a1'];
  const tl = timeline(30);
  const v: View = { im0: -4.55, im1: 0.6, px0: 8, py0: 48, re0: -1.25, re1: 3, scale: 47.4 };
  const run = machineRun(tl, m, v, 'm2c', 17);
  const { w1, w2 } = m.lattice;
  const corner: Complex = [
    Math.round(m.level1.z[0] / w1) * w1,
    Math.round(m.level1.z[1] / w2) * w2,
  ];
  const node = at(v, corner);
  // the inset: a 152 px square around the corner, hw units either side
  const [hw, zc, tz, t0] = [0.076, [316, 180] as Px, 8.5, 17.3];
  const zs = 76 / hw;
  const zoom = (z: Complex): Px => [
    zc[0] + (z[0] - corner[0]) * zs,
    zc[1] - (z[1] - corner[1]) * zs,
  ];
  const zp = m.level1.path.map((z) => zoom(z));
  const first = zp.findIndex((_, n) =>
    zp.slice(n).every((q) => Math.abs(q[0] - zc[0]) < 120 && Math.abs(q[1] - zc[1]) < 120),
  );
  const zt = drawByTerms(tl, zp, first, run.marks, run.when, 0.4);
  const [bx, by, side] = [node[0] - hw * v.scale, node[1] - hw * v.scale, 2 * hw * v.scale];
  const [ix, iy] = [zc[0] - 76, zc[1] - 76];
  return svg(
    'on the rank-2 curve the running sum lands on a corner of the grid: no point',
    300,
    [
      run.svg,
      `<g>${tl.life(tz, { fade: 0.6 })}<rect x='${f(bx)}' y='${f(by)}' width='${f(side)}' height='${f(side)}' stroke-width='1'/><g opacity='.35' stroke-width='1'>${line([bx + side, by], [ix, iy])}${line([bx + side, by + side], [ix, iy + 152])}</g>`,
      `<defs><clipPath id='m2z'><rect x='${ix}' y='${iy}' width='152' height='152'/></clipPath></defs><rect x='${ix}' y='${iy}' width='152' height='152' stroke-width='1' opacity='.6'/>`,
      `<g opacity='.3' stroke-width='1'>${line([zc[0], iy], [zc[0], iy + 152])}${line([ix, zc[1]], [ix + 152, zc[1]])}</g><circle cx='${zc[0]}' cy='${zc[1]}' r='5' opacity='.8'/>${text(zc[0], zc[1] + 94, `${Math.round(zs / v.scale)}× closer`, '', 'middle')}</g>`,
      `<g clip-path='url(#m2z)'><path d='${zt.d}' stroke-dasharray='${f(zt.length)} ${f(zt.length)}' stroke-linejoin='round'>${zt.anim}${tl.life(0, { fade: 0.01 })}</path><circle cx='0' cy='0' r='3' fill='currentColor' stroke='none'>${zt.motion}${tl.life(tz, { fade: 0.3, out: t0 })}</circle></g>`,
      ring(...zc, 9, pulse(tl, 9, 16, t0, 0.2, 0.8) + tl.life(t0, { fade: 0.2 })) +
        dot(...zc, 3.5, tl.life(t0, { fade: 0.2 })),
      ring(...node, 7, tl.life(t0, { fade: 0.2 })) + dot(...node, 3, tl.life(t0, { fade: 0.2 })),
      captions(tl, [
        [0.3, 7, ['rank 2: the same machine on the curve', 'with two directions of points']],
        [7.2, 17, ['the running sum, one term at a time', '(right: the end of it, magnified)']],
        [t0, 22.6, ['it lands exactly on a corner of the grid', '(off by less than a trillionth)']],
        [
          22.8,
          30,
          [
            'a corner of the grid = the point at infinity',
            '= no point: the machine comes back empty',
          ],
        ],
      ]),
    ].join(''),
  );
};

export { machineRank2 };
