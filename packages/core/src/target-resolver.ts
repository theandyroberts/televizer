import { CELL_SELECTOR } from "./table-context";
import { normalizedText } from "./rect";

const EXCLUDED = new Set(["HTML", "BODY", "SCRIPT", "STYLE", "NOSCRIPT"]);
const SEMANTIC_SELECTOR = [
  "[data-televizer-target]",
  "[data-televizer-type]",
  CELL_SELECTOR,
  "article",
  "blockquote",
  "figure",
  "img",
  "video",
  "iframe",
  "button",
  "a",
  "h1",
  "h2",
  "h3",
  "h4",
  "p",
  "pre",
  "code",
  "li",
].join(",");

export class TargetResolver {
  private readonly explicitSelector: string;

  constructor(
    private readonly maxTextLength = 420,
    targetSelectors: string[] = [],
  ) {
    this.explicitSelector = [
      "[data-televizer-target]",
      "[data-televizer-type]",
      ...targetSelectors,
    ].join(",");
  }

  resolve(origin: EventTarget | null): HTMLElement | null {
    if (!(origin instanceof Element)) return null;

    const cell = origin.closest<HTMLElement>(CELL_SELECTOR);
    if (cell) return cell;

    const explicit = origin.closest<HTMLElement>(this.explicitSelector);
    if (explicit) return explicit;

    const candidates: HTMLElement[] = [];
    let current: Element | null = origin;
    for (let depth = 0; current && depth < 6; depth += 1) {
      if (current instanceof HTMLElement && !EXCLUDED.has(current.tagName)) {
        candidates.push(current);
      }
      current = current.parentElement;
    }

    const scored = candidates
      .map((candidate, depth) => ({
        candidate,
        score: this.score(candidate, depth),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);
    return scored[0]?.candidate ?? null;
  }

  private score(element: HTMLElement, depth: number): number {
    if (element.matches("input,textarea,select,[contenteditable='true']")) return -1;
    if (element.closest("[data-televizer-ignore]")) return -1;

    const rect = element.getBoundingClientRect();
    const text = normalizedText(element);
    if (!text && !element.matches("img,svg,canvas,video,iframe")) return -1;
    if (text.length > this.maxTextLength) return -1;
    if (rect.width < 8 || rect.height < 8) return -1;

    let score = 18 - depth * 2;
    if (element.matches(SEMANTIC_SELECTOR)) score += 24;
    if (element.matches("article,blockquote,figure")) score += 22;
    if (/\b(kpi|metric|stat|card|tile|result)\b/i.test(element.className)) score += 35;
    if (element.children.length > 0 && element.children.length <= 5) score += 8;
    if (rect.width > window.innerWidth * 0.72 || rect.height > window.innerHeight * 0.65) {
      score -= 45;
    }
    if (text.length > 0 && text.length <= 120) score += 10;
    return score;
  }
}
