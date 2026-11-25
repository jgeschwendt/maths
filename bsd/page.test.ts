import { describe, expect, test } from 'bun:test';
import { models, tally } from './model.ts';
import { figures, page, render } from './page.ts';

const html = await Bun.file(page).text();
const byText = (x: string, y: string): number => x.localeCompare(y);

describe('the page', () => {
  test('docs/index.html is current with its figures: `mise run docs` rewrites it', () => {
    expect(render(html) === html).toBe(true);
  });

  test('every computed figure has its markers on the page, and every id on the page is its own', () => {
    const markers = (html.match(/<!-- figure:[\w-]+ -->/gu) ?? []).map((m) => m.slice(12, -4));
    expect(markers.toSorted(byText)).toEqual(Object.keys(figures).toSorted(byText));
    const ids = html.match(/ id=["'][^"']+["']/gu) ?? [];
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  test('a figure draws in the text colour and opacity only: no fixed colour', () => {
    expect(Object.values(figures).filter((draw) => /#[\da-f]{3}\b|rgb|hsl/iu.test(draw()))).toEqual(
      [],
    );
  });
});

describe('the clue', () => {
  test('the running total of log(N_p/p) to 12 000 climbs with slope within 0.35 of the rank', () => {
    for (const series of Object.values(models)) {
      expect(Math.abs(tally(series).slope - series.curve.rank)).toBeLessThan(0.35);
    }
  });
});
