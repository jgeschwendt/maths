import { describe, expect, test } from 'bun:test';
import { curves, float, isOnCurve, plus } from './ec.ts';
import { bundle, hands } from './figure-hands.ts';
import {
  type Cell,
  type Host,
  chordAt,
  digits,
  initial,
  lattice,
  marks,
  name,
  pointOf,
  span,
  start,
  stepped,
  track,
  view,
} from './hands.ts';

const curve = curves['389a1'];
const [P, Q] = curve.generators;
const isNear = (u: readonly number[], v: readonly number[]): boolean =>
  u.every((x, i) => Math.abs(x - v[i]) < 1e-9);

type Rect = Readonly<{ height: number; left: number; top: number; width: number }>;
type Panel = { getBoundingClientRect: () => Rect; innerHTML: string };

/**
A panel 400 wide at `top`, one unit per pixel
*/
const panel = (top: number, height: number): Panel => ({
  getBoundingClientRect: (): Rect => ({ height, left: 0, top, width: 400 }),
  innerHTML: '',
});

/**
A host whose chord panel spans 0..400 × 0..290 and lattice panel 0..400 × 300..530; `shown` is the last redraw
*/
const fake = (): Readonly<{
  captured: number[];
  click: (step: string) => void;
  host: Host;
  send: (type: string, x: number, y: number) => void;
  shown: () => string;
}> => {
  const listeners = new Map<
    string,
    (event: Readonly<{ clientX: number; clientY: number; pointerId: number }>) => void
  >();
  const clicks = new Map<string, () => void>();
  const captured: number[] = [];
  const rendered: string[] = [];
  const region: Panel = {
    ...panel(0, 0),
    get innerHTML(): string {
      return rendered.at(-1) ?? '';
    },
    set innerHTML(html: string) {
      rendered.push(html);
    },
  };
  const panels = new Map([
    ['[data-chord]', panel(0, 290)],
    ['[data-lattice]', panel(300, 230)],
    ['[data-live]', region],
  ]);
  const host: Host = {
    addEventListener: (type, listener) => {
      listeners.set(type, listener);
    },
    querySelector: (selector) => panels.get(selector),
    querySelectorAll: () =>
      ['1,0', '0,1', '-1,0', '0,-1'].map((step) => ({
        addEventListener: (_: string, listener: () => void): void => {
          clicks.set(step, listener);
        },
        dataset: { step },
      })),
    setPointerCapture: (id) => {
      captured.push(id);
    },
  };
  return {
    captured,
    click: (step) => clicks.get(step)?.(),
    host,
    send: (type, x, y) => listeners.get(type)?.({ clientX: x, clientY: y, pointerId: 7 }),
    shown: () => rendered.at(-1) ?? '',
  };
};

/**
The chord-panel pixel of a lattice point, and the lattice-panel pixel of a cell
*/
const chordPx = (cell: Cell): readonly [number, number] => {
  const at = marks.find((h) => h.cell?.join(',') === cell.join(','))?.at ?? [0, 0];
  return [4 + ((at[0] + 2.45) / 5.9) * 392, 286 - ((at[1] + 6.4) / 11.8) * 282];
};
const latticePx = ([m, n]: Cell): readonly [number, number] => [96 + m * 16, 300 + 112 - n * 16];

describe('the lattice mP + nQ on 389a1', () => {
  test('every cell is a rational point of the curve, one step of P from its left neighbour', () => {
    expect(lattice.size).toBe((2 * span + 1) ** 2);
    expect(lattice.values().every((p) => isOnCurve(curve, p))).toBe(true);
    for (const [m, n] of [
      [0, 0],
      [3, -2],
      [-5, 4],
    ] as const) {
      expect(pointOf([m + 1, n])).toEqual(plus(curve, pointOf([m, n]), P));
    }
  });

  test('the fractions grow away from O: 5P + 5Q has many more digits than P + Q', () => {
    expect(digits(pointOf([0, 0]))).toEqual([0, 0]);
    expect(digits(pointOf([1, 1]))).toEqual([1, 1]);
    const [top, bottom] = digits(pointOf([5, 5]));
    expect(top + bottom).toBe(20);
  });

  test('names: O, P, −2P + Q, −3Q, P − Q', () => {
    const cells: readonly Cell[] = [
      [0, 0],
      [1, 0],
      [-2, 1],
      [0, -3],
      [1, -1],
    ];
    expect(cells.map((cell) => name(cell))).toEqual(['O', 'P', '−2P + Q', '−3Q', 'P − Q']);
  });

  test('a step is held to the lattice', () => {
    const corner = stepped({ ...initial, cell: [5, 4] }, [0, 1]);
    expect(corner).toEqual({ ...initial, cell: [5, 5], from: [5, 4] });
    expect(stepped(corner, [1, 0])).toBe(corner);
  });
});

describe('the chord in floats', () => {
  test('agrees with exact arithmetic: P + Q = (−2, −1), the tangent at P gives 2P = (3, 5)', () => {
    const p = [float(P?.x ?? [0n, 1n]), float(P?.y ?? [0n, 1n])] as const;
    const q = [float(Q?.x ?? [0n, 1n]), float(Q?.y ?? [0n, 1n])] as const;
    expect(isNear(chordAt(p, q).sum, [-2, -1])).toBe(true);
    expect(isNear(chordAt(p, p).sum, [3, 5])).toBe(true);
    expect(Number.isFinite(chordAt(p, [0, -1]).slope)).toBe(false);
  });

  test('the drag track lies on the curve', () => {
    expect(track.every(([x, y]) => Math.abs(y * y + y - (x ** 3 + x * x - 2 * x)) < 1e-9)).toBe(
      true,
    );
  });
});

describe('by hand', () => {
  test('dragging A: onto B is the tangent, off the lattice is approximate, onto −Q is vertical', () => {
    const { captured, host, send, shown } = fake();
    start({ querySelectorAll: () => [host] });
    send('pointerdown', ...chordPx([1, 0]));
    expect(captured).toEqual([7]);
    send('pointermove', ...chordPx([0, 1]));
    expect(shown()).toContain('A + B = 2Q = (6, −16), exactly');
    send('pointermove', 60, 60);
    expect(shown()).toContain('A + B ≈ (');
    send('pointermove', ...chordPx([0, -1]));
    expect(shown()).toContain('A + B = O, exactly: the line is vertical');
    send('pointerup', 0, 0);
    send('pointermove', 60, 60);
    expect(shown()).toContain('A + B = O');
  });

  test('the lattice: hover a cell, step with the buttons, off the page and back to O', () => {
    const { click, host, send, shown } = fake();
    start({ querySelectorAll: () => [host] });
    send('pointermove', ...latticePx([0, 0]));
    expect(shown()).toContain('O is where adding starts');
    click('1,0');
    expect(shown()).toContain('P = <code');
    click('0,1');
    click('1,0');
    click('0,1');
    expect(shown()).toContain('2P + 2Q = <code');
    expect(shown()).toContain('is off the page');
    click('-1,0');
    click('0,-1');
    expect(shown()).toContain('x has 1 digit over 1');
    send('pointerdown', ...latticePx([-1, 0]));
    click('1,0');
    expect(shown()).toContain('O sits at infinity');
    send('pointermove', 600, 600);
    expect(shown()).toContain('O sits at infinity');
  });

  test('the page carries the figure and the bundle of this module, safe inside a script element', () => {
    expect(hands()).toBe(`${view()}<script>${bundle.trim()}</script>`);
    expect(/<\/script|<!--/iu.test(bundle)).toBe(false);
    expect(view()).toContain('A + B = P + Q = (−2, −1), exactly');
  });
});
