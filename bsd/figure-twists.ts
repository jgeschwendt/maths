import { type Win, dot, line, mapper, svg, text } from './draw.ts';
import { rankZero } from './twists.ts';

/**
The constant with I(D) = |Ш|·τ / constant on every rank-0 twist: the identity's prefactor and L(π, Ad, 1), the same
for all D because BSD fixes L(E^D, 1/5) by |Ш| and τ
*/
const constant = (): number => {
  const [first] = rankZero;
  return Math.round((first.sha * first.tamagawa) / first.iz.value);
};

/**
The 401 admissible twists with L(E^D, 1/5) ≠ 0. Top: how many have each |Ш(E^D)|, bars at √|Ш|. Bottom: Yun–Zhang's
predicted self-intersection I(D) of each, on a log scale, against the same axis
*/
const twists = (): string => {
  const counts = new Map<number, number>();
  const seen = new Map<string, readonly [number, number]>();
  for (const r of rankZero) {
    counts.set(r.sha, (counts.get(r.sha) ?? 0) + 1);
    seen.set(`${r.sha} ${r.iz.text}`, [Math.sqrt(r.sha), Math.log10(r.iz.value)]);
  }
  const top: Win = { px0: 40, px1: 380, py0: 44, py1: 124, x0: 0, x1: 18, y0: 0, y1: 160 };
  const low: Win = { px0: 40, px1: 380, py0: 170, py1: 262, x0: 0, x1: 18, y0: -3.2, y1: -0.2 };
  const [a, b] = [mapper(top), mapper(low)];
  const bars = [...counts]
    .toSorted(([x], [y]) => x - y)
    .map(([sha, n]) => {
      const x = a.px(Math.sqrt(sha));
      return `<rect x='${x - 7}' y='${a.py(n)}' width='14' height='${a.py(0) - a.py(n)}' fill='currentColor' fill-opacity='.3'/>${text(x, a.py(n) - 3, String(n), '', 'middle')}`;
    });
  const ticks = [1, 3, 5, 7, 9, 11, 13, 17].map((s) =>
    text(a.px(s), top.py1 + 13, String(s * s), '', 'middle'),
  );
  return svg(
    `${rankZero.length} twists of y² + xy = x³ − t⁶ over F₅(t): the number with each |Ш|, and the self-intersection Yun–Zhang's identity predicts for each`,
    300,
    [
      text(200, 16, `${rankZero.length} twists E^D with L(E^D, 1/5) ≠ 0`, '', 'middle'),
      text(200, 31, 'how many have each |Ш(E^D)|, from BSD', '', 'middle'),
      line([top.px0, top.py1], [top.px1, top.py1], " opacity='.4'"),
      ...bars,
      ...ticks,
      text(200, top.py1 + 27, '|Ш(E^D)|, always a square', '', 'middle'),
      text(200, 157, 'the predicted I(D) = ⟨Z, Z⟩ of each', '', 'middle'),
      ...[-3, -2, -1].flatMap((e) => [
        line([low.px0, b.py(e)], [low.px1, b.py(e)], " stroke-dasharray='2 3' opacity='.3'"),
        text(low.px0 - 4, b.py(e) + 3, `1/${10 ** -e}`, '', 'end'),
      ]),
      ...seen.values().map(([x, y]) => `<g opacity='.6'>${dot(a.px(x), b.py(y), 3)}</g>`),
      text(200, 284, `I(D) = |Ш|·τ / ${constant()} on every one`, '', 'middle'),
    ].join(''),
  );
};

export { constant, twists };
