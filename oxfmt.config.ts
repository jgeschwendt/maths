import { defineConfig } from '@jlg/oxfmt';

export default defineConfig({
  // the licences, the citation and the cover are kept verbatim
  ignorePatterns: [
    '.stele/**',
    'AGENTS.md',
    'CITATION.cff',
    'LICENSE-CC-BY-4.0.txt',
    'LICENSE.md',
    'README.md',
    'docs/**',
  ],
  quoteProps: 'consistent',
});
