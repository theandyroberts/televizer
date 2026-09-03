export const overlayStyles = `
  :host {
    all: initial;
    --tv-surface: #f5f1e8;
    --tv-surface-raised: #fbf8f1;
    --tv-ink: #202326;
    --tv-ink-soft: #4c5354;
    --tv-teal: #075963;
    --tv-ochre: #9b6208;
    --tv-cyan: #43d8eb;
    --tv-rule: rgba(32, 35, 38, .25);
    --tv-rule-soft: rgba(32, 35, 38, .15);
    --tv-warning: #7d4311;
    --tv-safe-x: max(24px, 5vw);
    --tv-safe-y: max(20px, 5vh);
    --tv-radius: 24px;
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    pointer-events: none;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: var(--tv-ink);
  }
  * { box-sizing: border-box; }
  .tv-stage { position: fixed; inset: 0; pointer-events: none; }
  .tv-dim {
    position: absolute;
    inset: 0;
    background: rgba(2, 10, 14, .55);
    backdrop-filter: saturate(.7) brightness(.66);
    opacity: 0;
    transition: opacity 180ms ease;
  }
  .tv-stage[data-visible="true"] .tv-dim { opacity: 1; }
  .tv-source {
    position: fixed;
    border: 3px solid var(--tv-cyan);
    border-radius: 12px;
    box-shadow: 0 0 0 4px rgba(2, 11, 14, .72), 0 0 30px rgba(67, 216, 235, .48);
    opacity: 0;
    transition: left 210ms cubic-bezier(.2,.8,.2,1), top 210ms cubic-bezier(.2,.8,.2,1), width 210ms cubic-bezier(.2,.8,.2,1), height 210ms cubic-bezier(.2,.8,.2,1), opacity 120ms ease;
  }
  .tv-stage[data-visible="true"] .tv-source { opacity: 1; }
  .tv-intent {
    position: fixed;
    display: flex;
    gap: 2px;
    align-items: center;
    height: 4px;
    opacity: 0;
    transform: translateY(-2px);
    transition: opacity 70ms ease, transform 70ms ease;
  }
  .tv-intent[data-visible="true"] { opacity: 1; transform: none; }
  .tv-intent i {
    width: 2px;
    height: 2px;
    border-radius: 999px;
    background: rgba(67, 216, 235, .76);
    box-shadow: 0 0 2px rgba(67, 216, 235, .56);
    animation: tv-dot-away 1ms linear var(--tv-dot-delay) both;
  }
  @keyframes tv-dot-away {
    from { opacity: 1; transform: scale(1); }
    to { opacity: 0; transform: scale(.35); }
  }
  .tv-connector {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
    opacity: 0;
    transition: opacity 120ms ease;
  }
  .tv-stage[data-visible="true"] .tv-connector { opacity: 1; }
  .tv-connector line {
    stroke: rgba(67, 216, 235, .78);
    stroke-width: 2;
    stroke-dasharray: 5 7;
    vector-effect: non-scaling-stroke;
  }
  .tv-panel {
    position: fixed;
    width: min(720px, calc(100vw - (2 * var(--tv-safe-x))));
    max-height: calc(100vh - (2 * var(--tv-safe-y)));
    overflow: hidden;
    border: 1px solid rgba(255,255,255,.7);
    border-radius: var(--tv-radius);
    padding: clamp(28px, 5vh, 50px);
    background: var(--tv-surface);
    box-shadow: 0 34px 86px rgba(0, 0, 0, .42), 0 0 0 1px rgba(32,35,38,.12);
    color: var(--tv-ink);
    opacity: 0;
    transform: translateY(10px) scale(.965);
    transform-origin: var(--tv-origin-x, 50%) var(--tv-origin-y, 50%);
    transition: left 260ms cubic-bezier(.2,.8,.2,1), top 260ms cubic-bezier(.2,.8,.2,1), opacity 160ms ease, transform 260ms cubic-bezier(.2,.8,.2,1);
  }
  .tv-stage[data-visible="true"] .tv-panel { opacity: 1; transform: none; }
  .tv-stage[data-visible="true"] .tv-panel[data-kind="collection"],
  .tv-stage[data-visible="true"] .tv-panel[data-kind="media"] { pointer-events: auto; }
  .tv-panel[data-orientation="horizontal"] { width: min(1500px, calc(100vw - (2 * var(--tv-safe-x)))); }
  .tv-panel[data-orientation="vertical"] { width: min(620px, calc(100vw - (2 * var(--tv-safe-x)))); }
  .tv-panel[data-kind="media"] {
    width: min(1100px, calc(100vw - (2 * var(--tv-safe-x))));
    padding: clamp(18px, 3vh, 34px);
  }
  .tv-panel[data-kind="quote"] { width: min(980px, calc(100vw - (2 * var(--tv-safe-x)))); }
  .tv-kicker {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: clamp(18px, 3vh, 34px);
    color: var(--tv-teal);
    font-size: clamp(12px, 1.65vh, 16px);
    font-weight: 760;
    letter-spacing: .16em;
    line-height: 1;
    text-transform: uppercase;
  }
  .tv-kicker-controls { display: flex; align-items: center; justify-content: flex-end; }
  .tv-scope { white-space: nowrap; }
  .tv-element-title {
    margin: 0 0 clamp(8px, 1.4vh, 15px);
    color: var(--tv-teal);
    font-size: clamp(18px, 2.6vh, 28px);
    font-weight: 650;
    letter-spacing: 0;
  }
  .tv-element-value {
    margin: 0;
    color: var(--tv-ink);
    font-size: clamp(48px, 8vh, 94px);
    font-weight: 560;
    line-height: 1.02;
    letter-spacing: -.015em;
    overflow-wrap: anywhere;
  }
  .tv-element-value[data-long="true"] {
    max-width: 34ch;
    font-size: clamp(32px, 5.2vh, 62px);
    line-height: 1.13;
    letter-spacing: -.01em;
  }
  .tv-context {
    margin: clamp(13px, 2.2vh, 24px) 0 0;
    color: var(--tv-ochre);
    font-size: clamp(16px, 2.2vh, 25px);
    font-weight: 570;
  }
  .tv-quote {
    width: 100%;
    margin: 0;
  }
  .tv-quote-text {
    width: 100%;
    max-width: 42ch;
    margin: 0;
    color: var(--tv-ink);
    font-size: clamp(32px, 5vh, 62px);
    font-weight: 570;
    letter-spacing: 0;
    line-height: 1.22;
    overflow-wrap: normal;
    word-break: normal;
    hyphens: none;
    text-wrap: balance;
  }
  .tv-quote-text::before { content: "\u201c"; color: var(--tv-ochre); }
  .tv-quote-text::after { content: "\u201d"; color: var(--tv-ochre); }
  .tv-quote-source {
    display: block;
    margin-top: clamp(14px, 2.4vh, 26px);
    color: var(--tv-teal);
    font-size: clamp(15px, 2vh, 22px);
    font-style: normal;
    font-weight: 650;
  }
  .tv-media-title {
    margin: 0 0 clamp(14px, 2vh, 22px);
    color: var(--tv-ink);
    font-size: clamp(28px, 4.5vh, 54px);
    font-weight: 580;
    letter-spacing: -.01em;
    line-height: 1.08;
  }
  .tv-media-frame {
    position: relative;
    display: grid;
    width: 100%;
    height: min(62vh, 620px);
    overflow: hidden;
    place-items: center;
    border: 1px solid var(--tv-rule);
    border-radius: 12px;
    background: #080b0d;
  }
  .tv-media-content {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    max-width: 100%;
    max-height: 100%;
    border: 0;
    object-fit: contain;
  }
  .tv-media-caption {
    margin: 12px 2px 0;
    color: var(--tv-ink-soft);
    font-size: clamp(12px, 1.6vh, 16px);
    font-weight: 520;
    line-height: 1.45;
  }
  .tv-collection-heading {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: clamp(24px, 5vw, 72px);
    margin-bottom: clamp(20px, 3.5vh, 38px);
    border-bottom: 1px solid var(--tv-rule);
    padding-bottom: clamp(20px, 3.5vh, 38px);
  }
  .tv-collection-title {
    min-width: 0;
    margin: 0;
    color: var(--tv-ink);
    font-size: clamp(52px, 12.5vh, 130px);
    font-weight: 470;
    line-height: .98;
    letter-spacing: -.02em;
    overflow-wrap: anywhere;
  }
  .tv-collection-title[data-long="true"] {
    display: -webkit-box;
    overflow: hidden;
    font-size: clamp(42px, 8vh, 86px);
    line-height: 1.02;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
  .tv-comparison-baseline {
    color: var(--tv-ochre);
    font-size: clamp(22px, 3.7vh, 42px);
    font-variant-numeric: tabular-nums;
    font-weight: 540;
    letter-spacing: -.01em;
    line-height: 1;
    white-space: nowrap;
  }
  .tv-items[data-orientation="horizontal"] {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(150px, 1fr);
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior: contain;
  }
  .tv-items[data-orientation="vertical"] {
    display: grid;
    overflow-y: auto;
    overscroll-behavior: contain;
    max-height: min(58vh, 620px);
  }
  .tv-item { min-width: 0; background: transparent; }
  .tv-items[data-orientation="horizontal"] .tv-item {
    display: flex;
    min-height: clamp(230px, 40vh, 390px);
    padding: 0 clamp(18px, 2.6vw, 42px);
    flex-direction: column;
    justify-content: space-between;
    text-align: center;
  }
  .tv-items[data-orientation="horizontal"] .tv-item + .tv-item { border-left: 1px solid var(--tv-rule-soft); }
  .tv-items[data-orientation="vertical"] .tv-item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 20px;
    min-height: clamp(64px, 9vh, 88px);
    border-top: 1px solid var(--tv-rule-soft);
    padding: 10px 14px;
  }
  .tv-items[data-orientation="vertical"] .tv-item:first-child { border-top-color: var(--tv-rule); }
  .tv-item-heading { display: grid; min-width: 0; gap: 8px; }
  .tv-item-label {
    overflow: hidden;
    color: var(--tv-teal);
    font-size: clamp(17px, 3.2vh, 34px);
    font-weight: 500;
    letter-spacing: 0;
    line-height: 1.15;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tv-items[data-orientation="vertical"] .tv-item-label {
    font-size: clamp(15px, 2vh, 22px);
  }
  .tv-item-baseline {
    color: var(--tv-ochre);
    font-size: clamp(19px, 4vh, 42px);
    font-variant-numeric: tabular-nums;
    font-weight: 520;
    letter-spacing: -.01em;
    line-height: 1;
    white-space: nowrap;
  }
  .tv-panel[data-transform="difference"] .tv-items[data-orientation="horizontal"] .tv-item-heading {
    border-bottom: 1px solid var(--tv-rule-soft);
    padding-bottom: clamp(12px, 2vh, 20px);
  }
  .tv-item-value {
    color: var(--tv-ink);
    font-size: clamp(42px, 8.5vh, 96px);
    font-variant-numeric: tabular-nums;
    font-weight: 560;
    letter-spacing: -.02em;
    line-height: 1;
  }
  .tv-items[data-orientation="vertical"] .tv-item-value { font-size: clamp(28px, 5vh, 52px); }
  .tv-item[data-rank="1"] .tv-item-value { color: var(--tv-ochre); font-size: clamp(54px, 9vh, 104px); }
  .tv-item[data-rank="2"] .tv-item-value { color: var(--tv-ink); font-size: clamp(46px, 7.8vh, 88px); }
  .tv-item[data-rank="3"] .tv-item-value { color: var(--tv-ink-soft); font-size: clamp(40px, 6.8vh, 78px); }
  .tv-item[data-rank]:not([data-rank="1"]):not([data-rank="2"]):not([data-rank="3"]) .tv-item-value {
    color: #747b7b;
    font-size: clamp(30px, 5.3vh, 58px);
  }
  .tv-panel[data-orientation="vertical"][data-transform="rank"] .tv-collection-heading,
  .tv-panel[data-orientation="vertical"][data-transform="difference"] .tv-collection-heading,
  .tv-panel[data-orientation="vertical"][data-transform="percent"] .tv-collection-heading {
    grid-template-columns: minmax(0, 1fr);
    gap: clamp(12px, 2vh, 20px);
  }
  .tv-panel[data-orientation="vertical"][data-transform="rank"] .tv-collection-title,
  .tv-panel[data-orientation="vertical"][data-transform="difference"] .tv-collection-title,
  .tv-panel[data-orientation="vertical"][data-transform="percent"] .tv-collection-title {
    font-size: clamp(42px, 7.5vh, 76px);
    line-height: 1.04;
  }
  .tv-panel[data-orientation="vertical"] .tv-item[data-rank] .tv-item-value {
    font-size: clamp(34px, 5vh, 52px);
  }
  .tv-panel[data-orientation="vertical"] .tv-item[data-rank="1"] .tv-item-value {
    font-size: clamp(40px, 5.8vh, 60px);
  }
  .tv-item[data-difference="best"] .tv-item-value { color: var(--tv-ochre); }
  .tv-item[data-difference="behind"] .tv-item-value { color: var(--tv-ink); }
  .tv-rank-note[data-kind="direction"] {
    margin: 0;
    border-left: 1px solid var(--tv-rule);
    padding: 10px 0 10px clamp(22px, 3.2vw, 46px);
    color: var(--tv-ochre);
    font-size: clamp(18px, 3vh, 34px);
    font-weight: 520;
    line-height: 1.15;
    white-space: nowrap;
  }
  .tv-panel[data-orientation="vertical"] .tv-rank-note[data-kind="direction"] {
    border-top: 1px solid var(--tv-rule-soft);
    border-left: 0;
    padding: clamp(12px, 2vh, 20px) 0 0;
    text-align: right;
  }
  .tv-rank-note[data-kind="warning"] {
    margin-top: 18px;
    border-left: 3px solid var(--tv-warning);
    padding: 8px 12px;
    color: var(--tv-warning);
    font-size: clamp(12px, 1.6vh, 16px);
    font-weight: 650;
  }
  .tv-helper {
    position: fixed;
    overflow: hidden;
    color: rgba(235, 246, 247, .58);
    font-size: 8px;
    font-weight: 650;
    letter-spacing: .075em;
    line-height: 1.35;
    opacity: 0;
    text-align: right;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
    transition: opacity 100ms ease;
  }
  .tv-helper[data-visible="true"] { opacity: 1; }
  .tv-help {
    position: fixed;
    top: var(--tv-safe-y);
    right: var(--tv-safe-x);
    width: min(340px, calc(100vw - (2 * var(--tv-safe-x))));
    border: 1px solid var(--tv-rule);
    border-radius: 18px;
    padding: 18px;
    background: var(--tv-surface-raised);
    box-shadow: 0 24px 70px rgba(0,0,0,.4);
    color: var(--tv-ink);
    opacity: 0;
    pointer-events: none;
    transform: translateY(-7px) scale(.98);
    transition: opacity 120ms ease, transform 160ms cubic-bezier(.2,.8,.2,1);
  }
  .tv-help[data-visible="true"] { opacity: 1; pointer-events: auto; transform: none; }
  .tv-help-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
    color: var(--tv-teal);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .14em;
  }
  .tv-help-close {
    all: unset;
    display: grid;
    width: 28px;
    height: 28px;
    place-items: center;
    border-radius: 7px;
    color: var(--tv-ink-soft);
    cursor: pointer;
    font: 20px/1 sans-serif;
  }
  .tv-help-close:hover, .tv-help-close:focus-visible { background: rgba(7,89,99,.1); color: var(--tv-teal); }
  .tv-help-list { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; }
  .tv-help-row { display: grid; grid-template-columns: 40px 1fr; align-items: center; gap: 8px; }
  .tv-help-row kbd {
    display: grid;
    min-width: 30px;
    height: 27px;
    place-items: center;
    border: 1px solid var(--tv-rule);
    border-radius: 5px;
    background: rgba(7,89,99,.06);
    color: var(--tv-teal);
    font: 750 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .tv-help-row span { color: var(--tv-ink-soft); font-size: 11px; }
  .tv-help-quote {
    margin: 14px 0 0;
    border-top: 1px solid var(--tv-rule-soft);
    padding-top: 12px;
    color: var(--tv-ochre);
    font-size: 11px;
    line-height: 1.4;
  }
  .tv-toast {
    position: fixed;
    top: var(--tv-safe-y);
    left: 50%;
    border: 1px solid var(--tv-rule);
    border-radius: 999px;
    padding: 10px 17px;
    background: var(--tv-surface-raised);
    box-shadow: 0 12px 40px rgba(0,0,0,.3);
    color: var(--tv-teal);
    font-size: 12px;
    font-weight: 780;
    letter-spacing: .1em;
    opacity: 0;
    transform: translate(-50%, -8px);
    transition: opacity 150ms ease, transform 150ms ease;
  }
  .tv-toast[data-visible="true"] { opacity: 1; transform: translate(-50%, 0); }
  @media (max-height: 620px) {
    .tv-panel { padding: 18px 22px; }
    .tv-kicker { margin-bottom: 14px; }
    .tv-collection-heading { margin-bottom: 16px; padding-bottom: 16px; }
    .tv-items[data-orientation="horizontal"] .tv-item { min-height: 142px; }
  }
  @media (max-width: 760px) {
    :host { --tv-safe-x: 18px; --tv-safe-y: 18px; }
    .tv-panel { --tv-radius: 18px; }
    .tv-collection-heading { grid-template-columns: 1fr; gap: 14px; }
    .tv-rank-note[data-kind="direction"] { border-left: 0; border-top: 1px solid var(--tv-rule-soft); padding: 12px 0 0; }
    .tv-items[data-orientation="horizontal"] { grid-auto-columns: minmax(155px, 1fr); }
  }
  @media (prefers-reduced-motion: reduce) {
    .tv-dim, .tv-source, .tv-connector, .tv-panel, .tv-helper, .tv-toast { transition-duration: 1ms !important; }
  }
`;
