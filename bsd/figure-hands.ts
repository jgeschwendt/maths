import { view } from './hands.ts';

/**
hands.ts bundled for the browser: the tested module itself, inlined so the static page needs no build
*/
const entry = new URL('hands.ts', import.meta.url);
const build = await Bun.build({
  entrypoints: [entry.pathname],
  format: 'iife',
  minify: true,
  target: 'browser',
});
const bundle = await build.outputs[0].text();

/**
Meet the curve by hand: 389a1 drawn as served, then the script that makes it draggable
*/
const hands = (): string => `${view()}<script>${bundle.trim()}</script>`;

export { bundle, hands };
