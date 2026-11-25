/**
A pixel position
*/
type Px = readonly [number, number];

/**
A keyframe: a time in seconds and the attribute's value then
*/
type Key = readonly [number, number | string];

/**
A plot window: the data rectangle x0..x1 × y0..y1 drawn into the pixel rectangle px0..px1 × py0..py1
*/
type Win = Readonly<{
  px0: number;
  px1: number;
  py0: number;
  py1: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}>;

/**
How an element fades in at t0 (over `fade`, to `peak`), optionally dims at `dim` to `dimTo`, and leaves at `out`,
by default with the loop's end
*/
type Life = Readonly<{ dim?: number; dimTo?: number; fade?: number; out?: number; peak?: number }>;

/**
One SMIL loop of `duration` seconds; every element fades out before its end, so the restart is clean
*/
type Timeline = Readonly<{
  anim: (attribute: string, keys: readonly Key[]) => string;
  drawOn: (length: number, t0: number, t1: number) => string;
  duration: number;
  endA: number;
  life: (t0: number, options?: Life) => string;
}>;

/**
A coordinate to one decimal, never `-0`
*/
const f = (v: number): string => String(Math.round(v * 10) / 10 + 0);

const timeline = (duration: number): Timeline => {
  const endA = duration - 0.9;
  const anim = (attribute: string, keys: readonly Key[]): string => {
    const k = keys
      .map(([t, v]): Key => [Math.min(Math.max(t, 0), duration), v])
      .toSorted((a, b) => a[0] - b[0]);
    const [first] = k;
    const last = k.at(-1) ?? first;
    const all = [
      ...(first[0] > 0 ? [[0, first[1]] as const] : []),
      ...k,
      ...(last[0] === duration ? [] : [[duration, last[1]] as const]),
    ];
    let previous = 0;
    const times = all.map(([t], i) => {
      previous =
        i === all.length - 1 ? 1 : Math.max(previous, Math.round((t / duration) * 10_000) / 10_000);
      return previous;
    });
    const values = all.map(([, v]) => (typeof v === 'number' ? f(v) : v));
    return `<animate attributeName='${attribute}' dur='${duration}s' repeatCount='indefinite' values='${values.join(';')}' keyTimes='${times.join(';')}'/>`;
  };
  const life = (
    t0: number,
    { dim, dimTo = 0.2, fade = 0.4, out = endA, peak = 1 }: Life = {},
  ): string => {
    const end = dim === undefined ? peak : dimTo;
    const dims: Key[] =
      dim === undefined
        ? []
        : [
            [dim, peak],
            [dim + 0.4, dimTo],
          ];
    const leave: Key[] =
      out === endA
        ? [
            [endA, end],
            [duration - 0.3, 0],
          ]
        : [
            [out, end],
            [out + 0.3, 0],
          ];
    return anim('opacity', [[0, 0], [t0, 0], [t0 + fade, peak], ...dims, ...leave]);
  };
  const drawOn = (length: number, t0: number, t1: number): string =>
    anim('stroke-dashoffset', [
      [0, length],
      [t0, length],
      [t1, 0],
    ]);
  return { anim, drawOn, duration, endA, life };
};

/**
The window's maps from data to pixels
*/
const mapper = (w: Win): Readonly<{ px: (x: number) => number; py: (y: number) => number }> => ({
  px: (x) => w.px0 + ((x - w.x0) / (w.x1 - w.x0)) * (w.px1 - w.px0),
  py: (y) => w.py1 - ((y - w.y0) / (w.y1 - w.y0)) * (w.py1 - w.py0),
});
const isInside = (w: Win, x: number, y: number): boolean =>
  x >= w.x0 && x <= w.x1 && y >= w.y0 && y <= w.y1;
const polyLength = (pts: readonly Px[]): number =>
  pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
const pathD = (pts: readonly Px[]): string =>
  `M${pts.map((p) => `${f(p[0])} ${f(p[1])}`).join('L')}`;

/**
The infinite line through pixel a along d, clipped to the frame, keeping the span that covers ts ± m
*/
const lineSpan = (
  w: Win,
  a: Px,
  d: Px,
  ts: readonly number[],
  m = 24,
): Readonly<{ from: Px; hi: number; length: number; lo: number; to: Px; u: Px }> => {
  const n = Math.hypot(...d);
  const u: Px = [d[0] / n, d[1] / n];
  let [lo, hi] = [Math.min(...ts) - m, Math.max(...ts) + m];
  for (const [p, dp, lim0, lim1] of [
    [a[0], u[0], w.px0, w.px1],
    [a[1], u[1], w.py0, w.py1],
  ]) {
    // a line parallel to this pair of edges never crosses them
    const [t0, t1] =
      Math.abs(dp) > 1e-12 ? [(lim0 - p) / dp, (lim1 - p) / dp] : [-Infinity, Infinity];
    lo = Math.max(lo, Math.min(t0, t1));
    hi = Math.min(hi, Math.max(t0, t1));
  }
  const at = (t: number): Px => [a[0] + u[0] * t, a[1] + u[1] * t];
  return { from: at(lo), hi, length: hi - lo, lo, to: at(hi), u };
};

const dot = (x: number, y: number, r: number, inner = ''): string =>
  `<circle cx='${f(x)}' cy='${f(y)}' r='${r}' fill='currentColor' stroke='none'>${inner}</circle>`;
const ring = (x: number, y: number, r: number, inner = '', extra = ''): string =>
  `<circle cx='${f(x)}' cy='${f(y)}' r='${r}'${extra}>${inner}</circle>`;
const text = (x: number, y: number, s: string, inner = '', anchor = 'start'): string =>
  `<text x='${f(x)}' y='${f(y)}'${anchor === 'start' ? '' : ` text-anchor='${anchor}'`}>${s.replaceAll('-', '−')}${inner}</text>`;
const line = (a: Px, b: Px, extra = '', inner = ''): string =>
  `<line x1='${f(a[0])}' y1='${f(a[1])}' x2='${f(b[0])}' y2='${f(b[1])}'${extra}${inner ? `>${inner}</line>` : '/>'}`;
const clip = (id: string, w: Win): string =>
  `<defs><clipPath id='${id}'><rect x='${f(w.px0)}' y='${f(w.py0)}' width='${f(w.px1 - w.px0)}' height='${f(w.py1 - w.py0)}'/></clipPath></defs>`;
const svg = (label: string, h: number, body: string): string =>
  `<svg viewBox='0 0 400 ${h}' xmlns='http://www.w3.org/2000/svg' role='img' aria-label='${label}'>${body}</svg>`;

/**
Captions, one group of lines per [t0, t1, lines], centred at the top
*/
const captions = (
  tl: Timeline,
  items: readonly (readonly [number, number, readonly string[]])[],
): string =>
  items
    .map(
      ([t0, t1, lines]) =>
        `<g>${tl.life(t0, { fade: 0.3, out: Math.min(t1, tl.endA) })}${lines.map((l, k) => text(200, 16 + k * 15, l, '', 'middle')).join('')}</g>`,
    )
    .join('');

/**
A radius that swells from r to `to` at t and settles back by t + `back`
*/
const pulse = (tl: Timeline, r: number, to: number, t: number, rise = 0.15, back = 0.6): string =>
  tl.anim('r', [
    [t, r],
    [t + rise, to],
    [t + back, r],
  ]);

export {
  type Key,
  type Life,
  type Px,
  type Timeline,
  type Win,
  captions,
  clip,
  dot,
  f,
  isInside,
  line,
  lineSpan,
  mapper,
  pathD,
  polyLength,
  pulse,
  ring,
  svg,
  text,
  timeline,
};
