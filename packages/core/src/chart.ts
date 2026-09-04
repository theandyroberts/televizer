import { normalizedText } from "./rect";

const EXPLICIT_CHART_SELECTOR =
  '[data-televizer-type="chart"],[data-televizer-chart]';
const VEGA_CHART_SELECTOR =
  ".vega-embed,.vega-view,[role='graphics-document'][aria-label*='vega' i]";
const CHART_RENDERER_SELECTOR = [
  "canvas",
  "svg.marks",
  "svg.recharts-surface",
  "svg[class*='highcharts' i]",
  "svg[class*='plotly' i]",
  "[class*='echarts' i] canvas",
  "[role='img'][aria-label*='chart' i]",
  "[role='img'][aria-label*='graph' i]",
].join(",");

function hasUsefulSize(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width >= 240 && rect.height >= 120;
}

function chartTextLength(element: HTMLElement): number {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("style,script,noscript,template").forEach((node) => {
    node.remove();
  });
  return normalizedText(clone).length;
}

function closestRenderer(origin: Element): Element | null {
  const direct = origin.closest("canvas,svg,[role='img']");
  if (direct && direct.matches(CHART_RENDERER_SELECTOR) && hasUsefulSize(direct)) {
    return direct;
  }
  if (direct?.matches("svg") && hasUsefulSize(direct)) {
    const identity = `${direct.getAttribute("class") ?? ""} ${
      direct.getAttribute("aria-label") ?? ""
    }`;
    if (/chart|graph|plot|recharts|highcharts|series/i.test(identity)) return direct;
  }
  return null;
}

function rendererCount(element: HTMLElement): number {
  return Array.from(element.querySelectorAll(CHART_RENDERER_SELECTOR)).filter(
    hasUsefulSize,
  ).length;
}

function rendererChartRoot(renderer: Element): HTMLElement | null {
  let current =
    renderer instanceof HTMLElement ? renderer : renderer.parentElement;
  if (!current) return null;
  let best = current;
  for (let depth = 0; current && depth < 8; depth += 1) {
    if (current.matches(EXPLICIT_CHART_SELECTOR)) return current;
    if (current.matches("body,main,article,section")) break;
    const rect = current.getBoundingClientRect();
    const textLength = chartTextLength(current);
    if (
      rect.width >= 240 &&
      rect.height >= 120 &&
      textLength <= 2400 &&
      rendererCount(current) === 1
    ) {
      best = current;
    }
    current = current.parentElement;
  }
  return best;
}

function looksLikeHtmlBarChart(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width < 280 || rect.height < 150) return false;
  const directChildren = Array.from(element.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  );
  if (directChildren.length < 5 || directChildren.length > 40) return false;
  const rows = directChildren.filter((child) => {
    const style = child.ownerDocument.defaultView?.getComputedStyle(child);
    if (style?.display !== "flex" || child.children.length < 2) return false;
    return /\d(?:[.,]\d)?/.test(normalizedText(child));
  });
  if (rows.length < 3) return false;
  const numericValues = normalizedText(element).match(/\d+(?:\.\d+)?/g);
  return (numericValues?.length ?? 0) >= rows.length;
}

function htmlBarChartRoot(origin: Element): HTMLElement | null {
  let current: Element | null = origin;
  let best: HTMLElement | null = null;
  for (let depth = 0; current && depth < 8; depth += 1) {
    if (current instanceof HTMLElement && looksLikeHtmlBarChart(current)) {
      best = current;
    }
    if (current.matches("body,main,article,section")) break;
    current = current.parentElement;
  }
  return best;
}

function nearbyVegaChartRoot(origin: Element): HTMLElement | null {
  let current: Element | null = origin;
  for (let depth = 0; current && depth < 9; depth += 1) {
    if (current instanceof HTMLElement) {
      const embeds = Array.from(
        current.querySelectorAll<HTMLElement>(VEGA_CHART_SELECTOR),
      ).filter(hasUsefulSize);
      const embed = embeds.length === 1 ? embeds[0] : null;
      if (embed) {
        const renderer = embed.querySelector("svg.marks,canvas,svg");
        return renderer ? rendererChartRoot(renderer) : embed;
      }
    }
    if (current.matches("body,main,article,section")) break;
    current = current.parentElement;
  }
  return null;
}

export function resolveChartRoot(origin: Element): HTMLElement | null {
  const explicit = origin.closest(EXPLICIT_CHART_SELECTOR);
  if (explicit instanceof HTMLElement) return explicit;
  if (explicit) return explicit.parentElement;
  const vega = origin.closest(VEGA_CHART_SELECTOR);
  if (vega instanceof HTMLElement && hasUsefulSize(vega)) {
    const renderer = vega.querySelector("svg.marks,canvas,svg");
    return renderer ? rendererChartRoot(renderer) : vega;
  }
  const nearbyVega = nearbyVegaChartRoot(origin);
  if (nearbyVega) return nearbyVega;
  const renderer = closestRenderer(origin);
  if (renderer) return rendererChartRoot(renderer);
  return htmlBarChartRoot(origin);
}

export function resolveForcedChartRoot(origin: Element): HTMLElement | null {
  const detected = resolveChartRoot(origin);
  if (detected) return detected;

  const containingRenderer = origin.closest("canvas,svg,[role='img']");
  const descendantRenderers = Array.from(
    origin.querySelectorAll("canvas,svg,[role='img']"),
  );
  const renderer = [containingRenderer, ...descendantRenderers].find(
    (candidate): candidate is Element =>
      candidate instanceof Element && hasUsefulSize(candidate),
  );
  if (renderer) return rendererChartRoot(renderer);

  let current: Element | null = origin;
  for (let depth = 0; current && depth < 7; depth += 1) {
    if (
      current instanceof HTMLElement &&
      !current.matches("html,body,main,article,section") &&
      hasUsefulSize(current)
    ) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}
