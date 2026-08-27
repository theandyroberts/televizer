import { beforeEach, describe, expect, it } from "vitest";
import { buildPresentationModel } from "../src/presentation-model";
import {
  inferScopeFromTableTarget,
  resolveTableContext,
} from "../src/table-context";

beforeEach(() => {
  document.body.innerHTML = `
    <table data-televizer-rank="higher">
      <thead><tr><th>Model</th><th>MMLU score</th><th>GPQA score</th></tr></thead>
      <tbody>
        <tr><th scope="row">GPT-5</th><td id="target">89.3</td><td>82.1</td></tr>
        <tr><th scope="row">Claude</th><td>89.1</td><td>84.8</td></tr>
        <tr><th scope="row">Gemini</th><td>88.6</td><td>81.7</td></tr>
      </tbody>
    </table>
  `;
});

describe("native table context", () => {
  it("extracts row and column labels and values", () => {
    const target = document.querySelector<HTMLElement>("#target")!;
    const context = resolveTableContext(target)!;

    expect(context.rowTitle).toBe("GPT-5");
    expect(context.columnTitle).toBe("MMLU score");
    expect(context.rowItems.map((entry) => entry.label)).toEqual([
      "MMLU score",
      "GPQA score",
    ]);
    expect(context.rowItems.map((entry) => entry.value)).toEqual(["89.3", "82.1"]);
    expect(context.columnItems.map((entry) => entry.label)).toEqual([
      "GPT-5",
      "Claude",
      "Gemini",
    ]);
    expect(context.columnRankDirection).toBe("higher");
  });

  it("builds horizontal rows and vertical columns", () => {
    const target = document.querySelector<HTMLElement>("#target")!;
    const row = buildPresentationModel(target, "row");
    const column = buildPresentationModel(target, "column");

    expect(row.kind).toBe("collection");
    expect(row.orientation).toBe("horizontal");
    if (row.kind === "collection") {
      expect(row.rankStrategy).toBe("per-column");
      expect(row.items.map((entry) => entry.rank)).toEqual([1, 2]);
    }
    expect(column.kind).toBe("collection");
    expect(column.orientation).toBe("vertical");
    if (column.kind === "collection") {
      expect(column.rankStrategy).toBe("within-collection");
    }
  });

  it("creates a context-rich element model for a table cell", () => {
    const target = document.querySelector<HTMLElement>("#target")!;
    expect(buildPresentationModel(target, "element")).toMatchObject({
      kind: "element",
      title: "MMLU score",
      value: "89.3",
      context: "GPT-5",
    });
  });

  it("treats column headers and row-leading cells as scope shortcuts", () => {
    const columnHeader = document.querySelectorAll<HTMLElement>("thead th")[1]!;
    const rowHeader = document.querySelector<HTMLElement>("tbody th")!;
    const dataCell = document.querySelector<HTMLElement>("#target")!;

    expect(inferScopeFromTableTarget(columnHeader)).toBe("column");
    expect(inferScopeFromTableTarget(rowHeader)).toBe("row");
    expect(inferScopeFromTableTarget(dataCell)).toBe("element");
    expect(buildPresentationModel(columnHeader, "column")).toMatchObject({
      kind: "collection",
      title: "MMLU score",
      orientation: "vertical",
      items: [
        { label: "GPT-5", value: "89.3" },
        { label: "Claude", value: "89.1" },
        { label: "Gemini", value: "88.6" },
      ],
    });
  });

  it("ranks each row value within its own column and respects mixed directions", () => {
    document.body.innerHTML = `
      <table data-televizer-rank="higher">
        <thead><tr><th>Model</th><th>Accuracy score</th><th>Latency ms</th></tr></thead>
        <tbody>
          <tr><th scope="row">Model A</th><td id="mixed">90</td><td>120 ms</td></tr>
          <tr><th scope="row">Model B</th><td>80</td><td>80 ms</td></tr>
        </tbody>
      </table>
    `;
    const row = buildPresentationModel(
      document.querySelector<HTMLElement>("#mixed")!,
      "row",
    );

    expect(row.kind).toBe("collection");
    if (row.kind === "collection") {
      expect(row.items.map((entry) => entry.rank)).toEqual([1, 2]);
    }
  });
});
