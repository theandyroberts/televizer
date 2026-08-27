# CDNstats integration seam

CDNstats currently marks its crude CSS zoom targets with `.presentationZoom` and
uses `transform: scale(2)` on hover/focus. That implementation is useful as the
site's hand-authored target inventory, but it should not be copied into Core.

## First integration

Once CDNstats can consume `@televizer/core`, mount one client-side instance:

```tsx
"use client";

import { useEffect } from "react";
import { Televizer } from "@televizer/core";

export function TelevizerBridge() {
  useEffect(() => {
    const televizer = new Televizer({
      targetSelectors: [".presentationZoom"],
    }).mount();
    return () => televizer.destroy();
  }, []);

  return null;
}
```

Render the bridge once near the dashboard root. During the migration, suppress
the old scale effect only while Televizer is active:

```css
html[data-televizer-active] .presentationZoom:hover,
html[data-televizer-active] .presentationZoom:focus,
html[data-televizer-active] .presentationZoom:focus-visible {
  transform: none;
  box-shadow: none;
  background: inherit;
  cursor: default;
}
```

This preserves CDNstats' existing behavior whenever Televizer is off.

## Progressive semantic hints

The existing target class gets CDNstats onto Core immediately. The next pass
should add semantic data to the site's reusable React components:

```tsx
<div
  className="metric presentationZoom"
  data-televizer-target
  data-televizer-type="metric"
  data-televizer-label={label}
  data-televizer-value={value}
  data-televizer-context={note}
  tabIndex={0}
>
```

Comparison structures that are not native HTML tables can opt into grid analysis
with `data-televizer-grid`, `data-televizer-row`, `data-televizer-column`, and
`data-televizer-cell`. Latency groups should declare
`data-televizer-rank="lower"`; uptime and score groups should declare `higher`.

## What the crude version taught us

- Keep target selection deliberate instead of treating every descendant as useful.
- Preserve keyboard focus as an activation path.
- Use a fast visual transition once hover intent has already been established.
- Edge-aware placement matters, but a fixed overlay is safer than changing a
  source element's transform and stacking context.
