# Editorial Broadcast Theme Design QA

## Source visual truth

- Reference: `/var/folders/nr/325_kfl97h1fqbj3vx67jw0r0000gp/T/codex-clipboard-f3c12cb7-46e9-4a8e-a367-6ccd9b563f36.png`
- Reference pixels: 1672 × 941
- Target state: Televizer on; Fastly row; absolute gap transform; lower is
  better.
- Defining characteristics: warm ivory plate, charcoal display type, deep teal
  utility labels, ochre baselines, flat rules, no nested cards, and cyan source
  provenance.

## Rendered implementation

- Local URL: `http://127.0.0.1:4173/`
- Primary capture: `design-qa-editorial-row-gap.png`
- Side-by-side comparison: `design-qa-editorial-comparison.png`
- Browser viewport override: 1680 × 909; capture pixels: 1665 × 901 because
  the in-app browser omits its scrollbar strip and outer edge.
- Stress-test viewport: 1180 × 640.

## Interaction and state verification

- Activated Televizer with `Option/Alt + T`.
- Hovered the Fastly row, pressed `-`, then `L`.
- Confirmed `+11ms`, `+5ms`, `+12ms`, and `+11ms`, with a `Lower is better.`
  direction label and all four best-value baselines.
- Confirmed direct column-header acquisition, row-header ordinal acquisition,
  ordinary element acquisition, click/scroll dismissal, and image zoom.
- Confirmed no clipping or safe-area violation at 1180 × 640 for element,
  row, column, ordinal, and media states.
- Confirmed 56 automated tests, all workspace typechecks, and all production
  builds pass.

## Full-view comparison evidence

- The selected reference and final implementation were placed together in
  `design-qa-editorial-comparison.png` and inspected as one comparison input.
- The implementation matches the reference hierarchy, palette, flat ruled
  construction, large-title weight, comparison label/value grouping, rounded
  outer plate, and visible source provenance.
- The implementation keeps a deliberate 5% horizontal safe area from the
  research brief, so its plate is slightly narrower than the concept image.
- Page content differs only because the reference and implementation captured
  the source row at different scroll positions.

## Focused-state evidence

- `design-qa-editorial-column-short.png`: vertical collection at 1180 × 640.
- `design-qa-editorial-column-ordinal-fixed.png`: repaired ordinal column at
  1034 × 970.
- `design-qa-editorial-column-ordinal-comparison.png`: reported failure and
  repaired state in one comparison input.
- `design-qa-editorial-rank-short.png`: ordinal row at 1180 × 640.
- `design-qa-editorial-element-short.png`: single metric at 1180 × 640.
- `design-qa-editorial-media-short.png`: image zoom at 1180 × 640.
- Quote rendering and the 24-word governor are covered by focused unit and
  lifecycle tests; the in-app browser did not preserve a synthetic selection
  swipe during visual capture, so no browser-mutated selection was used as QA
  evidence.

## Comparison history

1. The first implementation used correct colors and structure but rendered too
   compactly and showed an unintended vertical scrollbar in horizontal rows.
2. Increased frame-height display sizing, item depth, and label/value scale;
   removed vertical overflow from horizontal rows.
3. The larger real panel exposed a placement estimate that crossed the bottom
   safe area. Placement now measures the rendered panel before clamping it.
4. Final comparison found only expected 5% safe-area and page-scroll
   differences. No actionable P0, P1, or P2 differences remain.
5. A deployed 1034 × 970 capture exposed a P1 vertical ordinal regression:
   the direction label shared the title's grid row, forcing `MMLU score` into
   four fragments and leaving only two ranks visible. Vertical transformed
   collections now stack the direction beneath a width-preserving title and
   use column-specific rank sizes. The post-fix comparison shows a single-line
   title and all five ranks inside the safe area.

## Checklist

- [x] Match the selected warm editorial visual system.
- [x] Keep source provenance cyan and visually separate.
- [x] Remove nested collection cards.
- [x] Put comparison direction in the heading hierarchy.
- [x] Use frame-height typography and conservative tracking.
- [x] Keep every tested state inside the broadcast safe area.
- [x] Tokenize the theme for future visual options.
- [x] Add and test quote-specific rendering and excerpt governance.
- [x] Preserve vertical-column density in ordinal, gap, and percent views.

final result: passed
