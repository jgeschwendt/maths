import { defineConfig } from '@jlg/oxlint';

export default defineConfig({
  ignorePatterns: ['docs/**', 'node_modules'],
  overrides: [
    {
      files: ['bsd/**/*.ts'],
      rules: {
        // the mathematics' own notation: a curve's a2, a point's x and y, a prime p, a term n, a sum z. (2026-11-25)
        'id-length': 'off',
        // a drawing primitive takes SVG's own positional order (x, y, r, inner); an options object per call would double the figures. (2026-11-25)
        'max-params': 'off',
        // the published values a test checks and a figure's layout coordinates are the content, not constants to name. (2026-11-25)
        'no-magic-numbers': 'off',
        // the roots e1, e2, e3, an index i or j and mod are the notation's names; options replace the base's, so its other names stay checked. (2026-11-25)
        'unicorn-js/name-replacements': ['error', { ignore: [String.raw`^(e\d?|i|j|mod)$`] }],
      },
    },
    {
      files: ['bsd/hands.ts'],
      rules: {
        // the figure redraws itself from its own markup of computed numbers, never from input. (2026-11-25)
        'unicorn-js/no-unsafe-dom-html': 'off',
      },
    },
    {
      files: ['bsd/page.ts'],
      rules: {
        // the page's registry imports one module per figure, so it grows with the page. (2026-11-25)
        'import/max-dependencies': 'off',
      },
    },
  ],
});
