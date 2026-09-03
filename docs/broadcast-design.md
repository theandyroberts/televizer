# Broadcast design

Televizer is a broadcast transformation layer, not a magnified copy of the
site underneath it. The default `editorial` theme deliberately remains
independent from host-page colors and component styling.

## Default editorial theme

The visual hierarchy uses a warm ivory surface, charcoal ink, deep teal
labels, and ochre comparison references. Cyan belongs to provenance: the
source outline, connector, and hover countdown. That separation makes it easy
to distinguish the original page location from the lifted presentation.

Collections use rules and whitespace instead of nested cards. Horizontal rows
read as a broadcast comparison table; vertical columns read as a ruled list.
Direction notes sit beside the primary heading, while keyboard instructions
remain behind `H` and `?`.

## Theme contract

The Shadow DOM host carries `data-theme="editorial"`. All visible colors,
rules, radius, safe-area, and surface values are semantic custom properties at
the top of `overlay-styles.ts`. State renderers emit semantic classes and do
not choose literal colors.

This is the first theme, not a theme picker. A future theme can override the
token layer and targeted state treatments without changing collection,
comparison, quote, or media rendering.

## Broadcast geometry and type

- Presentations stay inside a 5% frame-safe area, with practical minimum edge
  padding for smaller windows.
- Type scales primarily from frame height so line length does not inflate type
  on wide displays.
- Display text uses normal to slightly tight tracking; giant numerals never go
  tighter than `-0.02em`.
- Horizontal collections scroll only when their data cannot fit safely.
- Vertical collections own their internal scroll region so a long source table
  remains traversable.
- Televizer preserves three hierarchy levels at most: identity, descriptor or
  comparison reference, and primary value.

## Quote governor

Quote mode begins only after the user selects text and releases the selection
swipe. The broadcast excerpt then follows these rules:

- Preserve selections of 24 words or fewer.
- For longer selections, prefer the last natural punctuation or joining-word
  break between words 12 and 24.
- Fall back to 24 words when no natural break is available.
- Normalize whitespace and use U+2026 (`…`) for edited excerpts.
- Render at no more than four lines with a 42-character measure.

The governor edits before typography shrinks. Source attribution appears only
when the page provides it through a nearby `cite` element or
`data-televizer-context`; Televizer does not invent provenance.
