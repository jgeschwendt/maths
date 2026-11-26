# maths

```stele
kind: system
purpose: open problems in mathematics probed by computation — first Birch–Swinnerton-Dyer on 11a1, 37a1 and 389a1, every figure computed, every number checked against published values
commands:
  check: mise run check
  docs: mise run docs
  lint: bunx oxlint
  test: bun test --coverage
```

The design and the write-up are `docs/index.html` (GitHub Pages, https://jgeschwendt.github.io/maths/), the only prose source.

| where                                                 | what                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bsd/`                                                | the BSD model, one module per layer: `ec.ts` exact curve arithmetic and a_n by point counting over `allgens.txt` (three lines of Cremona's table, source in its header); `analytic.ts` L(s) by the smoothed sum, the AGM periods, ℘; `height.ts` canonical heights and the regulator; `heegner.ts` Heegner points at level 1 and conductor 5 with the class-group action; `sister.ts` the function-field analogue, exact: y² + xy = x³ − t⁶ over F₅(t), its L-polynomial by fibre counts and two independent points; `model.ts` everything computed once; `draw*.ts` the SVG primitives; `figure-*.ts` one per computed figure; `hands.ts` the by-hand figure's browser module, which `figure-hands.ts` bundles into the page; `page.ts` renders them into the page |
| `bsd/*.test.ts`                                       | the published-value checks — L-values, a_n, periods, heights, the Heegner landings, the trace relations, the non-cancelling weighted sum — and that `docs/index.html` is current; 100 % line and function coverage or the gate fails (`bunfig.toml`)                                 |
| `probe/`                                              | the Rust probe: exact L-polynomials of E and 1250 quadratic twists, their BSD invariants and Yun–Zhang's predicted self-intersection (`bsd.rs`, `yz.rs`); `mise run docs` sweeps it into `bsd/twists.tsv`, which `bsd/twists.ts` reads and `figure-twists.ts` draws; gated by fmt, clippy and tests with no uncovered line |
| `docs/`                                               | `index.html`, the page: each computed figure sits inline between `<!-- figure:<id> -->` and `<!-- /figure -->`, which `mise run docs` rewrites; `page.css` holds only what is this page's                                                                                       |
| `LICENSE.md`, `LICENSE-CC-BY-4.0.txt`, `CITATION.cff` | code under MIT; writing, figures and data under CC BY 4.0; how to cite — kept verbatim, outside the formatter                                                                                                                                                                 |

## Working here

- `mise run check` is the gate, and hk's pre-push and CI run it: format, lint, `tsc`, the suite under coverage, `stele check`, `stele emit --check`. `hk install --mise` once per clone arms the hook.
- A change to a computed figure lands with `mise run docs`; the suite fails while the page is stale.
- Figures draw in `currentColor` and opacity only, so both themes of the page carry them.
- Literature before computation: sweep what is published (gigaresearch; ledgers in `~/.claude/research/bsd-*`) and enter every known result in the page's status table with its source before a probe computes anything. A probe targets only what the sweep found undone. (since 2026-11-26 · "If something was discovered we should know it. Not discover ourselves")

<!-- @stele -->

## Hazards (0 active)


## Map

| node  | kind      | purpose                                                                                                                                                                                    | unfold                                           |
| ----- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| docs  | container | the page — `index.html` (GitHub Pages), the only prose source — BSD in computed figures, each claim's status, the open step, how to reproduce; `page.css` holds only what is this page's   | `stele unfold docs` · or read `docs/AGENTS.md`   |
| probe | container | the Rust probe — exact L-polynomials of Ulmer's curve and its quadratic twists over F5(t), their BSD invariants and Yun–Zhang's self-intersection; `mise run docs` writes `bsd/twists.tsv` | `stele unfold probe` · or read `probe/AGENTS.md` |

## Indexes

All invariants: `.stele/index/invariants.md` · all hazards: `.stele/index/hazards.md`

## Engine

`stele` CLI available → `stele root | unfold <id> | invariants --touching <path> | hazards | nodes --kind <k>`. MCP: `stele serve`.
No engine → everything above is complete; nested AGENTS.md files carry the detail (nearest file wins).
<!-- @end -->
