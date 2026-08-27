```text
                         \  /
                    .------------.
                   /              \
                  |   TELEVIZER    |
                  |  THE WEB, LIVE |
                   \______________/
                      /|      |\
```

# Televizer

Televizer makes the web presentable. Turn it on, point at something meaningful,
and it lifts that content into a television-readable layer without changing the
source page or rearranging its information.

This repository contains Televizer Core and a Vite playground that exercises
element, table, comparison, quote, media zoom, hover-intent, and dismissal
behavior.

## Try the demo

[Try Televizer in the browser](https://theandyroberts.github.io/televizer/),
then press `Option/Alt + T` to turn it on.

To run the demo locally, use Node.js 22 or newer:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, then press `Option/Alt + T` to turn
Televizer on. Point at a card or table value and pause until the five tiny cyan
dots count down. The lifted presentation remains visually connected to its
source.

Click ordinary page space, scroll, resize, or move the pointer out of the page
to dismiss the current presentation. Press `Option/Alt + T` again to turn
Televizer off.

## Controls

| Key | Action |
| --- | --- |
| `Option/Alt + T` | Turn Televizer on or off |
| `E` | Present the current element |
| `R` | Expand the current table cell into its row |
| `C` | Expand the current table cell into its column |
| `1` | Toggle ordinal ranks without reordering the source |
| `5` or `%` | Toggle percentage disadvantage from the best value |
| `-` | Toggle absolute disadvantage from the best value |
| `H` | Toggle a tiny on-air command footnote below the presentation |
| `?` | Open or close the compact help panel |

Presentations contain no operator controls by default. Press `H` only when a
small reminder is useful; the right-aligned footnote sits outside the lower
border and disappears with the presentation. Use `?` for the complete help
surface.

### Pointing semantics

- An ordinary table value presents only that cell.
- A row header presents the full row.
- A column header presents the full column.
- Selecting text and pausing over the selection presents it as a quote.
- Images, native video, and embedded frames open in Televizer's media stage.
- Moving to a new ordinary target returns to element mode, so row and column
  scope cannot accidentally leak into the next presentation.

For comparisons, Televizer uses the same direction model for ranks and gaps.
Scores and uptime are normally higher-is-better; latency, cost, and failure
metrics are normally lower-is-better. The best item displays `--` and
worse items display a negative disadvantage. If direction is unknown—or a
percentage comparison has a zero baseline—Televizer declines to invent a
result.

### Media zoom

Images use their current source, alternate text, nearest figure caption, and
optional `data-televizer-label` or `data-televizer-context` metadata. Native
video opens with controls at the source player's current time. Televizer hands
playback to the zoomed player, then returns its time, volume, rate, loop, mute,
and playing state to the source when the presentation closes.

Iframes are reproduced from their `src` or `srcdoc` without inspecting their
contents. A generic cross-origin player may therefore restart when zoomed;
provider-specific adapters are the right path when exact YouTube, Vimeo, or
other third-party playback continuity is required.

## Add Televizer to a page

Mount one Core instance in the browser:

```ts
import { Televizer } from "@televizer/core";

const televizer = new Televizer().mount();

// Later, if needed:
televizer.destroy();
```

Core recognizes semantic HTML such as headings, links, articles, figures, and
native tables. Mark application-specific objects explicitly when you know they
should be presentable:

```html
<article
  data-televizer-target
  data-televizer-type="metric"
  data-televizer-label="Healthy now"
  data-televizer-value="99.4%"
  data-televizer-context="54 of 55 serving normally"
>
  <!-- Existing page content -->
</article>
```

Existing target inventories can be adopted without editing every component:

```ts
const televizer = new Televizer({
  targetSelectors: [".presentationZoom"],
}).mount();
```

When active, Televizer sets `data-televizer-active` on `<html>`, allowing a
migration stylesheet to disable an older hover effect only while Televizer is
running.

### Tables and comparison direction

Native table headers provide row and column meaning automatically. Declare the
comparison direction when it cannot be inferred reliably:

```html
<table data-televizer-rank="higher">
  <!-- score table -->
</table>

<table data-televizer-rank="lower">
  <!-- latency table -->
</table>
```

A column can override the table direction with its own
`data-televizer-rank="higher"` or `"lower"`. Non-native data grids can provide
`data-televizer-grid`, `data-televizer-row`, `data-televizer-column`, and
`data-televizer-cell` hints. See
[CDNstats integration](docs/cdnstats-integration.md) for a React migration
example.

## Configuration

```ts
const televizer = new Televizer({
  acquireDelay: 1050,
  traverseDelay: 175,
  releaseDelay: 150,
  maxElementTextLength: 420,
  targetSelectors: [".existing-presentable-class"],
}).mount();
```

- `acquireDelay` controls the first deliberate pause.
- `traverseDelay` controls movement between targets after intent is established.
- `releaseDelay` supplies a small grace period when leaving the page.
- `maxElementTextLength` prevents broad text containers from becoming noisy
  automatic targets.
- `targetSelectors` bridges site-specific target markers into Core.

## Repository layout

```text
packages/core/   Framework- and browser-wrapper-agnostic presentation engine
apps/demo/       Torture-test playground and product demo
docs/            Product principles and integration notes
```

## Development

```bash
npm test
npm run typecheck
npm run build
```

Televizer Core is deliberately ignorant of React, CDNstats, and any particular
browser wrapper. Adapters configure the same engine; Core owns presentation
semantics, intent, comparison transforms, provenance, and lifecycle behavior.
