import {
  type Px,
  type Win,
  f,
  line,
  mapper,
  pathD,
  polyLength,
  svg,
  text,
  timeline,
} from './draw.ts';
import { models, tally } from './model.ts';

/**
4: the running total of log(N_p/p) against log log p climbs with slope near the rank: 0, 1, 2
*/
const clue = (): string => {
  const tl = timeline(16);
  const w: Win = {
    px0: 40,
    px1: 290,
    py0: 16,
    py1: 210,
    x0: Math.log(Math.log(2)),
    x1: 2.25,
    y0: 0.6,
    y1: 6.8,
  };
  const { px, py } = mapper(w);
  const rows = [
    ['11a1', 'closed curve'],
    ['37a1', 'forever curve'],
    ['389a1', 'grid curve'],
  ] as const;
  const lines = rows.map(([k, name], i) => {
    const { points, slope } = tally(models[k]);
    // one vertex per pixel column: the later primes crowd together on the log log scale
    const pixels: Px[] = [];
    for (const [x, y] of points) {
      if (px(x) - (pixels.at(-1)?.[0] ?? -1) >= 1) {
        pixels.push([px(x), py(y)]);
      }
    }
    const length = polyLength(pixels);
    const t0 = 0.6 + i * 3.4;
    const end = pixels.at(-1) ?? [0, 0];
    return [
      `<path d='${pathD(pixels)}' stroke-width='1' stroke-linejoin='round' stroke-dasharray='${f(length)} ${f(length)}'>${tl.drawOn(length, t0, t0 + 3)}${tl.life(0, { fade: 0.01 })}</path>`,
      `<g>${tl.life(t0 + 3, { fade: 0.3 })}${text(end[0] + 8, end[1] - 2, name)}${text(end[0] + 8, end[1] + 13, `slope ${slope.toFixed(2)}`)}</g>`,
    ].join('');
  });
  return svg(
    'the running total of points counted prime by prime climbs with slope near the rank',
    232,
    [
      `<g opacity='.4'>${line([w.px0, w.py1], [w.px1, w.py1])}${line([w.px0, w.py0], [w.px0, w.py1])}</g>`,
      ...lines,
      `<g opacity='.7'>${text(w.px1, 227, 'more primes →', '', 'end')}${text(46, 12, 'points collected, running total ↑')}</g>`,
    ].join(''),
  );
};

export { clue };
