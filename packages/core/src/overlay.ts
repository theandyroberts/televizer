import { compareItemsToBest, rankItems } from "./rank";
import { overlayStyles } from "./overlay-styles";
import type {
  PresentationItem,
  PresentationModel,
  TelevizerState,
  TelevizerTransform,
} from "./types";

const SVG_NS = "http://www.w3.org/2000/svg";

interface PresentationOverlayActions {
  onCloseHelp: () => void;
}

function node<K extends keyof HTMLElementTagNameMap>(
  document: Document,
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  if (text != null) element.textContent = text;
  return element;
}

export class PresentationOverlay {
  private readonly host: HTMLElement;
  private readonly stage: HTMLElement;
  private readonly source: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly line: SVGLineElement;
  private readonly intentIndicator: HTMLElement;
  private readonly helper: HTMLElement;
  private readonly help: HTMLElement;
  private readonly toast: HTMLElement;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private connectorFrame: number | null = null;
  private restoreMediaPlayback: (() => void) | null = null;

  constructor(
    private readonly document: Document,
    private readonly actions: PresentationOverlayActions,
  ) {
    this.host = document.createElement("televizer-overlay");
    this.host.dataset.televizerIgnore = "";
    this.host.style.pointerEvents = "none";
    const shadow = this.host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = overlayStyles;
    shadow.append(style);

    this.stage = node(document, "div", "tv-stage");
    const dim = node(document, "div", "tv-dim");
    this.source = node(document, "div", "tv-source");
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.classList.add("tv-connector");
    this.line = document.createElementNS(SVG_NS, "line");
    svg.append(this.line);
    this.intentIndicator = node(document, "div", "tv-intent");
    this.intentIndicator.setAttribute("aria-hidden", "true");
    this.panel = node(document, "section", "tv-panel");
    this.panel.setAttribute("role", "status");
    this.panel.setAttribute("aria-live", "polite");
    this.helper = this.createHelper();
    this.help = this.createHelp();
    this.toast = node(document, "div", "tv-toast");
    this.stage.append(
      dim,
      svg,
      this.source,
      this.intentIndicator,
      this.panel,
      this.helper,
      this.help,
      this.toast,
    );
    shadow.append(this.stage);
  }

  mount(): void {
    if (!this.host.isConnected) this.document.documentElement.append(this.host);
  }

  destroy(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.finishMediaPlayback();
    this.stopConnectorTracking();
    this.host.remove();
  }

  show(model: PresentationModel, state: TelevizerState): void {
    this.mount();
    this.finishMediaPlayback();
    this.panel.replaceChildren();
    this.panel.dataset.orientation = model.orientation;
    this.panel.dataset.transform = state.transform;
    this.panel.dataset.kind = model.kind;
    this.panel.removeAttribute("aria-label");
    this.renderKicker(state, model);
    if (model.kind === "element") this.renderElement(model);
    else if (model.kind === "media") this.renderMedia(model);
    else this.renderCollection(model, state.transform);

    this.placeSource(model.sourceRect);
    this.placePanel(model);
    this.placeHelper();
    this.stage.dataset.visible = "true";
    this.startConnectorTracking();
  }

  hide(): void {
    this.finishMediaPlayback();
    this.stage.dataset.visible = "false";
    this.setHelperVisible(false);
    this.hideIntent();
    this.stopConnectorTracking();
  }

  showIntent(x: number, y: number, delay: number): void {
    const dots = Array.from({ length: 5 }, (_, index) => {
      const dot = node(this.document, "i", "");
      dot.style.setProperty(
        "--tv-dot-delay",
        `${Math.max(1, Math.round((delay * (5 - index)) / 5))}ms`,
      );
      return dot;
    });
    this.intentIndicator.replaceChildren(...dots);
    this.moveIntent(x, y);
    this.intentIndicator.dataset.visible = "true";
  }

  moveIntent(x: number, y: number): void {
    const viewportWidth = this.document.defaultView?.innerWidth ?? 1280;
    const viewportHeight = this.document.defaultView?.innerHeight ?? 720;
    const left = Math.max(8, Math.min(x - 11, viewportWidth - 31));
    const top = y + 15 > viewportHeight - 10 ? y - 18 : y + 15;
    Object.assign(this.intentIndicator.style, {
      left: `${left}px`,
      top: `${Math.max(8, top)}px`,
    });
  }

  hideIntent(): void {
    this.intentIndicator.dataset.visible = "false";
  }

  showHelp(): void {
    this.help.dataset.visible = "true";
  }

  hideHelp(): void {
    this.help.dataset.visible = "false";
  }

  isHelpVisible(): boolean {
    return this.help.dataset.visible === "true";
  }

  setHelperVisible(visible: boolean): void {
    this.helper.dataset.visible = String(visible);
    if (visible) {
      this.placeHelper();
      this.startConnectorTracking();
    }
  }

  ownsEvent(event: Event): boolean {
    return event.composedPath().includes(this.host);
  }

  flash(message: string): void {
    this.mount();
    this.toast.textContent = message;
    this.toast.dataset.visible = "true";
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast.dataset.visible = "false";
    }, 1050);
  }

  private createHelp(): HTMLElement {
    const help = node(this.document, "section", "tv-help");
    help.setAttribute("role", "dialog");
    help.setAttribute("aria-label", "Televizer keyboard help");
    const header = node(this.document, "header", "tv-help-header");
    header.append(node(this.document, "strong", "", "TELEVIZER KEYS"));
    const close = node(this.document, "button", "tv-help-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "Close help");
    close.addEventListener("click", this.actions.onCloseHelp);
    header.append(close);
    const commands = [
      ["⌥ T", "Start / stop"],
      ["E", "Element"],
      ["R", "Row"],
      ["C", "Column"],
      ["1", "Ordinal ranks"],
      ["5", "Percent from best"],
      ["−", "Value from best"],
      ["H", "On-air hints"],
      ["?", "Help"],
    ];
    const list = node(this.document, "div", "tv-help-list");
    commands.forEach(([key, label]) => {
      const row = node(this.document, "div", "tv-help-row");
      row.append(
        node(this.document, "kbd", "", key),
        node(this.document, "span", "", label),
      );
      list.append(row);
    });
    const quote = node(
      this.document,
      "p",
      "tv-help-quote",
      "Select text, then pause over it to lift a quote.",
    );
    help.append(header, list, quote);
    return help;
  }

  private createHelper(): HTMLElement {
    const helper = node(this.document, "aside", "tv-helper");
    helper.setAttribute("role", "note");
    helper.textContent = "H hide  ·  E element  ·  R row  ·  C column  ·  1 ranks  ·  5 pct  ·  − gap";
    return helper;
  }

  private renderKicker(state: TelevizerState, model: PresentationModel): void {
    const kicker = node(this.document, "div", "tv-kicker");
    kicker.append(node(this.document, "span", "tv-brand", "TELEVIZER"));
    const controls = node(this.document, "div", "tv-kicker-controls");
    const transformLabels: Record<TelevizerTransform, string> = {
      values: "",
      rank: " · ordinal",
      difference: " · gap",
      percent: " · pct",
    };
    const scopeLabel =
      model.kind === "media"
        ? `${model.mediaType} · zoom`
        : `${state.scope}${transformLabels[state.transform]}`;
    controls.append(
      node(
        this.document,
        "span",
        "tv-scope",
        scopeLabel,
      ),
    );
    kicker.append(controls);
    this.panel.append(kicker);
  }

  private renderElement(model: Extract<PresentationModel, { kind: "element" }>): void {
    this.panel.append(
      node(this.document, "p", "tv-element-title", model.title),
    );
    const value = node(this.document, "p", "tv-element-value", model.value);
    value.dataset.long = String(model.value.length > 48);
    this.panel.append(value);
    if (model.context) {
      this.panel.append(node(this.document, "p", "tv-context", model.context));
    }
  }

  private renderMedia(model: Extract<PresentationModel, { kind: "media" }>): void {
    this.panel.setAttribute("aria-label", model.title);
    this.panel.append(node(this.document, "h2", "tv-media-title", model.title));
    const frame = node(this.document, "div", "tv-media-frame");
    frame.dataset.mediaType = model.mediaType;

    if (model.mediaType === "image") {
      const image = node(this.document, "img", "tv-media-content");
      image.src = model.src;
      image.alt = model.alt || "";
      image.decoding = "async";
      frame.append(image);
    } else if (model.mediaType === "video") {
      const video = node(this.document, "video", "tv-media-content");
      const sourceVideo = model.sourceElements[0];
      video.src = model.src;
      video.controls = true;
      video.playsInline = true;
      video.preload = "metadata";
      if (model.poster) video.poster = model.poster;
      const playback = model.playback;
      if (playback) {
        video.muted = playback.muted;
        video.loop = playback.loop;
        video.playbackRate = playback.playbackRate;
        video.volume = playback.volume;
        if (sourceVideo instanceof HTMLVideoElement && !sourceVideo.paused) {
          sourceVideo.pause();
        }
        let mirroredPlaybackStarted = false;
        const syncPlayback = (): void => {
          if (Number.isFinite(playback.currentTime)) {
            video.currentTime = playback.currentTime;
          }
          if (!playback.paused) {
            void video
              .play()
              .then(() => {
                mirroredPlaybackStarted = true;
              })
              .catch(() => undefined);
          }
        };
        if (video.readyState >= 1) syncPlayback();
        else video.addEventListener("loadedmetadata", syncPlayback, { once: true });
        if (sourceVideo instanceof HTMLVideoElement) {
          this.restoreMediaPlayback = () => {
            if (Number.isFinite(video.currentTime)) {
              sourceVideo.currentTime = video.currentTime;
            }
            sourceVideo.muted = video.muted;
            sourceVideo.loop = video.loop;
            sourceVideo.playbackRate = video.playbackRate;
            sourceVideo.volume = video.volume;
            const shouldResume =
              !video.paused || (!playback.paused && !mirroredPlaybackStarted);
            if (shouldResume) void sourceVideo.play().catch(() => undefined);
          };
        }
      }
      frame.append(video);
    } else {
      const embed = node(this.document, "iframe", "tv-media-content");
      embed.title = model.title;
      embed.loading = "eager";
      if (model.srcdoc) embed.srcdoc = model.srcdoc;
      else embed.src = model.src;
      if (model.embed) {
        embed.allowFullscreen = model.embed.allowFullscreen;
        if (model.embed.allow) embed.allow = model.embed.allow;
        if (model.embed.sandbox !== null) {
          embed.setAttribute("sandbox", model.embed.sandbox);
        }
        if (model.embed.referrerPolicy) {
          embed.referrerPolicy = model.embed.referrerPolicy as ReferrerPolicy;
        }
      }
      frame.append(embed);
    }

    this.panel.append(frame);
    if (model.caption) {
      this.panel.append(node(this.document, "p", "tv-media-caption", model.caption));
    }
  }

  private finishMediaPlayback(): void {
    this.restoreMediaPlayback?.();
    this.restoreMediaPlayback = null;
  }

  private renderCollection(
    model: Extract<PresentationModel, { kind: "collection" }>,
    transform: TelevizerTransform,
  ): void {
    const items =
      transform === "rank"
        ? model.rankStrategy === "per-column"
          ? model.items
          : rankItems(model.items, model.rankDirection)
        : transform === "difference" || transform === "percent"
          ? model.rankStrategy === "per-column"
            ? model.items
            : compareItemsToBest(model.items, model.rankDirection)
          : model.items;
    const heading = node(this.document, "div", "tv-collection-heading");
    const title = node(this.document, "h2", "tv-collection-title", model.title);
    title.dataset.fit =
      model.title.length > 22
        ? "tight"
        : model.title.length > 14
          ? "compact"
          : "normal";
    heading.append(title);
    if (transform === "difference" && model.rankStrategy === "within-collection") {
      const best = items.find(
        (item) => item.numericValue != null && item.differenceFromBest === 0,
      );
      if (best) {
        heading.append(
          node(
            this.document,
            "span",
            "tv-comparison-baseline",
            `vs ${compactPresentationValue(best.value)}`,
          ),
        );
      }
    }
    this.panel.append(heading);
    const list = node(this.document, "div", "tv-items");
    list.dataset.orientation = model.orientation;
    items.forEach((item) => {
      const entry = node(this.document, "div", "tv-item");
      if (transform === "rank" && item.rank != null) {
        entry.dataset.rank = String(item.rank);
      }
      const difference = item.differenceFromBest;
      if (
        (transform === "difference" || transform === "percent") &&
        difference != null
      ) {
        entry.dataset.difference = difference === 0 ? "best" : "behind";
      }
      entry.append(
        node(this.document, "span", "tv-item-label", item.label),
        node(
          this.document,
          "strong",
          "tv-item-value",
          presentationValue(item, transform),
        ),
      );
      list.append(entry);
    });
    this.panel.append(list);
    const missingComparison = items.some((item) => {
      if (item.numericValue == null) return false;
      if (transform === "rank") return item.rank == null;
      if (transform === "difference") return item.differenceFromBest == null;
      if (transform === "percent") return item.percentDifferenceFromBest == null;
      return false;
    });
    if (transform !== "values" && missingComparison) {
      this.panel.append(
        node(
          this.document,
          "div",
          "tv-rank-note",
          transform === "percent"
            ? "Percent difference needs a known direction and a non-zero best value."
            : model.rankStrategy === "per-column"
              ? "Direction is unclear for one or more columns."
              : "Direction is unclear. Add data-televizer-rank=\"higher\" or \"lower\".",
        ),
      );
    }
  }

  private placeSource(rect: DOMRect): void {
    const padding = 5;
    Object.assign(this.source.style, {
      left: `${Math.max(3, rect.left - padding)}px`,
      top: `${Math.max(3, rect.top - padding)}px`,
      width: `${Math.max(12, rect.width + padding * 2)}px`,
      height: `${Math.max(12, rect.height + padding * 2)}px`,
    });
  }

  private placePanel(model: PresentationModel): void {
    const view = this.document.defaultView;
    const viewportWidth = view?.innerWidth ?? 1280;
    const viewportHeight = view?.innerHeight ?? 720;
    const margin = 28;
    const isMedia = model.kind === "media";
    const estimatedWidth =
      isMedia
        ? Math.min(960, viewportWidth - margin * 2)
        : model.orientation === "horizontal"
        ? Math.min(1120, viewportWidth - margin * 2)
        : Math.min(520, viewportWidth - margin * 2);
    const estimatedHeight =
      isMedia
        ? Math.min(760, viewportHeight * 0.86)
        : model.orientation === "horizontal"
          ? 260
          : Math.min(620, viewportHeight * 0.72);
    const source = model.sourceRect;

    let left = source.right + 26;
    let top = Math.max(margin, source.top + source.height / 2 - estimatedHeight / 2);
    if (isMedia) {
      left = Math.max(margin, (viewportWidth - estimatedWidth) / 2);
      top = Math.max(margin, (viewportHeight - estimatedHeight) / 2);
    } else if (model.orientation === "horizontal") {
      left = Math.max(margin, (viewportWidth - estimatedWidth) / 2);
      top = source.bottom + 22;
      if (top + estimatedHeight > viewportHeight - margin) {
        top = Math.max(margin, source.top - estimatedHeight - 22);
      }
    } else if (left + estimatedWidth > viewportWidth - margin) {
      left = source.left - estimatedWidth - 26;
    }
    if (left < margin) left = Math.max(margin, (viewportWidth - estimatedWidth) / 2);
    if (top + estimatedHeight > viewportHeight - margin) {
      top = Math.max(margin, viewportHeight - estimatedHeight - margin);
    }

    this.panel.style.left = `${left}px`;
    this.panel.style.top = `${top}px`;
    const sourceCenterX = source.left + source.width / 2;
    const sourceCenterY = source.top + source.height / 2;
    this.panel.style.setProperty("--tv-origin-x", `${sourceCenterX - left}px`);
    this.panel.style.setProperty("--tv-origin-y", `${sourceCenterY - top}px`);
  }

  private placeHelper(): void {
    const view = this.document.defaultView;
    if (!view) return;
    const left = Number.parseFloat(this.panel.style.left) || 0;
    let top = Number.parseFloat(this.panel.style.top) || 0;
    const panelWidth = this.panel.offsetWidth;
    const panelHeight = this.panel.offsetHeight;
    const helperHeight = 18;
    if (
      this.helper.dataset.visible === "true" &&
      top + panelHeight + helperHeight + 10 > view.innerHeight
    ) {
      top = Math.max(8, view.innerHeight - panelHeight - helperHeight - 10);
      this.panel.style.top = `${top}px`;
    }
    Object.assign(this.helper.style, {
      left: `${left}px`,
      top: `${top + panelHeight + 6}px`,
      width: `${panelWidth}px`,
    });
  }

  private placeConnector(): void {
    const sourceRect = this.source.getBoundingClientRect();
    const panelRect = this.panel.getBoundingClientRect();
    const sourceCenter = {
      x: sourceRect.left + sourceRect.width / 2,
      y: sourceRect.top + sourceRect.height / 2,
    };
    const panelCenter = {
      x: panelRect.left + panelRect.width / 2,
      y: panelRect.top + panelRect.height / 2,
    };
    const sourcePoint = pointOnRectEdge(sourceRect, panelCenter);
    const panelPoint = pointOnRectEdge(panelRect, sourceCenter);
    this.line.setAttribute("x1", String(sourcePoint.x));
    this.line.setAttribute("y1", String(sourcePoint.y));
    this.line.setAttribute("x2", String(panelPoint.x));
    this.line.setAttribute("y2", String(panelPoint.y));
  }

  private startConnectorTracking(): void {
    const view = this.document.defaultView;
    if (!view) return;
    this.stopConnectorTracking();
    this.placeConnector();
    const started = view.performance.now();
    const track = (time: number): void => {
      this.placeConnector();
      if (time - started < 360 && this.stage.dataset.visible === "true") {
        this.connectorFrame = view.requestAnimationFrame(track);
      } else {
        this.connectorFrame = null;
      }
    };
    this.connectorFrame = view.requestAnimationFrame(track);
  }

  private stopConnectorTracking(): void {
    if (this.connectorFrame == null) return;
    this.document.defaultView?.cancelAnimationFrame(this.connectorFrame);
    this.connectorFrame = null;
  }
}

function presentationValue(
  item: PresentationItem,
  transform: TelevizerTransform,
): string {
  if (transform === "rank") {
    return item.rank == null ? item.value : String(item.rank);
  }
  if (transform === "percent") {
    return item.percentDifferenceFromBest == null
      ? "—"
      : formatNumber(item.percentDifferenceFromBest, "%", "");
  }
  if (transform === "difference") {
    if (item.differenceFromBest == null) return "—";
    if (item.differenceFromBest === 0) return "--";
    const { prefix, suffix } = numericParts(item.value);
    return formatNumber(item.differenceFromBest, suffix, prefix);
  }
  return item.value;
}

function formatNumber(value: number, suffix: string, prefix: string): string {
  const compact = compactBytes(Math.abs(value), suffix);
  const absolute = compact.value;
  const decimals = Number.isInteger(absolute) ? 0 : absolute < 10 ? 1 : 0;
  const number = absolute.toFixed(decimals);
  const sign = value < 0 ? "−" : "";
  const renderedSuffix = compact.suffix;
  const suffixSeparator = renderedSuffix && !isTightUnit(renderedSuffix) ? " " : "";
  return `${sign}${prefix}${number}${suffixSeparator}${renderedSuffix}`;
}

function compactPresentationValue(value: string): string {
  const numeric = value.match(/[−–—-]?\d[\d,]*(?:\.\d+)?/);
  if (!numeric) return value;
  const parsed = Number(numeric[0].replaceAll(",", "").replace(/[−–—]/g, "-"));
  if (!Number.isFinite(parsed)) return value;
  const { prefix, suffix } = numericParts(value);
  return formatNumber(parsed, suffix, prefix);
}

function numericParts(value: string): { prefix: string; suffix: string } {
  const numeric = value.match(/[−–—-]?\d[\d,]*(?:\.\d+)?/);
  return {
    prefix: numeric ? value.slice(0, numeric.index).trim() : "",
    suffix: numeric
      ? value.slice((numeric.index ?? 0) + numeric[0].length).trim()
      : "",
  };
}

function compactBytes(
  value: number,
  suffix: string,
): { value: number; suffix: string } {
  const normalized = suffix.replaceAll(" ", "");
  const match = normalized.match(/^([kmgtpe])?b$/i);
  if (!match) return { value, suffix };

  const units = ["B", "KB", "MB", "GB", "TB", "PB", "EB"];
  const unitIndex = match[1]
    ? ["k", "m", "g", "t", "p", "e"].indexOf(match[1].toLowerCase()) + 1
    : 0;
  let compactValue = value;
  let compactIndex = unitIndex;
  while (compactValue >= 1000 && compactIndex < units.length - 1) {
    compactValue /= 1000;
    compactIndex += 1;
  }
  return { value: compactValue, suffix: units[compactIndex] ?? suffix };
}

function isTightUnit(suffix: string): boolean {
  return /^(?:%|ms|s|b|kb|mb|gb|tb|pb|eb)$/i.test(suffix);
}

function pointOnRectEdge(
  rect: DOMRect,
  toward: { x: number; y: number },
): { x: number; y: number } {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const deltaX = toward.x - centerX;
  const deltaY = toward.y - centerY;
  if (deltaX === 0 && deltaY === 0) return { x: centerX, y: centerY };
  const scaleX = deltaX === 0 ? Number.POSITIVE_INFINITY : rect.width / 2 / Math.abs(deltaX);
  const scaleY = deltaY === 0 ? Number.POSITIVE_INFINITY : rect.height / 2 / Math.abs(deltaY);
  const scale = Math.min(scaleX, scaleY);
  return {
    x: centerX + deltaX * scale,
    y: centerY + deltaY * scale,
  };
}
