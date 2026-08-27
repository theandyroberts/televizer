# Televizer principles

## Interaction boundary

The first product boundary is intentionally small:

- `E` — lift an element.
- `R` — lift the current row.
- `C` — lift the current column.
- `1` — toggle the lifted numeric values into ordinal positions.
- `5` or `%` — show relative disadvantage from the best comparable value.
- `-` — show absolute disadvantage from the best comparable value.
- `H` — temporarily reveal the tiny on-air command footnote.
- `?` — show the compact command reference.
- Select and pause — lift selected text as a quote.

The operating loop is: look, point, optionally press one key, keep talking.

## Hard rules

1. Preserve topology. Rows, columns, and items stay in source order. Rank never sorts.
2. Preserve provenance. The audience can see where lifted information came from.
3. Transform presentation, not source. Televizer never mutates page content.
4. Preserve order, not empty space. Filtering may close gaps without reordering items.
5. Emphasize meaning. In ordinal mode, the ranks—not the decimal evidence—are the story.
6. Animate causality. Motion explains lifting, returning, and transformation.
7. Stay calm. Hover intent is a core behavior, not optional polish.

## Current scope

The 1.0 direction is desktop-first. Touch, recording, OBS, narration, remote control,
and a standalone browser remain outside the current implementation boundary.
