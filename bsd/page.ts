import { biggerWorld } from './figure-bigger-world.ts';
import { clue } from './figure-clue.ts';
import { derivative } from './figure-derivative.ts';
import { graphs } from './figure-graphs.ts';
import { machineRank1 } from './figure-machine-rank1.ts';
import { machineRank2 } from './figure-machine-rank2.ts';
import { measures } from './figure-measures.ts';
import { pointsRank0 } from './figure-points-rank0.ts';
import { pointsRank1 } from './figure-points-rank1.ts';
import { pointsRank2 } from './figure-points-rank2.ts';

/**
Every computed figure by the id of its markers in docs/index.html
*/
const figures: Readonly<Record<string, () => string>> = {
  'bigger-world': biggerWorld,
  clue,
  derivative,
  graphs,
  'machine-rank1': machineRank1,
  'machine-rank2': machineRank2,
  measures,
  'points-rank0': pointsRank0,
  'points-rank1': pointsRank1,
  'points-rank2': pointsRank2,
};

/**
The page with each `<!-- figure:id -->…<!-- /figure -->` span re-rendered
*/
const render = (html: string): string =>
  html.replaceAll(
    /<!-- figure:(?<id>[\w-]+) -->[\s\S]*?<!-- \/figure -->/gu,
    (_, id: string) => `<!-- figure:${id} -->${figures[id]()}<!-- /figure -->`,
  );

/**
docs/index.html; `mise run docs` writes `render` of it back
*/
const page = new URL('../docs/index.html', import.meta.url);

export { figures, page, render };
