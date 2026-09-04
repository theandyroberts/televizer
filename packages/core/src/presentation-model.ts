import { resolveChartRoot } from "./chart";
import { parseNumericValue } from "./rank";
import { normalizedText, unionRects } from "./rect";
import { resolveTableContext } from "./table-context";
import type {
  ChartPresentation,
  CollectionPresentation,
  ElementPresentation,
  MediaPresentation,
  PresentationModel,
  RankDirection,
  TelevizerScope,
} from "./types";

export function buildChartPresentation(
  element: HTMLElement,
  pointer?: { x: number; y: number },
): ChartPresentation {
  const root = element;
  const rect = root.getBoundingClientRect();
  const labelledBy = root.getAttribute("aria-labelledby");
  const externalLabel = labelledBy
    ? root.ownerDocument.getElementById(labelledBy)
    : null;
  const heading = root.querySelector("h1,h2,h3,h4,h5,h6");
  const shortLead = Array.from(root.children).find((child) => {
    const text = normalizedText(child);
    return text.length > 0 && text.length <= 90;
  });
  const title =
    root.dataset.televizerLabel ||
    normalizedText(externalLabel) ||
    normalizedText(heading) ||
    normalizedText(shortLead) ||
    root.getAttribute("aria-label") ||
    "Chart";
  const pointerX = pointer?.x ?? rect.left + rect.width / 2;
  const pointerY = pointer?.y ?? rect.top + rect.height / 2;
  return {
    kind: "chart",
    title,
    sourceElement: root,
    pointer: {
      x: Math.max(0, Math.min(rect.width, pointerX - rect.left)),
      y: Math.max(0, Math.min(rect.height, pointerY - rect.top)),
    },
    orientation: "single",
    sourceElements: [root],
    sourceRect: unionRects([root]),
  };
}

function chartModel(
  element: HTMLElement,
  pointer?: { x: number; y: number },
): ChartPresentation | null {
  const root = resolveChartRoot(element);
  if (!root || root !== element) return null;
  return buildChartPresentation(root, pointer);
}

function mediaModel(element: HTMLElement): MediaPresentation | null {
  const media = element.matches("img,video,iframe")
    ? element
    : element.querySelector<HTMLElement>("img,video,iframe");
  if (!media) return null;

  const figure = media.closest("figure");
  const figureCaption = figure?.querySelector("figcaption");
  const explicitLabel =
    media.dataset.televizerLabel || figure?.dataset.televizerLabel;
  const explicitContext =
    media.dataset.televizerContext || figure?.dataset.televizerContext;
  const caption = explicitContext || normalizedText(figureCaption) || "";

  if (media instanceof HTMLImageElement) {
    const src = media.currentSrc || media.src;
    if (!src) return null;
    return {
      kind: "media",
      mediaType: "image",
      title: explicitLabel || media.alt || media.title || "Image",
      caption,
      src,
      alt: media.alt,
      orientation: "single",
      sourceElements: [media],
      sourceRect: unionRects([media]),
    };
  }

  if (media instanceof HTMLVideoElement) {
    const src = media.currentSrc || media.src;
    if (!src) return null;
    return {
      kind: "media",
      mediaType: "video",
      title: explicitLabel || media.title || "Video",
      caption,
      src,
      poster: media.poster,
      playback: {
        currentTime: media.currentTime,
        paused: media.paused,
        muted: media.muted,
        loop: media.loop,
        playbackRate: media.playbackRate,
        volume: media.volume,
      },
      orientation: "single",
      sourceElements: [media],
      sourceRect: unionRects([media]),
    };
  }

  if (media instanceof HTMLIFrameElement) {
    const src = media.src;
    const srcdoc = media.srcdoc;
    if (!src && !srcdoc) return null;
    return {
      kind: "media",
      mediaType: "embed",
      title: explicitLabel || media.title || "Embedded media",
      caption,
      src,
      srcdoc,
      embed: {
        allow: media.getAttribute("allow") || "",
        sandbox: media.getAttribute("sandbox"),
        referrerPolicy: media.referrerPolicy,
        allowFullscreen: media.hasAttribute("allowfullscreen"),
      },
      orientation: "single",
      sourceElements: [media],
      sourceRect: unionRects([media]),
    };
  }

  return null;
}

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
  directionOverride?: Exclude<RankDirection, "unknown">,
): CollectionPresentation | null {
  const context = resolveTableContext(element, directionOverride);
  if (!context) return null;
  const row = scope === "row";
  const sourceElements = row ? context.rowElements : context.columnElements;
  return {
    kind: "collection",
    scope,
    title: row ? context.rowTitle : context.columnTitle,
    items: row ? context.rowItems : context.columnItems,
    rankDirection: row ? context.rowRankDirection : context.columnRankDirection,
    rankStrategy: row ? context.rowRankStrategy : "within-collection",
    orientation: row ? "horizontal" : "vertical",
    sourceElements,
    sourceRect: unionRects(sourceElements),
  };
}

export function buildPresentationModel(
  element: HTMLElement,
  scope: TelevizerScope,
  directionOverride?: Exclude<RankDirection, "unknown">,
  pointer?: { x: number; y: number },
): PresentationModel {
  const chart = chartModel(element, pointer);
  if (chart) return chart;
  const media = mediaModel(element);
  if (media) return media;
  return scope === "element"
    ? elementModel(element)
    : collectionModel(element, scope, directionOverride) ?? elementModel(element);
}
