import { describe, expect, it } from "vitest";
import {
  compareItemsToBest,
  inferRankDirection,
  parseNumericValue,
  rankItems,
} from "../src/rank";
import type { PresentationItem } from "../src/types";

function item(label: string, value: string): PresentationItem {
  const element = document.createElement("td");
  return {
    label,
    value,
    numericValue: parseNumericValue(value),
    sourceElement: element,
  };
}

describe("rankItems", () => {
  it("adds ranks without changing source order", () => {
    const source = [item("GPT-5", "89.3"), item("Claude", "87.9"), item("Gemini", "88.1")];
    const ranked = rankItems(source, "higher");

    expect(ranked.map((entry) => entry.label)).toEqual(["GPT-5", "Claude", "Gemini"]);
    expect(ranked.map((entry) => entry.rank)).toEqual([1, 3, 2]);
  });

  it("supports lower-is-better metrics and tied ranks", () => {
    const source = [item("A", "38 ms"), item("B", "18 ms"), item("C", "18 ms")];
    expect(rankItems(source, "lower").map((entry) => entry.rank)).toEqual([3, 1, 1]);
  });

  it("does not guess when direction is unknown", () => {
    const source = [item("A", "10"), item("B", "20")];
    expect(rankItems(source, "unknown").map((entry) => entry.rank)).toEqual([
      undefined,
      undefined,
    ]);
  });
});

describe("rank parsing and direction", () => {
  it("parses formatted numbers", () => {
    expect(parseNumericValue("1,204.7 ms")).toBe(1204.7);
    expect(parseNumericValue("−8.4%")).toBe(-8.4);
    expect(parseNumericValue("—")).toBeNull();
  });

  it("uses explicit direction before semantic inference", () => {
    expect(inferRankDirection("Latency", "higher")).toBe("higher");
    expect(inferRankDirection("Median TTFB")).toBe("lower");
    expect(inferRankDirection("MMLU score")).toBe("higher");
    expect(inferRankDirection("Value")).toBe("unknown");
  });
});

describe("compareItemsToBest", () => {
  it("uses a signed disadvantage for higher-is-better values", () => {
    const compared = compareItemsToBest(
      [item("A", "90"), item("B", "81"), item("C", "90")],
      "higher",
    );

    expect(compared.map((entry) => entry.differenceFromBest)).toEqual([0, -9, 0]);
    expect(compared.map((entry) => entry.percentDifferenceFromBest)).toEqual([
      0,
      -10,
      0,
    ]);
  });

  it("uses a positive offset above the best lower-is-better value", () => {
    const compared = compareItemsToBest(
      [item("A", "38 ms"), item("B", "18 ms")],
      "lower",
    );

    expect(compared.map((entry) => entry.differenceFromBest)).toEqual([20, 0]);
    expect(compared.map((entry) => entry.percentDifferenceFromBest)).toEqual([
      111.11111111111111,
      0,
    ]);
  });

  it("declines unknown direction and a zero percentage baseline", () => {
    expect(
      compareItemsToBest([item("A", "1"), item("B", "2")], "unknown").map(
        (entry) => entry.differenceFromBest,
      ),
    ).toEqual([undefined, undefined]);
    expect(
      compareItemsToBest([item("A", "0"), item("B", "2")], "lower").map(
        (entry) => entry.percentDifferenceFromBest,
      ),
    ).toEqual([undefined, undefined]);
  });
});
