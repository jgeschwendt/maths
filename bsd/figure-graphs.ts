import {
  type Px,
  type Timeline,
  type Win,
  dot,
  f,
  line,
  mapper,
  pathD,
  polyLength,
  pulse,
  svg,
  text,
  timeline,
} from './draw.ts';
import { models } from './model.ts';

/**
The panel of rank i: the graph drawn on, its value at s = 1 lit, then its height (rank 0) or tangent (ranks 1, 2)
*/
const panel = (tl: Timeline, k: '11a1' | '37a1' | '389a1', i: number): string => {
  const { at1, value } = models[k];
  const w: Win = {
    px0: 10 + i * 132,
    px1: 128 + i * 132,
    py0: 44,
    py1: 168,
    x0: 0.5,
    x1: 1.5,
    y0: -0.12,
    y1: 0.44,
  };
  const { px, py } = mapper(w);
  const [t0, cx] = [1 + i * 5.3, (w.px0 + w.px1) / 2];
  const tm = t0 + 2.8;
  const pts = Array.from({ length: 101 }, (_, j): Px => [
    px(0.5 + j / 100),
    py(value(0.5 + j / 100)),
  ]);
  const length = polyLength(pts);
  const slope = i === 1 ? at1[1] : 0;
  const [a, b]: Px[] =
    i === 0
      ? [
          [px(1), py(0)],
          [px(1), py(at1[0])],
        ]
      : [
          [px(0.7), py(-slope * 0.3)],
          [px(1.3), py(slope * 0.3)],
        ];
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return [
    text(cx, 22, `rank ${i}`, '', 'middle'),
    `<g opacity='.5'>${text(cx, 36, k, '', 'middle')}</g>`,
    `<g opacity='.45'>${line([w.px0, py(0)], [w.px1, py(0)], " stroke-width='1'")}${line([px(1), w.py0], [px(1), w.py1], " stroke-dasharray='2 3' stroke-width='1'")}${text(px(1), w.py1 + 14, 's = 1', '', 'middle')}${text(w.px0, w.py1 + 14, '½')}${text(w.px1, w.py1 + 14, '1½', '', 'end')}</g>`,
    i === 0 ? `<g opacity='.45'>${text(w.px0 + 2, py(0) - 4, '0')}</g>` : '',
    `<path d='${pathD(pts)}' stroke-dasharray='${f(length)} ${f(length)}'>${tl.drawOn(length, t0, t0 + 2.6)}${tl.life(0, { fade: 0.01 })}</path>`,
    dot(px(1), py(at1[0]), 3.5, pulse(tl, 3.5, 8, tm) + tl.life(tm, { fade: 0.15 })),
    i === 0
      ? line(
          a,
          b,
          ` stroke-width='2.5' stroke-dasharray='${f(l)} ${f(l)}'`,
          tl.drawOn(l, tm, tm + 0.8) + tl.life(0, { fade: 0.01 }),
        )
      : line(
          a,
          b,
          ` stroke-width='2.5' opacity='.8' stroke-dasharray='${f(l)} ${f(l)}'`,
          tl.drawOn(l, tm + 0.5, tm + 1.3),
        ),
    ...[
      [`height ${at1[0].toFixed(3)}`, 'not zero'],
      ['height 0', `slope ${at1[1].toFixed(3)}`],
      ['height 0, slope 0', `only a bend: ${(at1[2] / 2).toFixed(3)}`],
    ][i].map((s, j) => text(cx, 202 + j * 16, s, tl.life(tm + 0.6 + j * 0.8), 'middle')),
  ].join('');
};

/**
3a: L(E, s) for ½ ≤ s ≤ 1½ on the three curves; at s = 1 it misses zero, crosses it, and only kisses it
*/
const graphs = (): string => {
  const tl = timeline(24);
  return svg(
    'the graph of L near s = 1 for ranks 0, 1 and 2: it misses zero, crosses it, and only kisses it',
    262,
    `${(['11a1', '37a1', '389a1'] as const).map((k, i) => panel(tl, k, i)).join('')}<g>${tl.life(17.4)}${text(200, 252, 'zero stacked once at 1: rank 1. twice: rank 2.', '', 'middle')}</g>`,
  );
};

export { graphs };
