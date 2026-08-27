export type TelevizerScope = "element" | "row" | "column";
export type TelevizerTransform = "values" | "rank" | "difference" | "percent";
export type RankDirection = "higher" | "lower" | "unknown";
export type PresentationOrientation = "single" | "horizontal" | "vertical";
export type PresentationMediaType = "image" | "video" | "embed";

export interface TelevizerState {
  active: boolean;
  scope: TelevizerScope;
  transform: TelevizerTransform;
}

export interface TelevizerOptions {
  acquireDelay?: number;
  traverseDelay?: number;
  releaseDelay?: number;
  maxElementTextLength?: number;
  /** Additional site-specific selectors that should be treated as explicit targets. */
  targetSelectors?: string[];
  document?: Document;
}

export interface PresentationItem {
  label: string;
  value: string;
  numericValue: number | null;
  rank?: number;
  differenceFromBest?: number;
  percentDifferenceFromBest?: number;
  sourceElement: HTMLElement;
}

interface PresentationBase {
  sourceElements: HTMLElement[];
  sourceRect: DOMRect;
  orientation: PresentationOrientation;
}

export interface ElementPresentation extends PresentationBase {
  kind: "element";
  title: string;
  value: string;
  context: string;
}

export interface MediaPresentation extends PresentationBase {
  kind: "media";
  mediaType: PresentationMediaType;
  title: string;
  caption: string;
  src: string;
  srcdoc?: string;
  alt?: string;
  poster?: string;
  playback?: {
    currentTime: number;
    paused: boolean;
    muted: boolean;
    loop: boolean;
    playbackRate: number;
    volume: number;
  };
  embed?: {
    allow: string;
    sandbox: string | null;
    referrerPolicy: string;
    allowFullscreen: boolean;
  };
}

export interface CollectionPresentation extends PresentationBase {
  kind: "collection";
  scope: Exclude<TelevizerScope, "element">;
  title: string;
  items: PresentationItem[];
  rankDirection: RankDirection;
  rankStrategy: "within-collection" | "per-column";
}

export type PresentationModel =
  | ElementPresentation
  | MediaPresentation
  | CollectionPresentation;

export interface TableContext {
  table: HTMLElement;
  cell: HTMLElement;
  rowElements: HTMLElement[];
  columnElements: HTMLElement[];
  rowTitle: string;
  columnTitle: string;
  rowItems: PresentationItem[];
  columnItems: PresentationItem[];
  rowRankDirection: RankDirection;
  columnRankDirection: RankDirection;
}
