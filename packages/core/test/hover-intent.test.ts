import { afterEach, describe, expect, it, vi } from "vitest";
import { HoverIntent } from "../src/hover-intent";

afterEach(() => vi.useRealTimers());

describe("HoverIntent", () => {
  it("uses a longer first acquisition and a shorter traversal", () => {
    vi.useFakeTimers();
    const acquired: string[] = [];
    const intent = new HoverIntent<string>({
      acquireDelay: 350,
      traverseDelay: 175,
      releaseDelay: 150,
      onAcquire: (target) => acquired.push(target),
      onRelease: vi.fn(),
    });

    intent.move("first");
    vi.advanceTimersByTime(349);
    expect(acquired).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(acquired).toEqual(["first"]);

    intent.move("second");
    vi.advanceTimersByTime(174);
    expect(acquired).toEqual(["first"]);
    vi.advanceTimersByTime(1);
    expect(acquired).toEqual(["first", "second"]);
  });

  it("uses release grace and cancels it when the pointer returns", () => {
    vi.useFakeTimers();
    const release = vi.fn();
    const intent = new HoverIntent<string>({
      acquireDelay: 10,
      traverseDelay: 5,
      releaseDelay: 150,
      onAcquire: vi.fn(),
      onRelease: release,
    });
    intent.move("target");
    vi.advanceTimersByTime(10);
    intent.release();
    vi.advanceTimersByTime(100);
    intent.move("target");
    vi.advanceTimersByTime(100);
    expect(release).not.toHaveBeenCalled();
  });

  it("reports pending intent and cancels it when returning to the active target", () => {
    vi.useFakeTimers();
    const pending: Array<[string, number]> = [];
    const pendingEnd = vi.fn();
    const intent = new HoverIntent<string>({
      acquireDelay: 1000,
      traverseDelay: 200,
      releaseDelay: 150,
      onPending: (target, delay) => pending.push([target, delay]),
      onPendingEnd: pendingEnd,
      onAcquire: vi.fn(),
      onRelease: vi.fn(),
    });

    intent.move("first");
    expect(pending).toEqual([["first", 1000]]);
    vi.advanceTimersByTime(1000);
    intent.move("second");
    expect(pending.at(-1)).toEqual(["second", 200]);
    intent.move("first");
    vi.advanceTimersByTime(200);

    expect(pendingEnd).toHaveBeenCalledTimes(2);
  });

  it("holds the active target while cancelling a pending traversal", () => {
    vi.useFakeTimers();
    const acquired: string[] = [];
    const release = vi.fn();
    const intent = new HoverIntent<string>({
      acquireDelay: 10,
      traverseDelay: 20,
      releaseDelay: 30,
      onAcquire: (target) => acquired.push(target),
      onRelease: release,
    });

    intent.move("first");
    vi.advanceTimersByTime(10);
    intent.move("second");
    intent.hold();
    vi.advanceTimersByTime(50);

    expect(acquired).toEqual(["first"]);
    expect(release).not.toHaveBeenCalled();
  });
});
