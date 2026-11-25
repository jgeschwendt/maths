import { curveLayer } from './draw-curve.ts';
import {
  type Px,
  type Timeline,
  type Win,
  captions,
  clip,
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
import { curves } from './ec.ts';
import { models } from './model.ts';
import { atS, sister } from './sister.ts';

/**
A graph of L over ½ ≤ s ≤ 1½ drawn on from t0, its kiss at s = 1 lit at t0 + 2.8
*/
const kiss = (tl: Timeline, w: Win, value: (s: number) => number, t0: number): string => {
  const { px, py } = mapper(w);
  const pts = Array.from({ length: 101 }, (_, j): Px => [
    px(0.5 + j / 100),
    py(value(0.5 + j / 100)),
  ]);
  const length = polyLength(pts);
  const id = `sk${w.px0}`;
  return [
    clip(id, w),
    `<g>${tl.life(t0, { fade: 0.3 })}<g opacity='.45'>${line([w.px0, py(0)], [w.px1, py(0)], " stroke-width='1'")}${line([px(1), w.py0], [px(1), w.py1], " stroke-dasharray='2 3' stroke-width='1'")}${text(px(1), w.py1 + 14, 's = 1', '', 'middle')}${text(w.px0 + 2, py(0) - 4, '0')}</g></g>`,
    `<path clip-path='url(#${id})' d='${pathD(pts)}' stroke-dasharray='${f(length)} ${f(length)}'>${tl.drawOn(length, t0, t0 + 2.6)}${tl.life(0, { fade: 0.01 })}</path>`,
    dot(px(1), py(0), 3.5, pulse(tl, 3.5, 8, t0 + 2.8) + tl.life(t0 + 2.8, { fade: 0.15 })),
  ].join('');
};

/**
Lines of text from (x, y), 16 apart, each fading in at its own time
*/
const lines = (
  tl: Timeline,
  x: number,
  y: number,
  items: readonly (readonly [number, string])[],
): string => items.map(([t, s], k) => text(x, y + k * 16, s, tl.life(t))).join('');

/**
6ĥ written as ĥ
*/
const fraction = (h: number): string => ({ 3: '½', 4: '⅔' })[h] ?? `${h}/6`;

/**
The sister world: L(389a1, s) kisses zero with no recipe from the zero to its two points; over F₅(t) the curve
y² + xy = x³ − t⁶ kisses too, its L a polynomial counted exactly, (1 − 5T)² its zero, and two points written down
*/
const sisterWorld = (): string => {
  const tl = timeline(38);
  const [a, b, c, d] = sister.lPoly;
  const [s1, s2, s3] = sister.sums;
  const [[hp], [, hq]] = sister.gram;
  // both graphs at one curvature at s = 1: the sister's bend is 5.2 to 389a1's 0.76, so its window is 7× taller
  const left: Win = { px0: 12, px1: 188, py0: 78, py1: 160, x0: 0.5, x1: 1.5, y0: -0.12, y1: 0.44 };
  const right: Win = { ...left, px0: 212, px1: 388, y0: -0.84, y1: 3.08 };
  const small: Win = { px0: 14, px1: 108, py0: 246, py1: 330, x0: -2.4, x1: 2, y0: -3.2, y1: 2.2 };
  const { px, py } = mapper(small);
  return svg(
    'left, 389a1 over the rationals: its L-function kisses zero, two points exist, and no recipe joins them; right, y² + xy = x³ − t⁶ over F₅(t): its L-function, counted exactly, is (1 − 5T)²(1 + 5T), and its two points are written down',
    340,
    [
      `<g>${tl.life(0.3)}${text(100, 52, 'our world', '', 'middle')}<g opacity='.55'>${text(100, 67, '389a1 over Q', '', 'middle')}</g></g>`,
      kiss(tl, left, models['389a1'].value, 0.8),
      `<g>${tl.life(6.4)}<rect x='40' y='186' width='120' height='46' rx='4' stroke-dasharray='4 4' opacity='.7'/><text x='100' y='211' text-anchor='middle' style='font-size:20px'>?</text>${text(100, 226, 'no recipe known', '', 'middle')}</g>`,
      `<g>${tl.life(8.4)}${clip('sks', small)}<g clip-path='url(#sks)'>${curveLayer(tl, curves['389a1'], small, 8.4, 9.6)}</g>${dot(px(0), py(0), 3.5)}${dot(px(1), py(0), 3.5)}${lines(
        tl,
        116,
        268,
        [
          [9.6, 'P = (0, 0)'],
          [9.6, 'Q = (1, 0)'],
          [10.4, 'searched for,'],
          [10.4, 'not built'],
        ],
      )}</g>`,
      `<g>${tl.life(11.6)}${text(300, 52, 'the sister world', '', 'middle')}<g opacity='.55'>${text(300, 67, 'y² + xy = x³ − t⁶ over F₅(t)', '', 'middle')}</g></g>`,
      kiss(tl, right, (s) => atS(sister.lPoly, s), 12),
      lines(tl, 214, 198, [
        [17.4, `fibre counts ${s1}, ${s2}, ${s3}`],
        [19, `L = ${a} − ${-b}T − ${-c}T² + ${d}T³`],
      ]),
      `<g>${tl.life(20.8)}<text x='214' y='230'>= <tspan font-weight='700'>(1 − 5T)²${tl.anim(
        'opacity',
        [
          [21.4, 1],
          [21.8, 0.3],
          [22.2, 1],
          [22.6, 0.3],
          [23, 1],
        ],
      )}</tspan> (1 + 5T)</text></g>`,
      lines(tl, 214, 262, [
        [24, 'P = (t², 0)'],
        [24.6, 'Q = (0, 2t³)'],
        [25.8, 'both on the curve, exactly'],
        [27.4, `heights ${fraction(hp)}, ${fraction(hq)}; pairing 0`],
        [28.4, 'independent: rank 2'],
      ]),
      captions(tl, [
        [0.3, 6.2, ['our world: the graph of 389a1', 'kisses zero at s = 1, a double zero']],
        [6.4, 11.4, ['two points exist, found by search;', 'no recipe turns the zero into them']],
        [11.6, 17.2, ['the sister world: a curve over F₅(t),', 'whose graph kisses zero too']],
        [
          17.4,
          23.8,
          [
            'count its points on every fibre: L is a polynomial,',
            'and (1 − 5T)² is a zero of order exactly 2',
          ],
        ],
        [
          24,
          31,
          [
            'its two points, written down and checked',
            'by substitution; their heights make them independent',
          ],
        ],
        [
          31.2,
          38,
          [
            'there, L is read off a surface, and each zero',
            'at the centre is a curve on it: a point',
          ],
        ],
      ]),
    ].join(''),
  );
};

export { sisterWorld };
