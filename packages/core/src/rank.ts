import type { PresentationItem, RankDirection } from "./types";

const LOWER_IS_BETTER = [
  "latency",
  "ttfb",
  "response time",
  "load time",
  "duration",
  "cost",
  "price",
  "error",
  "failure",
  "loss",
  "memory",
  "milliseconds",
  " ms",
  "seconds",
];

const HIGHER_IS_BETTER = [
  "score",
  "accuracy",
  "throughput",
  "uptime",
  "revenue",
  "quality",
  "pass rate",
  "success rate",
  "hit rate",
  "performance",
];

export function parseNumericValue(value: string): number | null {
  const normalized = value
    .replaceAll(",", "")
    .replace(/[−–—]/g, "-")
    .match(/-?\d+(?:\.\d+)?/);
  if (!normalized) return null;
  const parsed = Number(normalized[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function inferRankDirection(
  label: string,
  explicit?: string | null,
): RankDirection {
  if (explicit === "higher" || explicit === "lower") return explicit;
  const normalized = ` ${label.toLowerCase()} `;
  if (LOWER_IS_BETTER.some((keyword) => normalized.includes(keyword))) {
    return "lower";
  }
  if (HIGHER_IS_BETTER.some((keyword) => normalized.includes(keyword))) {
    return "higher";
  }
  return "unknown";
}

export function rankItems(
  items: PresentationItem[],
  direction: RankDirection,
): PresentationItem[] {
  if (direction === "unknown") return items.map((item) => ({ ...item }));

  const numeric = items
    .map((item, sourceIndex) => ({ value: item.numericValue, sourceIndex }))
    .filter((entry): entry is { value: number; sourceIndex: number } =>
      Number.isFinite(entry.value),
    )
    .sort((a, b) =>
      direction === "higher" ? b.value - a.value : a.value - b.value,
    );

  const rankByIndex = new Map<number, number>();
  let previous: number | undefined;
  let previousRank = 0;
  numeric.forEach((entry, sortedIndex) => {
    const rank = previous === entry.value ? previousRank : sortedIndex + 1;
    rankByIndex.set(entry.sourceIndex, rank);
    previous = entry.value;
    previousRank = rank;
  });

  return items.map((item, index) => ({
    ...item,
    rank: rankByIndex.get(index),
  }));
}

export function compareItemsToBest(
  items: PresentationItem[],
  direction: RankDirection,
): PresentationItem[] {
  if (direction === "unknown") return items.map((item) => ({ ...item }));
  const values = items
    .map((item) => item.numericValue)
    .filter((value): value is number => Number.isFinite(value));
  if (values.length === 0) return items.map((item) => ({ ...item }));
  const best = direction === "higher" ? Math.max(...values) : Math.min(...values);

  return items.map((item) => {
    if (item.numericValue == null) return { ...item };
    const differenceFromBest =
      direction === "higher"
        ? item.numericValue - best
        : best - item.numericValue;
    return {
      ...item,
      differenceFromBest,
      percentDifferenceFromBest:
        best === 0 ? undefined : (differenceFromBest / Math.abs(best)) * 100,
    };
  });
}
