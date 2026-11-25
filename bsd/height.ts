import { roots } from './analytic.ts';
import { type Curve, type Point, float, plus } from './ec.ts';

/**
The canonical height ĥ(P), normalised as in the BSD formula, of an integral point: every point reduces to a
smooth point at every prime on these curves (prime conductor, Tamagawa number 1), so ĥ is twice the archimedean
local height, taken by Tate's series on the model shifted to x′ = x − e3 + 1, positive on the whole real locus
*/
const height = (curve: Curve, point?: Point): number => {
  if (!point) {
    return 0;
  }
  const [e1, e2, e3] = roots(curve);
  const [u1, u2] = [e1 - e3 + 1, e2 - e3 + 1];
  const [b2, b4, b6] = [-4 * (u1 + u2 + 1), 2 * (u1 * u2 + u1 + u2), -4 * u1 * u2];
  const b8 = (b2 * b6 - b4 * b4) / 4;
  let x = float(point.x) - e3 + 1;
  let sum = Math.log(x);
  for (let w = 1 / 4; w > 1e-18; w /= 4) {
    sum += w * Math.log(1 - b4 / x ** 2 - (2 * b6) / x ** 3 - b8 / x ** 4);
    x = (x ** 4 - b4 * x * x - 2 * b6 * x - b8) / (4 * x ** 3 + b2 * x * x + 2 * b4 * x + b6);
  }
  return sum;
};

/**
The regulator of two points: the determinant of their height pairing ⟨P, Q⟩ = (ĥ(P + Q) − ĥ(P) − ĥ(Q))/2
*/
const regulator = (curve: Curve, p: Point, q: Point): number => {
  const [hp, hq] = [height(curve, p), height(curve, q)];
  return hp * hq - ((height(curve, plus(curve, p, q)) - hp - hq) / 2) ** 2;
};

export { height, regulator };
