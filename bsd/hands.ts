/// <reference lib="dom" />
import { roots } from './analytic.ts';
import { edgeMark, locus } from './draw-curve.ts';
import {
  type Px,
  type Win,
  clip,
  dot,
  isInside,
  line,
  lineSpan,
  mapper,
  ring,
  text,
} from './draw.ts';
import { type Point, chord, curves, float, plus, times, write } from './ec.ts';

/**
A lattice cell [m, n], the point mP + nQ
*/
type Cell = readonly [number, number];

/**
A draggable point: where it sits on the curve, and the lattice cell it snapped onto, if any
*/
type Handle = Readonly<{ at: Px; cell?: Cell }>;

/**
What the figure shows: the two handles, the lattice cell picked and the cell it was stepped from
*/
type State = Readonly<{ a: Handle; b: Handle; cell: Cell; from?: Cell }>;

/**
The parts of a pointer event the figure reads
*/
type Pointer = Readonly<{ clientX: number; clientY: number; pointerId: number }>;

/**
An element the figure measures or redraws
*/
type Box = {
  getBoundingClientRect: () => Readonly<{
    height: number;
    left: number;
    top: number;
    width: number;
  }>;
  innerHTML: string;
};

/**
A step button: its `data-step` is the cell offset `dm,dn`
*/
type Button = Readonly<{
  addEventListener: (type: string, listener: () => void) => void;
  dataset: Readonly<{ step?: string }>;
}>;

/**
The figure's root element, as much of it as the figure uses
*/
type Host = Readonly<{
  addEventListener: (type: string, listener: (event: Pointer) => void) => void;
  querySelector: (selector: string) => Box | null | undefined;
  querySelectorAll: (selector: string) => Iterable<Button>;
  setPointerCapture: (id: number) => void;
}>;

const curve = curves['389a1'];
const [P, Q] = curve.generators;
const [, a2, a3, a4] = curve.a.map(Number);

/**
The lattice runs over |m|, |n| ≤ span
*/
const span = 5;
const range = Array.from({ length: 2 * span + 1 }, (_, k) => k - span);
const key = ([m, n]: Cell): string => `${m},${n}`;
const multiplesP = range.map((m) => times(curve, m, P));
const multiplesQ = range.map((n) => times(curve, n, Q));

/**
mP + nQ for every cell, by exact chord-and-tangent steps
*/
const lattice = new Map<string, Point>(
  range.flatMap((m) =>
    range.map(
      (n) => [key([m, n]), plus(curve, multiplesP[m + span], multiplesQ[n + span])] as const,
    ),
  ),
);
const pointOf = (cell: Cell): Point => lattice.get(key(cell));
const xyOf = (point: Point): Px => (point ? [float(point.x), float(point.y)] : [0, 0]);

/**
The digits of x written as a fraction, numerator and denominator: the point's size
*/
const digits = (point: Point): Px =>
  point ? [String(point.x[0]).replace('-', '').length, String(point.x[1]).length] : [0, 0];

/**
The name of mP + nQ: `O`, `P`, `−2P + Q`, `3Q`
*/
const term = (k: number, s: string): string => `${Math.abs(k) === 1 ? '' : Math.abs(k)}${s}`;
const name = ([m, n]: Cell): string =>
  (
    [
      [m, 'P'],
      [n, 'Q'],
    ] as const
  )
    .filter(([k]) => k !== 0)
    .map(([k, s], i) => `${['', '−', ' + ', ' − '][2 * i + Number(k < 0)]}${term(k, s)}`)
    .join('') || 'O';

/**
The chord window: the egg and the branch's turn, with P, Q and their nearest sums
*/
const windowA: Win = { px0: 4, px1: 396, py0: 4, py1: 286, x0: -2.45, x1: 3.45, y0: -6.4, y1: 5.4 };
const windowB: Win = { ...windowA, px0: 196, px1: 396, py0: 8, py1: 222 };
const pitch = 16;
const cellPx = ([m, n]: Cell): Px => [96 + m * pitch, 112 - n * pitch];

/**
The real curve sampled finely, both halves of the branch through e1 and once round the egg: where a drag lands
*/
const [e1, e2, e3] = roots(curve);
const half = (x: number, sign: number): Px => [
  x,
  (-a3 + sign * Math.sqrt(Math.max(0, 4 * (((x + a2) * x + a4) * x) + a3 * a3))) / 2,
];
const track: readonly Px[] = [
  ...Array.from({ length: 1201 }, (_, k) =>
    half(e1 + 3 * ((k - 600) / 600) ** 2, Math.sign(k - 600)),
  ),
  ...Array.from({ length: 1200 }, (_, k) =>
    half(e3 + ((e2 - e3) * (1 - Math.cos((Math.PI * k) / 600))) / 2, k < 600 ? 1 : -1),
  ),
];

/**
The lattice points near the middle that a drag snaps onto
*/
const marks: readonly Handle[] = range
  .filter((m) => Math.abs(m) <= 2)
  .flatMap((m) => range.filter((n) => Math.abs(n) <= 2).map((n): Cell => [m, n]))
  .filter((cell) => {
    const point = pointOf(cell);
    return point !== undefined && isInside(windowA, ...xyOf(point));
  })
  .map((cell) => ({ at: xyOf(pointOf(cell)), cell }));

const toPx = (w: Win, [x, y]: Px): Px => [mapper(w).px(x), mapper(w).py(y)];
const gap = (u: Px, v: Px): number => Math.hypot(u[0] - v[0], u[1] - v[1]);
const isSame = (u: Px, v: Px): boolean => u[0] === v[0] && u[1] === v[1];

/**
The handle a pointer at pixel u places: onto the other handle or a lattice point when close, else the nearest curve point
*/
const grab = (u: Px, other: Handle): Handle => {
  const near = [other, ...marks].find((h) => gap(toPx(windowA, h.at), u) < 9);
  let [best] = track;
  for (const p of track) {
    best = gap(toPx(windowA, p), u) < gap(toPx(windowA, best), u) ? p : best;
  }
  return near ?? { at: best };
};

/**
The line through a and b in floats, the tangent when they coincide: its slope (infinite: vertical), third point and a + b
*/
const chordAt = (a: Px, b: Px): Readonly<{ slope: number; sum: Px; third: Px }> => {
  const slope = isSame(a, b)
    ? ((3 * a[0] + 2 * a2) * a[0] + a4) / (2 * a[1] + a3)
    : (b[1] - a[1]) / (b[0] - a[0]);
  const x = slope * slope - a2 - a[0] - b[0];
  const y = a[1] + slope * (x - a[0]);
  return { slope, sum: [x, -y - a3], third: [x, y] };
};

const plain = (v: number): string => v.toFixed(3).replace('-', '−');
const exact = (point: Point): string =>
  point ? `(${write(point.x)}, ${write(point.y)})`.replaceAll('-', '−') : '';

/**
The line of slope s through a, across the window; vertical when s is infinite
*/
const across = (w: Win, a: Px, s: number): string => {
  const { px, py } = mapper(w);
  const pa = toPx(w, a);
  const sp = lineSpan(
    w,
    pa,
    Number.isFinite(s) ? [px(1) - px(0), py(s) - py(0)] : [0, 1],
    [-1e4, 1e4],
    0,
  );
  return `<g opacity='.65' stroke-width='1.2'>${line(sp.from, sp.to)}</g>`;
};

/**
The third point, its drop across the mirror line and the sum, each drawn where it is on the page
*/
const landing = (w: Win, third: Px, sum: Px, label: string): string => {
  const [p3, ps] = [toPx(w, third), toPx(w, sum)];
  const isShown = isInside(w, ...third) && isInside(w, ...sum);
  return isShown
    ? `${ring(...p3, 4.5)}${line(p3, ps, " stroke-dasharray='3 3' opacity='.7'")}${dot(...ps, 4.5)}${text(ps[0] + 8, ps[1] - 7, label)}`
    : '';
};

const curveLines = (w: Win, id: string): string =>
  `${clip(id, w)}<g clip-path='url(#${id})'>${locus(curve, w)
    .map((c) => `<path d='${c.d}' stroke-width='2'/>`)
    .join(
      '',
    )}${line(toPx(w, [w.x0, -a3 / 2]), toPx(w, [w.x1, -a3 / 2]), " stroke-dasharray='2 4' stroke-width='1' opacity='.4'")}</g>`;

const frame = (attribute: string, h: number, label: string, body: string): string =>
  `<svg ${attribute} viewBox='0 0 400 ${h}' xmlns='http://www.w3.org/2000/svg' role='img' aria-label='${label}'>${body}</svg>`;

/**
The chord panel: the curve, A and B, the line through them, its third point and A + B
*/
const chordView = ({ a, b }: State): string => {
  const { slope, sum, third } = chordAt(a.at, b.at);
  const isVertical = !Number.isFinite(slope);
  const handle = (h: Handle, label: string): string => {
    const p = toPx(windowA, h.at);
    return `${dot(...p, 5.5)}${text(p[0] - 9, p[1] - 8, h.cell ? `${label} = ${name(h.cell)}` : label, '', 'end')}`;
  };
  const read =
    a.cell && b.cell
      ? `A + B = ${name([a.cell[0] + b.cell[0], a.cell[1] + b.cell[1]])}${isVertical ? '' : ` = ${exact(plus(curve, pointOf(a.cell), pointOf(b.cell)))}`}, exactly`
      : `A + B ${isVertical ? '= O' : `≈ (${plain(sum[0])}, ${plain(sum[1])})`}`;
  return [
    frame(
      "data-chord class='hands-chord'",
      290,
      'the curve 389a1 with two draggable points A and B, the line through them and their sum',
      [
        curveLines(windowA, 'hands-a'),
        across(windowA, a.at, slope),
        isVertical ? '' : landing(windowA, third, sum, 'A + B'),
        handle(a, 'A'),
        handle(b, 'B'),
      ].join(''),
    ),
    `<p class='hands-read'>${read}${isVertical ? ': the line is vertical, so it meets the curve again only at infinity, the point O' : ''}</p>`,
  ].join('');
};

/**
The lattice panel: every mP + nQ as a dot sized by its digits, and the picked one on the curve
*/
const cellDots = range
  .flatMap((m) =>
    range.map((n) => {
      const [x, y] = cellPx([m, n]);
      const size = digits(pointOf([m, n]));
      return m === 0 && n === 0
        ? ring(x, y, 3)
        : `<g opacity='.45'>${dot(x, y, Math.min(7, 1 + (size[0] + size[1]) / 6))}</g>`;
    }),
  )
  .join('');

/**
A point the step's line passes through, dimmed and named, when it is on the page
*/
const faint = (cell: Cell): string => {
  const point = pointOf(cell);
  const [x, y] = toPx(windowB, xyOf(point));
  return point && isInside(windowB, ...xyOf(point))
    ? `<g opacity='.55'>${dot(x, y, 3.5)}${text(x + 7, y - 6, name(cell))}</g>`
    : '';
};

/**
The step that reached the cell from `from`: the line through the old point and the generator added, then the landing
*/
const stepView = (cell: Cell, from: Cell): string => {
  const step: Cell = [cell[0] - from[0], cell[1] - from[1]];
  const by = pointOf(step);
  const { slope, sum, third } = chord(curve, pointOf(from), by);
  const landed = slope && sum ? landing(windowB, xyOf(third), xyOf(sum), '') : '';
  return `${across(windowB, xyOf(by), slope ? float(slope) : Infinity)}${landed}${faint(from)}${faint(step)}`;
};

/**
The picked point on the curve, or where it went when it is off the page
*/
const markView = (cell: Cell): string => {
  const point = pointOf(cell);
  const at = xyOf(point);
  const [ax, ay] = toPx(windowB, at);
  const edge = edgeMark(windowB, [0.5, -0.5], at);
  // the note sits at the opposite edge from the arrow
  const offPage = point
    ? `<path d='${edge.d}' stroke-width='2'/>${text(296, edge.y < 115 ? 214 : 22, `${name(cell)} is off the page`, '', 'middle')}`
    : text(296, 22, 'O sits at infinity', '', 'middle');
  return point && isInside(windowB, ...at)
    ? `${dot(ax, ay, 5.5)}${text(ax + 9, ay + 4, name(cell))}`
    : offPage;
};

const latticeView = ({ cell, from }: State): string => {
  const point = pointOf(cell);
  const [top, bottom] = digits(point);
  return [
    frame(
      "data-lattice class='hands-lattice'",
      230,
      'the points mP + nQ of 389a1 laid out as a lattice, and the picked one on the curve',
      [
        `<g opacity='.35'>${line([cellPx([-span, 0])[0] - 8, 112], [cellPx([span, 0])[0] + 8, 112])}${line([96, cellPx([0, span])[1] - 8], [96, cellPx([0, -span])[1] + 8])}</g>`,
        cellDots,
        ring(...cellPx(cell), 8, '', " stroke-width='2'"),
        text(176, 212, 'm · P →', '', 'end'),
        text(14, 20, '↑ n · Q'),
        curveLines(windowB, 'hands-b'),
        from ? stepView(cell, from) : '',
        markView(cell),
      ].join(''),
    ),
    `<p class='hands-read' aria-live='polite'>${name(cell)} ${point ? `= <code class='code'>${exact(point)}</code>, x has ${top} digit${top === 1 ? '' : 's'} over ${bottom}` : 'is where adding starts'}</p>`,
  ].join('');
};

const live = (state: State): string => `${chordView(state)}${latticeView(state)}`;

/**
The step buttons: add or take away P or Q
*/
const buttons = (
  [
    ['1,0', '+ P'],
    ['0,1', '+ Q'],
    ['-1,0', '− P'],
    ['0,-1', '− Q'],
  ] as const
)
  .map(
    ([offset, label]) =>
      `<button type='button' class='btn btn-sm btn-outline' data-step='${offset}'>${label}</button>`,
  )
  .join('');

/**
A on P, B on Q, and their sum picked on the lattice
*/
const initial: State = {
  a: { at: xyOf(P), cell: [1, 0] },
  b: { at: xyOf(Q), cell: [0, 1] },
  cell: [1, 1],
};

/**
The figure as first served: the live panels, then the step buttons
*/
const view = (state: State = initial): string =>
  `<div class='hands' data-hands><div data-live>${live(state)}</div><div class='row hands-steps'>${buttons}</div></div>`;

/**
The state after stepping by [dm, dn], held to the lattice
*/
const stepped = (state: State, [dm, dn]: Cell): State => {
  const cell: Cell = [
    Math.max(-span, Math.min(span, state.cell[0] + dm)),
    Math.max(-span, Math.min(span, state.cell[1] + dn)),
  ];
  return isSame(cell, state.cell) ? state : { ...state, cell, from: state.cell };
};

/**
Wire one figure: drag A or B on the chord panel, hover or tap a lattice cell, step with the buttons
*/
/**
Where a pointer is in a panel's own units, and whether it is over the panel
*/
const nowhere = { height: 0, left: 0, top: 0, width: 1 };
const local = (
  host: Host,
  event: Pointer,
  selector: string,
): Readonly<{ isIn: boolean; u: Px }> => {
  const box = host.querySelector(selector)?.getBoundingClientRect() ?? nowhere;
  const [dx, dy] = [event.clientX - box.left, event.clientY - box.top];
  return {
    isIn: dx >= 0 && dy >= 0 && dx <= box.width && dy <= box.height,
    u: [(dx * 400) / box.width, (dy * 400) / box.width],
  };
};

/**
The state with the lattice cell under the pointer picked, if it is over one
*/
const hovered = (state: State, { isIn, u }: Readonly<{ isIn: boolean; u: Px }>): State => {
  const cell: Cell = [Math.round((u[0] - 96) / pitch), Math.round((112 - u[1]) / pitch)];
  const isCell = isIn && Math.max(...cell.map((k) => Math.abs(k))) <= span;
  return isCell && !isSame(cell, state.cell) ? { ...state, cell, from: undefined } : state;
};

/**
Which handle a press at u takes: the nearer one
*/
const pick = (state: State, u: Px): 'a' | 'b' =>
  gap(toPx(windowA, state.a.at), u) <= gap(toPx(windowA, state.b.at), u) ? 'a' : 'b';

/**
Wire one figure: drag A or B on the chord panel, hover or tap a lattice cell, step with the buttons
*/
const mount = (host: Host): void => {
  let state = initial;
  let drag: 'a' | 'b' | '' = '';
  const draw = (next: State): void => {
    const region = host.querySelector('[data-live]');
    if (region && next !== state) {
      region.innerHTML = live(next);
    }
    state = next;
  };
  const move = (event: Pointer): void => {
    draw(
      drag
        ? {
            ...state,
            [drag]: grab(local(host, event, '[data-chord]').u, state[drag === 'a' ? 'b' : 'a']),
          }
        : hovered(state, local(host, event, '[data-lattice]')),
    );
  };
  host.addEventListener('pointerdown', (event) => {
    const { isIn, u } = local(host, event, '[data-chord]');
    if (isIn) {
      drag = pick(state, u);
      host.setPointerCapture(event.pointerId);
    }
    move(event);
  });
  host.addEventListener('pointermove', move);
  const release = (): void => {
    drag = '';
  };
  for (const type of ['pointerup', 'pointercancel']) {
    host.addEventListener(type, release);
  }
  const onStep =
    (offset: Cell): (() => void) =>
    () => {
      draw(stepped(state, offset));
    };
  for (const button of host.querySelectorAll('[data-step]')) {
    const [dm, dn] = (button.dataset.step ?? '0,0').split(',').map(Number);
    button.addEventListener('click', onStep([dm, dn]));
  }
};

/**
Mount every figure on the page; outside a browser there is none
*/
const start = (
  page: Readonly<{ querySelectorAll: (selector: string) => Iterable<Host> }>,
): void => {
  for (const host of page.querySelectorAll('[data-hands]')) {
    mount(host);
  }
};

start('document' in globalThis ? globalThis.document : { querySelectorAll: (): Host[] => [] });

export {
  type Cell,
  type Host,
  chordAt,
  digits,
  grab,
  initial,
  lattice,
  marks,
  mount,
  name,
  pointOf,
  span,
  start,
  stepped,
  track,
  view,
};
