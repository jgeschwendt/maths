import { curveLayer, mirrorLine, step, stepSvg } from './draw-curve.ts';
import {
  type Win,
  captions,
  clip,
  dot,
  line,
  mapper,
  pulse,
  ring,
  svg,
  text,
  timeline,
} from './draw.ts';
import { curves, float, plus, times, write } from './ec.ts';

/**
The grid cells in the order they light: the two generators, their sum, then outward ring by ring
*/
const order: readonly (readonly [number, number])[] = [
  [1, 0],
  [0, 1],
  [1, 1],
  [-1, 0],
  [0, -1],
  [1, -1],
  [-1, 1],
  [-1, -1],
  [2, 0],
  [0, 2],
  [-2, 0],
  [0, -2],
  [2, 1],
  [1, 2],
  [-1, 2],
  [-2, 1],
  [-2, -1],
  [-1, -2],
  [1, -2],
  [2, -1],
  [2, 2],
  [-2, 2],
  [-2, -2],
  [2, -2],
];

/**
The name of a·P + b·Q: `P`, `-Q`, `2P+Q`
*/
const term = (k: number, s: string): string =>
  k === 0 ? '' : `${['-2', '-', '', '', '2'][k + 2]}${s}`;
const name = (a: number, b: number): string =>
  [term(a, 'P'), term(b, 'Q')].filter(Boolean).join('+').replace('+-', '-');

/**
The grid cell of (a, b)
*/
const gx = (a: number): number => 75 + a * 22;
const gy = (b: number): number => 168 - b * 22;

/**
2c: on 389a1 two generators P = (0, 0) and Q = (1, 0) make every point as a·P + b·Q
*/
const pointsRank2 = (): string => {
  const curve = curves['389a1'];
  const [P, Q] = curve.generators;
  const tl = timeline(34);
  const w: Win = { px0: 150, px1: 396, py0: 46, py1: 292, x0: -2.35, x1: 3.45, y0: -6.7, y1: 5.7 };
  const { px, py } = mapper(w);
  const cells = [-2, -1, 0, 1, 2].flatMap((a) =>
    [-2, -1, 0, 1, 2].map((b) => ring(gx(a), gy(b), 4, '', " opacity='.5'")),
  );
  const lights = order.map(([a, b], i) => {
    const t = [1.6, 2.8, 7.2][i] ?? 8.4 + (i - 3) * 1.05;
    const point = plus(curve, times(curve, a, P), times(curve, b, Q));
    const [x, y] = point ? [px(float(point.x)), py(float(point.y))] : [0, 0];
    const isKept = i < 3;
    const isOn = x >= w.px0 && x <= w.px1 && y >= w.py0 && y <= w.py1;
    // egg points label outward from the egg's middle; branch points inside the opening of the C
    const [cx, cy] = [px(-0.95), py(-0.5)];
    const [ux, uy] =
      x < px(0.5)
        ? [(x - cx) / Math.hypot(x - cx, y - cy), (y - cy) / Math.hypot(x - cx, y - cy)]
        : [1, 0];
    return [
      dot(gx(a), gy(b), 4, pulse(tl, 4, 7, t, 0.12, 0.5) + tl.life(t, { fade: 0.12 })),
      isOn
        ? dot(
            x,
            y,
            3.2,
            pulse(tl, 3.2, 8, t, 0.12) +
              tl.life(t, { dim: isKept ? undefined : t + 1, dimTo: 0.7, fade: 0.12 }),
          ) +
          text(
            x + 11 * ux,
            y + 11 * uy + 4,
            name(a, b),
            tl.life(t, { fade: 0.15, out: isKept ? tl.endA : t + 0.95 }),
            ['end', 'middle', 'start'][Math.sign(Math.trunc(ux / 0.3)) + 1],
          )
        : `<g>${tl.life(t, { fade: 0.15, out: t + 0.95 })}${text(gx(0), gy(-2) + 46, `${name(a, b)} = (${point ? `${write(point.x)}, ${write(point.y)}` : ''})`, '', 'middle')}${text(gx(0), gy(-2) + 61, 'is off the page', '', 'middle')}</g>`,
    ].join('');
  });
  return svg(
    'on the rank-2 curve 389a1 every point is a·P + b·Q for two generators P and Q',
    300,
    [
      clip('r2c', w),
      `<g clip-path='url(#r2c)'>`,
      curveLayer(tl, curve, w, 0, 1.6),
      mirrorLine(tl, w, curve, 0.4, 352),
      stepSvg(tl, w, step(curve, P, Q), 4.2, { dimAt: 8.2, label: '', slow: true }),
      '</g>',
      ...cells,
      `<g opacity='.6'>${line([gx(0) + 5, gy(0)], [gx(1) - 6, gy(0)])}${line([gx(0), gy(0) - 5], [gx(0), gy(1) + 6])}</g>`,
      text(gx(0), gy(-2) + 24, 'dot at (a, b) = a·P + b·Q', '', 'middle'),
      text(gx(0) - 5, gy(0) + 15, '0', '', 'end'),
      `<g opacity='.7'>${text(gx(0) + 11, gy(0) + 15, 'P', '', 'middle')}${text(gx(0) - 6, gy(0) - 8, 'Q', '', 'end')}</g>`,
      ...lights,
      captions(tl, [
        [0.3, 4, ['two points that make all the others: P and Q']],
        [4.2, 8.2, ['line through P and Q, meet again, flip: P + Q']],
        [8.4, 30.6, ['each dot that lights is a point on the curve']],
        [30.8, 34, ['two independent directions:', 'every point is a·P + b·Q']],
      ]),
    ].join(''),
  );
};

export { pointsRank2 };
