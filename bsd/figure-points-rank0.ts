import { curveLayer, mirrorLine, multiples, stepSvg } from './draw-curve.ts';
import {
  type Px,
  type Win,
  captions,
  clip,
  dot,
  f,
  mapper,
  ring,
  svg,
  text,
  timeline,
} from './draw.ts';
import { curves } from './ec.ts';

/**
The i-th of the five points flashes to `scale` in its turn, twice round the cycle
*/
const lit = (i: number, scale: number): readonly (readonly [number, number])[] =>
  [0, 1].flatMap((rep) => {
    const t = 19.4 + (rep * 5 + i) * 0.5;
    return [
      [t, 0],
      [t + 0.1, scale],
      [t + 0.5, 0],
    ] as const;
  });

/**
2a: on 11a1 the multiples of P = (5, 5) close up after five steps
*/
const pointsRank0 = (): string => {
  const curve = curves['11a1'];
  const tl = timeline(26);
  const w: Win = { px0: 20, px1: 268, py0: 42, py1: 292, x0: 3.6, x1: 17.6, y0: -74, y1: 74 };
  const { px, py } = mapper(w);
  const [s2, s3, s4, s5] = multiples(curve, curve.generators[0], 4);
  const starts = [3, 7.4, 10.8, 14.2];
  const xv = px(5);
  // the five points, the point at infinity at the top of the vertical line; each lights in turn, twice
  const cycle: readonly Px[] = [
    ...[s2.a, s2.sum, s3.sum, s4.sum].map((p): Px => [px(p?.[0] ?? 0), py(p?.[1] ?? 0)]),
    [xv, w.py0 + 4],
  ];
  const rows: readonly (readonly [string, number])[] = [
    ['P = (5, 5)', 1.6],
    ['2P = (16, -61)', 6],
    ['3P = (16, 60)', 9.4],
    ['4P = (5, -6)', 12.8],
    ['5P = infinity', 15.1],
    ['6P = P again', 17.6],
  ];
  return svg(
    'the multiples of P on the rank-0 curve 11a1 return to P after five steps',
    300,
    [
      clip('r0c', w),
      `<g clip-path='url(#r0c)'>`,
      curveLayer(tl, curve, w, 0, 1.6),
      mirrorLine(tl, w, curve, 0.4, 128),
      stepSvg(tl, w, s2, starts[0], { dimAt: 7.2, dx: 8, dy: 4, label: '2P', slow: true }),
      stepSvg(tl, w, s3, starts[1], { dimAt: 10.6, dx: 8, dy: 4, label: '3P' }),
      stepSvg(tl, w, s4, starts[2], { dimAt: 14, dx: -8, dy: 14, label: '4P' }),
      stepSvg(tl, w, s5, starts[3], { dimAt: 17.4, label: '' }),
      '</g>',
      dot(px(5), py(5), 3.5, tl.life(1.6, { fade: 0.2 })),
      text(px(5) - 8, py(5) - 2, 'P', tl.life(1.6), 'end'),
      `<g>${tl.life(15.1, { dim: 17.4, dimTo: 0.5 })}<path d='M${f(xv - 5)} ${f(w.py0 + 8)}L${f(xv)} ${f(w.py0)}L${f(xv + 5)} ${f(w.py0 + 8)}'/>${text(xv + 8, w.py0 + 12, 'to infinity')}</g>`,
      ...rows.map(([s, t], i) => text(280, 74 + i * 22, s, tl.life(t))),
      ...cycle.map(
        ([x, y], i) =>
          `${ring(
            x,
            y,
            9,
            tl.anim('opacity', [[0, 0], ...lit(i, 1)]),
          )}<rect x='274' y='${61 + i * 22}' width='124' height='18' rx='3' fill='currentColor' stroke='none'>${tl.anim('opacity', [[0, 0], ...lit(i, 0.18)])}</rect>`,
      ),
      captions(tl, [
        [0.3, 2.9, ['start with one point, P = (5, 5)']],
        [3, 4.4, ['draw the line touching the curve at P']],
        [4.4, 5, ['it meets the curve once more']],
        [5, 7.2, ['flip it across the mirror: that is 2P']],
        [
          7.4,
          10.6,
          [
            'line through 2P and P: it just touches at 2P,',
            'so 2P itself is the meeting point. flip: 3P',
          ],
        ],
        [10.8, 14, ['line through 3P and P meets again at P.', 'flip: 4P']],
        [
          14.2,
          17.4,
          [
            '4P sits right below P: the line goes straight up,',
            'to the point at infinity. that is 5P',
          ],
        ],
        [17.6, 19.3, ['add P once more: P again']],
        [
          19.4,
          26,
          [
            '5 steps and it is back where it began:',
            'only these 5 points, round and round forever',
          ],
        ],
      ]),
    ].join(''),
  );
};

export { pointsRank0 };
