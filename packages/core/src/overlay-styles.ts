export const overlayStyles = `
  :host {
    all: initial;
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    pointer-events: none;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: #f8fbff;
  }
  * { box-sizing: border-box; }
  .tv-stage { position: fixed; inset: 0; pointer-events: none; }
  .tv-dim {
    position: absolute;
    inset: 0;
    background: rgba(3, 8, 18, .42);
    backdrop-filter: saturate(.78) brightness(.82);
    opacity: 0;
    transition: opacity 180ms ease;
  }
  .tv-stage[data-visible="true"] .tv-dim { opacity: 1; }
  .tv-source {
    position: fixed;
    border: 3px solid #67e8f9;
    border-radius: 12px;
    box-shadow: 0 0 0 4px rgba(8, 16, 30, .78), 0 0 32px rgba(34, 211, 238, .48);
    opacity: 0;
    transition: left 210ms cubic-bezier(.2,.8,.2,1), top 210ms cubic-bezier(.2,.8,.2,1), width 210ms cubic-bezier(.2,.8,.2,1), height 210ms cubic-bezier(.2,.8,.2,1), opacity 120ms ease;
  }
  .tv-stage[data-visible="true"] .tv-source { opacity: 1; }
  .tv-intent {
    position: fixed;
    display: flex;
    gap: 2px;
    align-items: center;
    height: 5px;
    opacity: 0;
    transform: translateY(-2px);
    transition: opacity 70ms ease, transform 70ms ease;
  }
  .tv-intent[data-visible="true"] { opacity: 1; transform: none; }
  .tv-intent i {
    width: 3px;
    height: 3px;
    border-radius: 999px;
    background: rgba(103,232,249,.78);
    box-shadow: 0 0 3px rgba(34,211,238,.62);
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
    stroke: rgba(103, 232, 249, .72);
    stroke-width: 2;
    stroke-dasharray: 5 7;
    vector-effect: non-scaling-stroke;
  }
  .tv-panel {
    --tv-accent: #67e8f9;
    position: fixed;
    width: min(520px, calc(100vw - 48px));
    max-height: min(78vh, 760px);
    overflow: hidden;
    border: 1px solid rgba(255,255,255,.18);
    border-radius: 24px;
    padding: 22px;
    background:
      radial-gradient(circle at 100% 0, rgba(103,232,249,.18), transparent 42%),
      linear-gradient(145deg, rgba(17,27,48,.985), rgba(6,13,27,.99));
    box-shadow: 0 32px 90px rgba(0,0,0,.58), 0 0 0 1px rgba(2,8,23,.9);
    opacity: 0;
    transform: translateY(10px) scale(.94);
    transform-origin: var(--tv-origin-x, 50%) var(--tv-origin-y, 50%);
    transition: left 260ms cubic-bezier(.2,.8,.2,1), top 260ms cubic-bezier(.2,.8,.2,1), opacity 160ms ease, transform 260ms cubic-bezier(.2,.8,.2,1);
  }
  .tv-stage[data-visible="true"] .tv-panel { opacity: 1; transform: none; }
  .tv-panel[data-orientation="horizontal"] {
    width: min(1120px, calc(100vw - 56px));
  }
  .tv-panel[data-orientation="vertical"] {
    width: min(500px, calc(100vw - 48px));
  }
  .tv-kicker {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
    color: #99a8be;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: .14em;
    text-transform: uppercase;
  }
  .tv-brand { color: var(--tv-accent); }
  .tv-kicker-controls {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }
  .tv-scope { white-space: nowrap; }
  .tv-element-title {
    margin: 0 0 8px;
    color: #a7b4c8;
    font-size: clamp(17px, 2vw, 26px);
    font-weight: 700;
    letter-spacing: -.02em;
  }
  .tv-element-value {
    margin: 0;
    color: #fff;
    font-size: clamp(40px, 6.2vw, 86px);
    font-weight: 850;
    line-height: 1.02;
    letter-spacing: -.055em;
    overflow-wrap: anywhere;
  }
  .tv-element-value[data-long="true"] {
    max-width: 28ch;
    font-size: clamp(27px, 3.7vw, 54px);
    line-height: 1.15;
  }
  .tv-context {
    margin: 15px 0 0;
    color: #7dd3fc;
    font-size: clamp(15px, 1.7vw, 22px);
    font-weight: 650;
  }
  .tv-collection-title {
    margin: 0 0 18px;
    font-size: clamp(27px, 4vw, 54px);
    line-height: 1;
    letter-spacing: -.045em;
  }
  .tv-items[data-orientation="horizontal"] {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(112px, 1fr);
    gap: 10px;
    overflow-x: auto;
    padding-bottom: 4px;
  }
  .tv-items[data-orientation="vertical"] {
    display: grid;
    gap: 6px;
    overflow-y: auto;
    max-height: min(56vh, 560px);
  }
  .tv-item {
    min-width: 0;
    border: 1px solid rgba(148,163,184,.16);
    border-radius: 15px;
    background: rgba(15,23,42,.76);
  }
  .tv-items[data-orientation="horizontal"] .tv-item {
    display: flex;
    min-height: 138px;
    padding: 14px 10px;
    flex-direction: column;
    justify-content: space-between;
    text-align: center;
  }
  .tv-items[data-orientation="vertical"] .tv-item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 18px;
    min-height: 64px;
    padding: 9px 16px;
  }
  .tv-item-label {
    overflow: hidden;
    color: #b7c3d4;
    font-size: clamp(13px, 1.35vw, 18px);
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tv-item-value {
    color: #f8fbff;
    font-size: clamp(24px, 3.2vw, 44px);
    font-variant-numeric: tabular-nums;
    font-weight: 820;
    letter-spacing: -.04em;
  }
  .tv-item[data-rank="1"] { border-color: rgba(250,204,21,.7); background: rgba(113,63,18,.32); }
  .tv-item[data-rank="2"] { border-color: rgba(203,213,225,.58); background: rgba(71,85,105,.35); }
  .tv-item[data-rank="3"] { border-color: rgba(251,146,60,.55); background: rgba(124,45,18,.27); }
  .tv-item[data-rank="1"] .tv-item-value { color: #fde047; font-size: clamp(54px, 7vw, 92px); }
  .tv-item[data-rank="2"] .tv-item-value { color: #e2e8f0; font-size: clamp(45px, 5.6vw, 76px); }
  .tv-item[data-rank="3"] .tv-item-value { color: #fdba74; font-size: clamp(39px, 4.8vw, 64px); }
  .tv-item[data-rank]:not([data-rank="1"]):not([data-rank="2"]):not([data-rank="3"]) .tv-item-value {
    color: #9aa8bc;
    font-size: clamp(22px, 2.7vw, 36px);
  }
  .tv-item[data-difference="best"] {
    border-color: rgba(250,204,21,.62);
    background: rgba(113,63,18,.25);
  }
  .tv-item[data-difference="best"] .tv-item-value { color: #fde047; }
  .tv-item[data-difference="behind"] .tv-item-value { color: #a7b4c8; }
  .tv-rank-note {
    margin-top: 12px;
    border-radius: 10px;
    padding: 9px 12px;
    background: rgba(245,158,11,.14);
    color: #fcd34d;
    font-size: 12px;
    font-weight: 700;
  }
  .tv-helper {
    position: fixed;
    overflow: hidden;
    color: rgba(184,199,220,.52);
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
    top: 76px;
    right: 24px;
    width: min(300px, calc(100vw - 32px));
    border: 1px solid rgba(103,232,249,.3);
    border-radius: 17px;
    padding: 15px;
    background: linear-gradient(145deg, rgba(17,27,48,.99), rgba(6,13,27,.995));
    box-shadow: 0 24px 70px rgba(0,0,0,.55);
    opacity: 0;
    pointer-events: none;
    transform: translateY(-7px) scale(.98);
    transition: opacity 120ms ease, transform 160ms cubic-bezier(.2,.8,.2,1);
  }
  .tv-help[data-visible="true"] {
    opacity: 1;
    pointer-events: auto;
    transform: none;
  }
  .tv-help-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    color: #67e8f9;
    font-size: 11px;
    font-weight: 850;
    letter-spacing: .13em;
  }
  .tv-help-close {
    all: unset;
    display: grid;
    width: 26px;
    height: 26px;
    place-items: center;
    border-radius: 7px;
    color: #94a3b8;
    cursor: pointer;
    font: 20px/1 sans-serif;
  }
  .tv-help-close:hover,
  .tv-help-close:focus-visible { background: rgba(148,163,184,.12); color: #fff; }
  .tv-help-list { display: grid; grid-template-columns: 1fr 1fr; gap: 7px 12px; }
  .tv-help-row { display: grid; grid-template-columns: 38px 1fr; align-items: center; gap: 7px; }
  .tv-help-row kbd {
    display: grid;
    min-width: 29px;
    height: 25px;
    place-items: center;
    border: 1px solid rgba(148,163,184,.28);
    border-radius: 6px;
    background: rgba(15,23,42,.8);
    color: #e2e8f0;
    font: 750 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .tv-help-row span { color: #a7b4c8; font-size: 11px; }
  .tv-help-quote {
    margin: 12px 0 0;
    border-top: 1px solid rgba(148,163,184,.14);
    padding-top: 10px;
    color: #7dd3fc;
    font-size: 11px;
    line-height: 1.4;
  }
  .tv-toast {
    position: fixed;
    top: 22px;
    left: 50%;
    border: 1px solid rgba(255,255,255,.17);
    border-radius: 999px;
    padding: 10px 16px;
    background: rgba(5,12,25,.94);
    box-shadow: 0 12px 40px rgba(0,0,0,.35);
    color: #eaf2ff;
    font-size: 12px;
    font-weight: 850;
    letter-spacing: .1em;
    opacity: 0;
    transform: translate(-50%, -8px);
    transition: opacity 150ms ease, transform 150ms ease;
  }
  .tv-toast[data-visible="true"] { opacity: 1; transform: translate(-50%, 0); }
  @media (prefers-reduced-motion: reduce) {
    .tv-dim, .tv-source, .tv-connector, .tv-panel, .tv-helper, .tv-toast { transition-duration: 1ms !important; }
  }
`;
