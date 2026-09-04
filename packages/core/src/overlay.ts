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

interface ChartRenderState {
  source: HTMLElement;
  frame: HTMLElement;
  main: HTMLElement;
  lens: HTMLElement;
  lensSurface: HTMLElement;
  pointer: { x: number; y: number };
  sourceWidth: number;
  sourceHeight: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

function colorAlpha(color: string): number {
  if (!color || color === "transparent") return 0;
  const slashAlpha = color.match(/\/\s*([\d.]+)(%)?\s*\)$/);
  if (slashAlpha) {
    const alpha = Number.parseFloat(slashAlpha[1] ?? "0");
    return slashAlpha[2] ? alpha / 100 : alpha;
  }
  const rgbaAlpha = color.match(
    /^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\s*\)$/,
  );
  return rgbaAlpha ? Number.parseFloat(rgbaAlpha[1] ?? "0") : 1;
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
  private chartRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  private chartState: ChartRenderState | null = null;
  private connectorFrame: number | null = null;
  private restoreMediaPlayback: (() => void) | null = null;

  constructor(
    private readonly document: Document,
    private readonly actions: PresentationOverlayActions,
  ) {
    this.host = document.createElement("televizer-overlay");
    this.host.dataset.televizerIgnore = "";
    this.host.dataset.theme = "editorial";
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
    this.finishChart();
    this.stopConnectorTracking();
    this.host.remove();
  }

  show(model: PresentationModel, state: TelevizerState): void {
    this.mount();
    this.finishMediaPlayback();
    this.finishChart();
    this.panel.replaceChildren();
    this.panel.dataset.orientation = model.orientation;
    this.panel.dataset.transform = state.transform;
    this.panel.dataset.kind = model.kind;
    this.panel.removeAttribute("aria-label");
    this.renderKicker(state, model);
    if (model.kind === "element") this.renderElement(model);
    else if (model.kind === "quote") this.renderQuote(model);
    else if (model.kind === "chart") this.renderChart(model);
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
    this.finishChart();
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

  updateChartPointer(x: number, y: number, source: HTMLElement): boolean {
    const state = this.chartState;
    if (!state || state.source !== source) return false;
    const sourceRect = source.getBoundingClientRect();
    state.sourceWidth = Math.max(1, sourceRect.width);
    state.sourceHeight = Math.max(1, sourceRect.height);
    this.layoutChart();
    const frameRect = state.frame.getBoundingClientRect();
    const overSource = pointInside(x, y, sourceRect);
    const overBroadcast = pointInside(x, y, frameRect);
    if (!overSource && !overBroadcast) return false;

    if (overBroadcast) {
      state.pointer = {
        x: Math.max(
          0,
          Math.min(
            state.sourceWidth,
            (x - frameRect.left - state.offsetX) / Math.max(state.scale, 0.001),
          ),
        ),
        y: Math.max(
          0,
          Math.min(
            state.sourceHeight,
            (y - frameRect.top - state.offsetY) / Math.max(state.scale, 0.001),
          ),
        ),
      };
    } else {
      state.pointer = {
        x: Math.max(0, Math.min(sourceRect.width, x - sourceRect.left)),
        y: Math.max(0, Math.min(sourceRect.height, y - sourceRect.top)),
      };
    }

    this.dispatchChartPointer(state, sourceRect);
    this.layoutChart();
    if (!this.chartRefreshTimer) {
      this.chartRefreshTimer = setTimeout(() => {
        this.chartRefreshTimer = null;
        this.refreshChartSnapshots();
      }, 60);
    }
    return true;
  }

  private dispatchChartPointer(state: ChartRenderState, sourceRect: DOMRect): void {
    const interactive =
      (state.source.matches("canvas, svg") ? state.source : null) ??
      state.source.querySelector<HTMLElement>(
        "canvas, .recharts-wrapper, .highcharts-container, .plotly, svg",
      ) ??
      state.source;
    const MouseEventConstructor =
      this.document.defaultView?.MouseEvent ?? MouseEvent;
    interactive.dispatchEvent(
      new MouseEventConstructor("mousemove", {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: sourceRect.left + state.pointer.x,
        clientY: sourceRect.top + state.pointer.y,
      }),
    );
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
      ["L", "Lower is better"],
      ["Z", "Force chart zoom"],
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
    quote.append(
      this.document.createElement("br"),
      this.document.createTextNode(
        "On charts, gesture across the enlarged view to move the magnifier.",
      ),
    );
    help.append(header, list, quote);
    return help;
  }

  private createHelper(): HTMLElement {
    const helper = node(this.document, "aside", "tv-helper");
    helper.setAttribute("role", "note");
    helper.textContent = "H hide  ·  E element  ·  R row  ·  C column  ·  1 ranks  ·  L low wins  ·  5 pct  ·  − gap  ·  Z chart zoom";
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
        : model.kind === "chart"
          ? "chart · zoom"
        : model.kind === "quote"
          ? "quote"
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

  private renderQuote(model: Extract<PresentationModel, { kind: "quote" }>): void {
    const quote = node(this.document, "blockquote", "tv-quote");
    quote.append(node(this.document, "p", "tv-quote-text", model.quote));
    if (model.source) {
      quote.append(node(this.document, "cite", "tv-quote-source", model.source));
    }
    this.panel.append(quote);
  }

  private renderChart(model: Extract<PresentationModel, { kind: "chart" }>): void {
    this.panel.setAttribute("aria-label", `${model.title} chart zoom`);
    const frame = node(this.document, "div", "tv-chart-frame");
    const main = node(this.document, "div", "tv-chart-main");
    const lens = node(this.document, "div", "tv-chart-lens");
    lens.setAttribute("aria-hidden", "true");
    const lensSurface = node(this.document, "div", "tv-chart-lens-surface");
    frame.style.setProperty(
      "--tv-chart-background",
      this.chartBackground(model.sourceElement),
    );
    lens.append(lensSurface);
    frame.append(main, lens);
    this.panel.append(frame);

    const rect = model.sourceElement.getBoundingClientRect();
    this.chartState = {
      source: model.sourceElement,
      frame,
      main,
      lens,
      lensSurface,
      pointer: model.pointer,
      sourceWidth: Math.max(1, rect.width),
      sourceHeight: Math.max(1, rect.height),
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    };
    this.refreshChartSnapshots();
    this.document.defaultView?.requestAnimationFrame(() => this.layoutChart());
  }

  private chartBackground(source: HTMLElement): string {
    const view = this.document.defaultView;
    if (!view) return "#fff";
    let current: Element | null = source;
    let translucentFallback = "";
    while (current) {
      const color = view.getComputedStyle(current).backgroundColor;
      const alpha = colorAlpha(color);
      if (alpha >= 0.98) return color;
      if (alpha > 0 && !translucentFallback) translucentFallback = color;
      current = current.parentElement;
    }
    return translucentFallback || "#fff";
  }

  private refreshChartSnapshots(): void {
    const state = this.chartState;
    if (!state || !state.source.isConnected) return;
    state.main.replaceChildren(this.cloneChart(state.source));
    state.lensSurface.replaceChildren(this.cloneChart(state.source));
    this.layoutChart();
  }

  private cloneChart(source: HTMLElement): HTMLElement {
    const clone = source.cloneNode(true) as HTMLElement;
    const originals: Element[] = [source, ...source.querySelectorAll("*")];
    const clones: Element[] = [clone, ...clone.querySelectorAll("*")];
    const view = this.document.defaultView;
    originals.forEach((original, index) => {
      const copy = clones[index];
      if (!copy || !view) return;
      const computed = view.getComputedStyle(original);
      const style = (copy as HTMLElement | SVGElement).style;
      for (let propertyIndex = 0; propertyIndex < computed.length; propertyIndex += 1) {
        const property = computed.item(propertyIndex);
        style.setProperty(
          property,
          computed.getPropertyValue(property),
          computed.getPropertyPriority(property),
        );
      }
      style.setProperty("animation", "none", "important");
      style.setProperty("transition", "none", "important");
      copy.removeAttribute("id");

      if (original instanceof HTMLImageElement && copy instanceof HTMLImageElement) {
        copy.src = original.currentSrc || original.src;
      }
      if (original instanceof HTMLCanvasElement && copy instanceof HTMLCanvasElement) {
        copy.width = original.width;
        copy.height = original.height;
        try {
          copy.getContext("2d")?.drawImage(original, 0, 0);
        } catch {
          // A protected canvas may not permit copying; the rest of the chart remains visible.
        }
      }
    });
    Object.assign(clone.style, {
      inset: "auto",
      margin: "0",
      position: "relative",
      transform: "none",
    });
    clone.setAttribute("aria-hidden", "true");
    return clone;
  }

  private layoutChart(): void {
    const state = this.chartState;
    if (!state) return;
    const frameWidth = state.frame.clientWidth || Math.min(1400, state.sourceWidth);
    const frameHeight = state.frame.clientHeight || Math.min(760, state.sourceHeight);
    const scale = Math.min(
      frameWidth / state.sourceWidth,
      frameHeight / state.sourceHeight,
    );
    const renderedWidth = state.sourceWidth * scale;
    const renderedHeight = state.sourceHeight * scale;
    const offsetX = (frameWidth - renderedWidth) / 2;
    const offsetY = (frameHeight - renderedHeight) / 2;
    state.scale = scale;
    state.offsetX = offsetX;
    state.offsetY = offsetY;
    Object.assign(state.main.style, {
      width: `${state.sourceWidth}px`,
      height: `${state.sourceHeight}px`,
      left: `${offsetX}px`,
      top: `${offsetY}px`,
      transform: `scale(${scale})`,
    });

    const lensSize = Math.min(360, Math.max(220, frameWidth * 0.28));
    const lensAnchorY = 0.98;
    const focusX = offsetX + state.pointer.x * scale;
    const focusY = offsetY + state.pointer.y * scale;
    const lensLeft = Math.max(8, Math.min(focusX - lensSize / 2, frameWidth - lensSize - 8));
    const lensTop = Math.max(
      8,
      Math.min(focusY - lensSize * lensAnchorY, frameHeight - lensSize - 8),
    );
    Object.assign(state.lens.style, {
      width: `${lensSize}px`,
      height: `${lensSize}px`,
      left: `${lensLeft}px`,
      top: `${lensTop}px`,
    });
    const zoom = 1.85;
    Object.assign(state.lensSurface.style, {
      width: `${state.sourceWidth}px`,
      height: `${state.sourceHeight}px`,
      left: `${lensSize / 2 - state.pointer.x * scale * zoom}px`,
      top: `${lensSize * lensAnchorY - state.pointer.y * scale * zoom}px`,
      transform: `scale(${scale * zoom})`,
    });
  }

  private finishChart(): void {
    if (this.chartRefreshTimer) clearTimeout(this.chartRefreshTimer);
    this.chartRefreshTimer = null;
    this.chartState = null;
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
    title.dataset.long = String(model.title.length > 28);
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
    const missingComparison = items.some((item) => {
      if (item.numericValue == null) return false;
      if (transform === "rank") return item.rank == null;
      if (transform === "difference") return item.differenceFromBest == null;
      if (transform === "percent") return item.percentDifferenceFromBest == null;
      return false;
    });
    if (transform !== "values" && !missingComparison) {
      const direction = node(
        this.document,
        "p",
        "tv-rank-note",
        model.rankDirection === "lower"
          ? "Lower is better."
          : "Higher is better.",
      );
      direction.dataset.kind = "direction";
      heading.append(direction);
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
      const itemHeading = node(this.document, "div", "tv-item-heading");
      itemHeading.append(node(this.document, "span", "tv-item-label", item.label));
      if (
        transform === "difference" &&
        model.rankStrategy === "per-column" &&
        item.comparisonBaseline !== undefined
      ) {
        itemHeading.append(
          node(
            this.document,
            "span",
            "tv-item-baseline",
            `vs ${compactPresentationValue(item.comparisonBaseline)}`,
          ),
        );
      }
      entry.append(
        itemHeading,
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
    if (transform !== "values" && missingComparison) {
      const warning = node(
        this.document,
        "div",
        "tv-rank-note",
        transform === "percent"
          ? "Percent difference needs a known direction and a non-zero best value."
          : model.rankStrategy === "per-column"
            ? "Direction is unclear for one or more columns."
            : "Direction is unclear. Add data-televizer-rank=\"higher\" or \"lower\".",
      );
      warning.dataset.kind = "warning";
      this.panel.append(warning);
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
    const safeX = Math.max(24, viewportWidth * 0.05);
    const safeY = Math.max(20, viewportHeight * 0.05);
    const isStage = model.kind === "media" || model.kind === "chart";
    const isHorizontal = !isStage && model.orientation === "horizontal";
    const fallbackWidth =
      isStage
        ? Math.min(model.kind === "chart" ? 1500 : 1100, viewportWidth - safeX * 2)
        : isHorizontal
          ? Math.min(1500, viewportWidth - safeX * 2)
          : Math.min(720, viewportWidth - safeX * 2);
    const fallbackHeight =
      isStage
        ? Math.min(model.kind === "chart" ? 900 : 780, viewportHeight - safeY * 2)
        : isHorizontal
          ? Math.min(600, viewportHeight * 0.68)
          : Math.min(700, viewportHeight * 0.78);
    const panelWidth = this.panel.offsetWidth || fallbackWidth;
    const panelHeight = this.panel.offsetHeight || fallbackHeight;
    const source = model.sourceRect;

    let left = source.right + 26;
    let top = Math.max(safeY, source.top + source.height / 2 - panelHeight / 2);
    if (isStage) {
      left = Math.max(safeX, (viewportWidth - panelWidth) / 2);
      top = Math.max(safeY, (viewportHeight - panelHeight) / 2);
    } else if (isHorizontal) {
      left = Math.max(safeX, (viewportWidth - panelWidth) / 2);
      top = source.bottom + 22;
      if (top + panelHeight > viewportHeight - safeY) {
        top = Math.max(safeY, source.top - panelHeight - 22);
      }
    } else if (left + panelWidth > viewportWidth - safeX) {
      left = source.left - panelWidth - 26;
    }
    if (left < safeX) {
      left = Math.max(safeX, (viewportWidth - panelWidth) / 2);
    }
    if (top + panelHeight > viewportHeight - safeY) {
      top = Math.max(safeY, viewportHeight - panelHeight - safeY);
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
      : formatNumber(item.percentDifferenceFromBest, "%", "", true);
  }
  if (transform === "difference") {
    if (item.differenceFromBest == null) return "—";
    if (item.differenceFromBest === 0) return "--";
    const { prefix, suffix } = numericParts(item.value);
    return formatNumber(item.differenceFromBest, suffix, prefix, true);
  }
  return item.value;
}

function formatNumber(
  value: number,
  suffix: string,
  prefix: string,
  showPositiveSign = false,
): string {
  const compact = compactBytes(Math.abs(value), suffix);
  const absolute = compact.value;
  const decimals = Number.isInteger(absolute) ? 0 : absolute < 10 ? 1 : 0;
  const number = absolute.toFixed(decimals);
  const sign = value < 0 ? "−" : showPositiveSign && value > 0 ? "+" : "";
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
  const compact = compactBytes(Math.abs(parsed), suffix);
  if (compact.value === Math.abs(parsed) && compact.suffix === suffix) {
    const sign = parsed < 0 ? "−" : "";
    const suffixSeparator = suffix && !isTightUnit(suffix) ? " " : "";
    return `${sign}${prefix}${Math.abs(parsed)}${suffixSeparator}${suffix}`;
  }
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

function pointInside(x: number, y: number, rect: DOMRect): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
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
