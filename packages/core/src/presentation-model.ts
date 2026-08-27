import { parseNumericValue } from "./rank";
import { normalizedText, unionRects } from "./rect";
import { resolveTableContext } from "./table-context";
import type {
  CollectionPresentation,
  ElementPresentation,
  PresentationModel,
  TelevizerScope,
} from "./types";

function nearestHeading(element: HTMLElement): string {
  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    const label = element.ownerDocument.getElementById(labelledBy);
    if (label) return normalizedText(label);
  }
  const heading = element.querySelector("h1,h2,h3,h4,h5,h6");
  if (heading) return normalizedText(heading);
  return "";
}

function elementModel(element: HTMLElement): ElementPresentation {
  const table = resolveTableContext(element);
  if (table) {
    const value = element.dataset.televizerValue || normalizedText(element);
    return {
      kind: "element",
      title: table.columnTitle,
      value,
      context: table.rowTitle,
      orientation: "single",
      sourceElements: [element],
      sourceRect: unionRects([element]),
    };
  }

  const type = element.dataset.televizerType;
  const explicitLabel = element.dataset.televizerLabel;
  const explicitValue = element.dataset.televizerValue;
  const explicitContext = element.dataset.televizerContext;
  const heading = explicitLabel || nearestHeading(element);
  const valueElement = element.querySelector<HTMLElement>(
    "[data-televizer-value],strong,[class*='value'],[class*='metric']",
  );
  const fullText = normalizedText(element);
  const value =
    explicitValue ||
    valueElement?.dataset.televizerValue ||
    normalizedText(valueElement) ||
    (type === "image" ? element.getAttribute("alt") || "Image" : fullText);

  let title = heading;
  let context = explicitContext || "";
  if (!title && value !== fullText) {
    const remainder = fullText.replace(value, "").trim();
    title = remainder.split(/(?<=[.!?])\s+/)[0] || "";
  }
  if (!title) {
    title = element.matches("blockquote") ? "Quote" : "In focus";
  }
  if (!context && parseNumericValue(value) != null) {
    context = element.getAttribute("aria-label") || "";
  }

  return {
    kind: "element",
    title,
    value,
    context,
    orientation: "single",
    sourceElements: [element],
    sourceRect: unionRects([element]),
  };
}

function collectionModel(
  element: HTMLElement,
  scope: Exclude<TelevizerScope, "element">,
): CollectionPresentation | null {
  const context = resolveTableContext(element);
  if (!context) return null;
  const row = scope === "row";
  const sourceElements = row ? context.rowElements : context.columnElements;
  return {
    kind: "collection",
    scope,
    title: row ? context.rowTitle : context.columnTitle,
    items: row ? context.rowItems : context.columnItems,
    rankDirection: row ? context.rowRankDirection : context.columnRankDirection,
    rankStrategy: row ? "per-column" : "within-collection",
    orientation: row ? "horizontal" : "vertical",
    sourceElements,
    sourceRect: unionRects(sourceElements),
  };
}

export function buildPresentationModel(
  element: HTMLElement,
  scope: TelevizerScope,
): PresentationModel {
  return scope === "element"
    ? elementModel(element)
    : collectionModel(element, scope) ?? elementModel(element);
}
