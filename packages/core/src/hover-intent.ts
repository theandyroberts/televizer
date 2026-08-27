export interface HoverIntentOptions<T> {
  acquireDelay: number;
  traverseDelay: number;
  releaseDelay: number;
  onPending?: (target: T, delay: number) => void;
  onPendingEnd?: () => void;
  onAcquire: (target: T) => void;
  onRelease: () => void;
}

export class HoverIntent<T> {
  private pending: T | null = null;
  private active: T | null = null;
  private acquireTimer: ReturnType<typeof setTimeout> | null = null;
  private releaseTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly options: HoverIntentOptions<T>) {}

  move(target: T | null): void {
    this.clearRelease();
    if (target === this.pending) return;
    if (target === this.active) {
      this.cancelPending();
      return;
    }

    this.cancelPending();
    this.pending = target;
    if (!target) {
      this.scheduleRelease();
      return;
    }

    const delay = this.active
      ? this.options.traverseDelay
      : this.options.acquireDelay;
    this.options.onPending?.(target, delay);
    this.acquireTimer = setTimeout(() => {
      const next = this.pending;
      if (!next) return;
      this.pending = null;
      this.acquireTimer = null;
      this.options.onPendingEnd?.();
      this.active = next;
      this.options.onAcquire(next);
    }, delay);
  }

  release(): void {
    this.cancelPending();
    this.scheduleRelease();
  }

  reset(): void {
    this.cancelPending();
    this.active = null;
    this.clearRelease();
  }

  private cancelPending(): void {
    const hadPending = this.pending != null;
    this.pending = null;
    this.clearAcquire();
    if (hadPending) this.options.onPendingEnd?.();
  }

  private scheduleRelease(): void {
    this.clearRelease();
    if (!this.active) return;
    this.releaseTimer = setTimeout(() => {
      this.active = null;
      this.options.onRelease();
    }, this.options.releaseDelay);
  }

  private clearAcquire(): void {
    if (this.acquireTimer) clearTimeout(this.acquireTimer);
    this.acquireTimer = null;
  }

  private clearRelease(): void {
    if (this.releaseTimer) clearTimeout(this.releaseTimer);
    this.releaseTimer = null;
  }
}
