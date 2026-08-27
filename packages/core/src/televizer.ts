import { HoverIntent } from "./hover-intent";
import { PresentationOverlay } from "./overlay";
import { buildPresentationModel } from "./presentation-model";
import { inferScopeFromTableTarget } from "./table-context";
import { TargetResolver } from "./target-resolver";
import type {
  ElementPresentation,
  TelevizerOptions,
  TelevizerScope,
  TelevizerState,
  TelevizerTransform,
} from "./types";

interface SelectionTarget {
  kind: "selection";
  range: Range;
  sourceRect: DOMRect;
  text: string;
}

type PresentationTarget = HTMLElement | SelectionTarget;

function isSelectionTarget(target: PresentationTarget): target is SelectionTarget {
  return !(target instanceof HTMLElement);
}

const DEFAULT_OPTIONS: Required<
  Omit<TelevizerOptions, "document" | "targetSelectors">
> = {
  acquireDelay: 1050,
  traverseDelay: 175,
  releaseDelay: 150,
  maxElementTextLength: 420,
};

export class Televizer {
  private readonly document: Document;
  private readonly resolver: TargetResolver;
  private readonly overlay: PresentationOverlay;
  private readonly intent: HoverIntent<PresentationTarget>;
  private mounted = false;
  private currentTarget: PresentationTarget | null = null;
  private selectionTarget: SelectionTarget | null = null;
  private pointerPosition = { x: 0, y: 0 };
  private pointerSuppressedUntil = 0;
  private state: TelevizerState = {
    active: false,
    scope: "element",
    transform: "values",
  };

  constructor(options: TelevizerOptions = {}) {
    this.document = options.document ?? document;
    const settings = { ...DEFAULT_OPTIONS, ...options };
    this.resolver = new TargetResolver(
      settings.maxElementTextLength,
      options.targetSelectors,
    );
    this.overlay = new PresentationOverlay(this.document, {
      onSetTransform: (transform) => this.setTransform(transform),
      onCloseHelp: () => this.overlay.hideHelp(),
    });
    this.intent = new HoverIntent({
      acquireDelay: settings.acquireDelay,
      traverseDelay: settings.traverseDelay,
      releaseDelay: settings.releaseDelay,
      onPending: (_target, delay) => {
        this.overlay.showIntent(
          this.pointerPosition.x,
          this.pointerPosition.y,
          delay,
        );
      },
      onPendingEnd: () => this.overlay.hideIntent(),
      onAcquire: (target) => this.present(target),
      onRelease: () => this.dismissPresentation(),
    });
  }

  mount(): this {
    if (this.mounted) return this;
    this.document.addEventListener("keydown", this.onKeyDown, true);
    this.document.addEventListener("pointermove", this.onPointerMove, true);
    this.document.addEventListener("pointerover", this.onPointerMove, true);
    this.document.addEventListener("mouseover", this.onMouseOver, true);
    this.document.addEventListener("mouseleave", this.onDocumentLeave, true);
    this.document.addEventListener("selectionchange", this.onSelectionChange);
    this.document.addEventListener("pointerdown", this.onPointerDown, true);
    this.document.addEventListener("scroll", this.onViewportChange, true);
    this.document.defaultView?.addEventListener("resize", this.onViewportChange);
    this.overlay.mount();
    this.mounted = true;
    return this;
  }

  destroy(): void {
    if (!this.mounted) return;
    this.document.removeEventListener("keydown", this.onKeyDown, true);
    this.document.removeEventListener("pointermove", this.onPointerMove, true);
    this.document.removeEventListener("pointerover", this.onPointerMove, true);
    this.document.removeEventListener("mouseover", this.onMouseOver, true);
    this.document.removeEventListener("mouseleave", this.onDocumentLeave, true);
    this.document.removeEventListener("selectionchange", this.onSelectionChange);
    this.document.removeEventListener("pointerdown", this.onPointerDown, true);
    this.document.removeEventListener("scroll", this.onViewportChange, true);
    this.document.defaultView?.removeEventListener("resize", this.onViewportChange);
    this.intent.reset();
    delete this.document.documentElement.dataset.televizerActive;
    this.overlay.destroy();
    this.mounted = false;
  }

  start(): void {
    if (!this.mounted) this.mount();
    if (this.state.active) return;
    this.state = { ...this.state, active: true };
    this.document.documentElement.dataset.televizerActive = "";
    this.overlay.flash("TELEVIZER · ON");
    this.emitState();
  }

  stop(): void {
    if (!this.state.active) return;
    this.state = { active: false, scope: "element", transform: "values" };
    delete this.document.documentElement.dataset.televizerActive;
    this.currentTarget = null;
    this.intent.reset();
    this.overlay.hide();
    this.overlay.hideHelp();
    this.overlay.flash("TELEVIZER · OFF");
    this.emitState();
  }

  toggle(): void {
    if (this.state.active) this.stop();
    else this.start();
  }

  setScope(scope: TelevizerScope): void {
    if (!this.state.active) return;
    this.state = { ...this.state, scope, transform: "values" };
    this.overlay.flash(scope.toUpperCase());
    this.refreshPresentation();
    this.emitState();
  }

  toggleRank(): void {
    this.setTransform(this.state.transform === "rank" ? "values" : "rank");
  }

  setTransform(transform: TelevizerTransform): void {
    if (!this.state.active) return;
    if (transform !== "values" && this.state.scope === "element") {
      this.overlay.flash("CHOOSE ROW OR COLUMN");
      return;
    }
    this.state = { ...this.state, transform };
    const labels: Record<TelevizerTransform, string> = {
      values: "VALUES",
      rank: "ORDINAL",
      difference: "GAP FROM BEST",
      percent: "% FROM BEST",
    };
    this.overlay.flash(labels[transform]);
    this.refreshPresentation();
    this.emitState();
  }

  getState(): Readonly<TelevizerState> {
    return { ...this.state };
  }

  focus(element: HTMLElement): void {
    if (!this.state.active) this.start();
    this.present(element);
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    this.considerPointer(event);
  };

  private readonly onMouseOver = (event: MouseEvent): void => {
    this.considerPointer(event);
  };

  private considerPointer(event: MouseEvent | PointerEvent): void {
    if (
      !this.state.active ||
      ("pointerType" in event && event.pointerType === "touch")
    ) {
      return;
    }
    if (this.overlay.ownsEvent(event)) return;
    const now = this.document.defaultView?.performance.now() ?? 0;
    if (this.currentTarget && now < this.pointerSuppressedUntil) return;
    this.pointerPosition = { x: event.clientX, y: event.clientY };
    this.overlay.moveIntent(event.clientX, event.clientY);
    const target = this.resolver.resolve(event.target);
    this.intent.move(
      this.resolveSelectionTarget(event.target, event.clientX, event.clientY) ??
        target,
    );
  }

  private readonly onSelectionChange = (): void => {
    if (!this.state.active) return;
    const origin = this.document.elementFromPoint?.(
      this.pointerPosition.x,
      this.pointerPosition.y,
    );
    if (!origin) return;
    const selection = this.resolveSelectionTarget(
      origin,
      this.pointerPosition.x,
      this.pointerPosition.y,
    );
    if (selection) this.intent.move(selection);
  };

  private resolveSelectionTarget(
    origin: EventTarget | null,
    x: number,
    y: number,
  ): SelectionTarget | null {
    if (!(origin instanceof Node)) return null;
    const selection = this.document.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      this.selectionTarget = null;
      return null;
    }
    const text = selection.toString().replace(/\s+/g, " ").trim();
    if (!text || text.length > 1200) return null;
    const range = selection.getRangeAt(0);
    const common =
      range.commonAncestorContainer instanceof Element
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement;
    if (!common || (!common.contains(origin) && common !== origin)) return null;
    const rect = range.getBoundingClientRect();
    const padding = 10;
    if (
      rect.width > 0 &&
      rect.height > 0 &&
      (x < rect.left - padding ||
        x > rect.right + padding ||
        y < rect.top - padding ||
        y > rect.bottom + padding)
    ) {
      return null;
    }
    const cached = this.selectionTarget;
    if (
      cached &&
      cached.text === text &&
      cached.range.startContainer === range.startContainer &&
      cached.range.startOffset === range.startOffset &&
      cached.range.endContainer === range.endContainer &&
      cached.range.endOffset === range.endOffset
    ) {
      return cached;
    }
    this.selectionTarget = {
      kind: "selection",
      range: range.cloneRange(),
      sourceRect: rect,
      text,
    };
    return this.selectionTarget;
  }

  private readonly onDocumentLeave = (event: MouseEvent): void => {
    if (!this.state.active) return;
    if (
      event.target !== this.document &&
      event.target !== this.document.documentElement
    ) {
      return;
    }
    this.intent.release();
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || !this.state.active) return;
    if (this.overlay.ownsEvent(event)) return;
    this.overlay.hideHelp();
    if (this.currentTarget) this.dismissPresentation();
  };

  private readonly onViewportChange = (): void => {
    if (!this.state.active) return;
    this.dismissPresentation();
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    if (event.altKey && key === "t") {
      event.preventDefault();
      event.stopPropagation();
      this.toggle();
      return;
    }
    if (!this.state.active || event.altKey || event.ctrlKey || event.metaKey) return;
    if (key === "escape" && this.overlay.isHelpVisible()) {
      event.preventDefault();
      this.overlay.hideHelp();
      return;
    }
    if (
      key === "e" ||
      key === "r" ||
      key === "c" ||
      key === "1" ||
      key === "%" ||
      key === "-" ||
      key === "?"
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (key === "e") this.setScope("element");
    else if (key === "r") this.setScope("row");
    else if (key === "c") this.setScope("column");
    else if (key === "1") this.toggleRank();
    else if (key === "%") {
      this.setTransform(this.state.transform === "percent" ? "values" : "percent");
    } else if (key === "-") {
      this.setTransform(
        this.state.transform === "difference" ? "values" : "difference",
      );
    } else if (key === "?") {
      const show = !this.overlay.isHelpVisible();
      this.dismissPresentation();
      if (show) this.overlay.showHelp();
      else this.overlay.hideHelp();
    }
  };

  private present(target: PresentationTarget): void {
    if (!this.state.active) return;
    if (isSelectionTarget(target)) {
      const common = target.range.commonAncestorContainer;
      if (!common.isConnected) return;
    } else if (!target.isConnected) {
      return;
    }
    const inferredScope = isSelectionTarget(target)
      ? "element"
      : inferScopeFromTableTarget(target) ?? "element";
    if (inferredScope !== this.state.scope) {
      this.state = { ...this.state, scope: inferredScope, transform: "values" };
      this.overlay.flash(inferredScope.toUpperCase());
      this.emitState();
    }
    this.currentTarget = target;
    this.refreshPresentation();
  }

  private dismissPresentation(): void {
    this.currentTarget = null;
    this.pointerSuppressedUntil = 0;
    this.intent.reset();
    this.overlay.hide();
    if (this.state.scope !== "element" || this.state.transform !== "values") {
      this.state = { ...this.state, scope: "element", transform: "values" };
      this.emitState();
    }
  }

  private refreshPresentation(): void {
    if (!this.currentTarget) return;
    const model = isSelectionTarget(this.currentTarget)
      ? this.buildSelectionModel(this.currentTarget)
      : buildPresentationModel(this.currentTarget, this.state.scope);
    if (model.kind === "element" && this.state.scope !== "element") {
      this.overlay.flash(`${this.state.scope.toUpperCase()} NOT FOUND`);
    }
    this.overlay.show(model, this.state);
    const now = this.document.defaultView?.performance.now() ?? 0;
    this.pointerSuppressedUntil = now + 420;
  }

  private buildSelectionModel(target: SelectionTarget): ElementPresentation {
    const common = target.range.commonAncestorContainer;
    const sourceElement =
      common instanceof HTMLElement ? common : common.parentElement;
    return {
      kind: "element",
      title: "Quote",
      value: target.text,
      context: "Selected text",
      orientation: "single",
      sourceElements: sourceElement ? [sourceElement] : [],
      sourceRect: target.sourceRect,
    };
  }

  private emitState(): void {
    this.document.dispatchEvent(
      new CustomEvent("televizer:statechange", { detail: this.getState() }),
    );
  }
}
