# Row gap baselines design QA

- Source visual truth: `/var/folders/nr/325_kfl97h1fqbj3vx67jw0r0000gp/T/TemporaryItems/NSIRD_screencaptureui_90KQnW/Screenshot 2026-08-27 at 2.12.55 PM.png`
- Browser-rendered implementation: `/Users/andyroberts/Projects/televizer/row-gap-baselines-qa.png`
- Full-view comparison: `/Users/andyroberts/Projects/televizer/design-qa-row-gap-comparison.png`
- CSS viewport: 1130 × 576
- Source pixels: 1113 × 572
- Implementation pixels: 1115 × 568
- Normalization: implementation resized to 1113 × 572 with Lanczos resampling for the side-by-side comparison
- State: Televizer enabled; Claude row acquired; settled `ROW · GAP` presentation

## Full-view comparison evidence

The implementation preserves the source panel's four-card grid, source-order row values, cyan provenance treatment, navy surface, amber best-value cards, typography, radii, and spacing. Each card now adds the requested column-specific baseline directly below its header: `vs 89.3`, `vs 84.8`, `vs 77.2`, and `vs 96.2`. Claude's offsets remain `−1.4`, `--`, `--`, and `−1.5`.

The full-view comparison is sufficient because the complete component and all new 11px baseline labels are legible at the captured size; a separate focused crop would not expose additional fidelity detail.

## Required fidelity surfaces

- Fonts and typography: Existing display and UI type styles are unchanged. Baselines use compact tabular numerals, a small bold weight, and the established amber comparison color.
- Spacing and layout rhythm: Baselines occupy a four-pixel subheading gap without changing card count, panel width, or source order. Values retain their lower visual anchor.
- Colors and visual tokens: Existing navy, cyan, slate, white, and amber roles are preserved. Baselines reuse amber at reduced emphasis.
- Image quality and asset fidelity: This state contains no image assets or icons. Browser evidence remains sharp after density normalization.
- Copy and content: Every header shows the exact best value from its own column, and every large value remains the selected row's offset from that baseline.

## Comparison history

1. Source state: P1 — row-gap cards showed offsets without exposing the four different comparison baselines, making mixed-column values ambiguous.
2. First implementation test: P2 — the general compact formatter rounded `89.3` and `84.8` to `89` and `85`. Fix: preserve source precision for ordinary values while retaining compact notation for large byte quantities.
3. Final implementation: all four exact baselines are visible beneath their corresponding headers; no actionable P0, P1, or P2 differences remain.

## Interaction, responsive, and console checks

- Activated Televizer from the demo control.
- Acquired the Claude row through its row header.
- Pressed minus and confirmed `ROW · GAP`.
- Confirmed all four exact baselines and offsets in the live shadow DOM.
- At 768 × 576, the four cards remain inside a 712px panel; list `scrollWidth` equals `clientWidth` at 666px, so no horizontal overflow is introduced.
- Browser console errors: none; only Vite connection diagnostics were recorded.

## Findings

No actionable P0, P1, or P2 findings remain.

## Follow-up polish

No P3 follow-up is required for this state.

final result: passed
