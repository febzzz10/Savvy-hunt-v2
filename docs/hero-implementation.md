# Savvy Hunt hero implementation

The homepage now uses a layered HTML/Next Image hero composed from the supplied artwork. The hero is present during initial data loading and does not depend on an approved gallery photo arriving. Scoreboard, programme, results, gallery and authorization contracts are unchanged.

## Assets inspected and used

The requested PNG source names were supplied in equivalent formats. No artwork was missing:

| Supplied file | Dimensions | Transparency | Integration |
| --- | --- | --- | --- |
| `mobile-hero-reference.png` | 388 × 1921 | Yes | Visual reference only; never rendered |
| `trophy.webp` | 1086 × 1448 | Yes | Foreground trophy, optimized by Next Image; cropped at mobile right edge |
| `trophy-background.webp` | 1086 × 1448 | Yes | Existing curved silhouette retained without an additional mask |
| `brush-stroke.svg` | 1448 × 1086 | Yes | Converted to 800px WebP with alpha, layered below trophy |
| `botanical-accent.svg` | 1086 × 1448 | Yes | Converted to 800px WebP, placed along scene edges at reduced opacity |
| `handwritten-accent.svg` | 1122 × 1402 | Yes | Converted to 800px WebP, lower right on mobile and beside trophy on desktop |

The three large SVGs total about 4.4MB. Their generated delivery versions total about 204KB. Black/neon-green keying residue was removed from the generated decorative versions; original source files remain intact. Regenerate with `node scripts/optimize-hero-artwork.mjs`.

## Files changed for this task

- `components/home.tsx`: existing subscriptions and lower sections retained; new hero replaces the previous masthead.
- `components/home/hero-section.tsx`: semantic headline, copy, crown/underline SVGs, and actual route links. Cormorant Garamond is scoped to the hero only.
- `components/home/hero-artwork.tsx`: all five artwork layers, intrinsic dimensions, responsive sizes, inert decorations and image preloading.
- `components/home/hero.css`: mobile, tablet and desktop compositions and homepage header treatment. Uses existing theme tokens.
- `components/site-navigation.tsx`: homepage-only monogram and accessible icon-only mobile menu; existing navigation and real connection component retained.
- `public/images/hero/{brush-stroke,botanical-accent,handwritten-accent}-optimized.webp`: generated delivery assets.
- `tests/home-loading.test.tsx`, `tests/home-sections.test.tsx`: isolated Next font mock and new two-line headline expectation.
- `scripts/optimize-hero-artwork.mjs`, `scripts/verify-hero.mjs`: reproducible asset optimization and browser verification.
- `docs/hero-implementation.md`: this report.

## Responsive behavior

Mobile places the two-line headline left of the curved photography, with the foreground trophy cropped at the right edge. CTAs stack below readable copy, and artwork cannot capture pointer events. The handwritten accent remains clear of the following section. At tablet sizes the artwork becomes larger and the copy retains a narrow reading width. Desktop uses a broad composition with the full trophy toward the right and CTAs alongside one another. Homepage header presentation is scoped by pathname; other public and admin headers retain their existing presentation.

No continuous motion was introduced. Existing reduced-motion handling remains in force.

## Validation

- ESLint and TypeScript: passed (`npm.cmd run lint`).
- Tests: 108 passed across 19 files (`npm.cmd test`).
- Production build: passed (`npm.cmd run build`).
- Browser: Edge at 320×800, 360×800, 375×812, 390×844, 430×932, 768×1024 and 1440×900.
- Zero horizontal overflow, automated WCAG A/AA violations, page runtime errors or hydration exceptions in these checks.
- Both CTA destinations returned successfully; controls were hit-tested; all mobile menu destinations were visible; Escape returned focus to the menu control.
- Actual Convex connected, offline and reconnected states were verified. No official data was written.
- Observed local CLS remained below 0.001 in this run. This is laboratory evidence, not a guarantee of production field metrics.

Evidence: `verification-evidence/hero/report.json` and `hero-{width}.png` in the same directory.

## Remaining reference differences

This is a responsive recreation rather than a screenshot overlay. The supplied trophy and lettering artwork have different edge texture from their appearance within the flattened reference. The handwriting retains the supplied letterforms. Cormorant Garamond is a close editorial match, with different exact glyph metrics. The existing theme's readable green text colors and existing CTA styling are retained. Header connection text reflects the actual state, so its wrapping may differ when offline. Unrelated sections below the hero continue to display real backend content rather than the reference's sample schools and events.
