import { periods } from './analytic.ts';
import { svg, text } from './draw.ts';
import { curves } from './ec.ts';
import { height, regulator } from './height.ts';
import { models } from './model.ts';

/**
6b: what the machine measures. Top: the slope L′(1) of 37a1 is Ω·ĥ(P), the length of P. Bottom: the bend L″(1)/2
of 389a1 is Ω·Reg, the area P and Q span
*/
const measures = (): string => {
  const [e1, e2] = [curves['37a1'], curves['389a1']];
  const [o1, o2] = [2 * periods(e1).w1, 2 * periods(e2).w1];
  const [slope, bend] = [models['37a1'].at1[1], models['389a1'].at1[2] / 2];
  return svg(
    'the slope equals the real period times the length of P; the bend equals the real period times the area P and Q span',
    190,
    [
      `<g opacity='.4'><line x1='26' y1='50' x2='114' y2='50'/><line x1='26' y1='140' x2='114' y2='140'/></g>`,
      `<path d='M30 66 L110 34'/><path d='M30 118 Q70 162 110 118'/>`,
      `<g fill='currentColor' stroke='none'><circle cx='70' cy='50' r='3.5'/><circle cx='70' cy='140' r='3.5'/><circle cx='244' cy='60' r='3.5'/><circle cx='304' cy='40' r='3.5'/><circle cx='244' cy='158' r='3.5'/><circle cx='294' cy='150' r='3.5'/><circle cx='260' cy='118' r='3.5'/><circle cx='310' cy='110' r='3.5' opacity='.5'/></g>`,
      text(70, 86, `slope ${slope.toFixed(3)}`, '', 'middle'),
      text(70, 180, `bend ${bend.toFixed(3)}`, '', 'middle'),
      `<g style='font-size:16px'>${text(150, 56, '=', '', 'middle')}${text(150, 146, '=', '', 'middle')}</g>`,
      text(172, 55, `${o1.toFixed(3)} ×`),
      text(172, 145, `${o2.toFixed(3)} ×`),
      `<line x1='244' y1='60' x2='304' y2='40' stroke-width='2.5'/>`,
      `<g opacity='.6'>${text(236, 74, '0', '', 'end')}</g>`,
      text(312, 38, 'P'),
      text(290, 86, `length of P: ${height(e1, e1.generators[0]).toFixed(4)}`, '', 'middle'),
      `<path d='M244 158 L294 150 L310 110 L260 118 Z' fill='currentColor' fill-opacity='.25'/>`,
      text(300, 156, 'P') + text(248, 114, 'Q'),
      text(
        290,
        180,
        `area P and Q span: ${regulator(e2, e2.generators[0], e2.generators[1]).toFixed(4)}`,
        '',
        'middle',
      ),
    ].join(''),
  );
};

export { measures };
