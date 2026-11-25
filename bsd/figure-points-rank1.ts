import { curveLayer, edgeMark, mirrorLine, multiples, stepSvg } from './draw-curve.ts';
import { type Win, captions, clip, dot, line, mapper, svg, text, timeline } from './draw.ts';
import { curves, times, write } from './ec.ts';

/**
When the step to nP starts, and when nP lights (P itself at 1.6)
*/
const start = (n: number): number => (n === 2 ? 2.8 : 6.4 + (n - 3) * 2.75);
const lit = (n: number): number => [1.6, 5.8][n - 1] ?? start(n) + 2;

/**
2b: on 37a1 the multiples of P = (0, 0) never repeat, and the digits it takes to write nP grow like n²
*/
const pointsRank1 = (): string => {
  const curve = curves['37a1'];
  const [P] = curve.generators;
  const tl = timeline(37);
  const w: Win = { px0: 8, px1: 262, py0: 46, py1: 292, x0: -1.5, x1: 2.75, y0: -4.4, y1: 3.3 };
  const { px, py } = mapper(w);
  const labels: Readonly<Record<number, readonly [number, number]>> = {
    2: [7, -6],
    3: [-7, -5],
    4: [8, 4],
    5: [7, 14],
    7: [-7, -6],
    8: [7, 14],
    9: [7, 5],
  };
  const steps = multiples(curve, P, 9);
  const exact = Array.from({ length: 50 }, (_, n) => times(curve, n + 1, P));
  // the digits it takes to write x(nP): 161/16 takes 5
  const dg = exact.map((p) => {
    const [n, d] = p?.x ?? [0n, 1n];
    return `${n < 0n ? -n : n}`.length + (d === 1n ? 0 : `${d}`.length);
  });
  const [t2, t3, cx, base, top, cw] = [28.8, 32, 284, 268, 92, 110];
  const scale = (cols: number, rows: number): string =>
    `${Number((cw / cols).toFixed(3))} ${-Number(((base - top) / rows).toFixed(3))}`;
  const [sA, sB] = [scale(10, 8), scale(50, 120)];
  const bars = dg.map(
    (v, i) =>
      `<rect x='${i + 0.15}' y='0' width='.7' height='${v}' fill='currentColor' stroke='none'>${tl.life(i < 10 ? lit(i + 1) : t2 + ((i - 10) / 40) * (t3 - t2), { fade: 0.2, peak: 0.85 })}</rect>`,
  );
  const far = steps
    .map((s, i) => ({ n: i + 2, s }) as const)
    .filter(
      ({ s }) => s.sum !== undefined && (s.sum[0] > w.x1 || s.sum[1] > w.y1 || s.sum[1] < w.y0),
    );
  return svg(
    'the multiples of P on the rank-1 curve 37a1 never repeat, and take ever more digits to write',
    300,
    [
      clip('r1c', w),
      `<g clip-path='url(#r1c)'>`,
      curveLayer(tl, curve, w, 0, 1.8),
      mirrorLine(tl, w, curve, 0.4, 214),
      ...steps.map((s, i) =>
        stepSvg(tl, w, s, start(i + 2), {
          dimAt: start(i + 3) - 0.2,
          dx: labels[i + 2]?.[0],
          dy: labels[i + 2]?.[1],
          label: `${i + 2}P`,
          slow: i === 0,
        }),
      ),
      '</g>',
      dot(px(0), py(0), 3.5, tl.life(1.6, { fade: 0.2 })),
      text(px(0) + 7, py(0) - 6, 'P', tl.life(1.6)),
      ...far.map(({ n, s }) => {
        const m = edgeMark(w, [0, 0], s.sum ?? [0, 0]);
        const t = lit(n);
        const p = exact[n - 1];
        const at = p ? `(${write(p.x)}, ${write(p.y)})` : '';
        return `<g>${tl.life(t, { dim: t + 2.6, dimTo: 0.45 })}<path d='${m.d}' stroke-width='2'/>${text(m.x - 10, m.y < 150 ? m.y + 16 : m.y - 8, `${n}P = ${at}`, '', 'end')}</g>`;
      }),
      line([cx, base], [cx + cw, base], " opacity='.5'"),
      `<g transform='translate(${cx} ${base})'><g transform='scale(${sB})'><animateTransform attributeName='transform' type='scale' dur='37s' repeatCount='indefinite' values='${sA};${sA};${sB};${sB}' keyTimes='0;${(t2 / 37).toFixed(4)};${(t3 / 37).toFixed(4)};1'/>${bars.join('')}</g></g>`,
      text(cx, 56, 'digits it takes') + text(cx, 71, 'to write nP'),
      `<g>${tl.life(0.5, { out: t2 })}${text(cx - 2, top + 4, '8', '', 'end')}${text(cx + cw / 2, base + 16, 'n = 1 to 10', '', 'middle')}</g>`,
      `<g>${tl.life(t2)}${text(cx - 2, top + 4, '120', '', 'end')}${text(cx + cw / 2, base + 16, 'n = 1 to 50', '', 'middle')}</g>`,
      line([cx, top], [cx + cw, top], " opacity='.35' stroke-width='1' stroke-dasharray='2 3'"),
      captions(tl, [
        [0.3, 2.7, ['start with P = (0, 0)']],
        [2.8, 4.3, ['the line touching the curve at P']],
        [4.3, 4.9, ['meets the curve once more']],
        [4.9, 6.3, ['flip across the mirror: 2P']],
        ...[3, 4, 5, 6, 7, 8, 9, 10].map(
          (n) =>
            [
              start(n),
              n === 10 ? t2 - 0.2 : start(n + 1) - 0.1,
              [
                n === 6
                  ? '5P and P: the line runs off the page, 6P is far away'
                  : `line through ${n - 1}P and P, then flip: ${n}P`,
              ],
            ] as const,
        ),
        [
          t2,
          37,
          [
            `keep going: 50P takes ${dg[49]} digits to write`,
            'it never repeats, it only gets more complicated',
          ],
        ],
      ]),
    ].join(''),
  );
};

export { pointsRank1 };
