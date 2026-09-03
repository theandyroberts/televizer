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
    expect(context.rowItems.map((entry) => entry.comparisonBaseline)).toEqual([
      "89.3",
      "84.8",
    ]);
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
      expect(row.items.map((entry) => entry.comparisonBaseline)).toEqual([
        "89.3",
        "84.8",
      ]);
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

  it("defaults an unclear direction to higher and accepts a lower override", () => {
    document.body.innerHTML = `
      <table>
        <thead><tr><th>Task</th><th>System A</th><th>System B</th></tr></thead>
        <tbody>
          <tr><th scope="row">Current</th><td id="unclear">73.9</td><td>70.7</td></tr>
          <tr><th scope="row">Peer</th><td>80.2</td><td>60.1</td></tr>
        </tbody>
      </table>
    `;
    const target = document.querySelector<HTMLElement>("#unclear")!;
    const higher = buildPresentationModel(target, "row");
    const lower = buildPresentationModel(target, "row", "lower");

    expect(higher).toMatchObject({
      kind: "collection",
      rankDirection: "higher",
      items: [{ rank: 2 }, { rank: 1 }],
    });
    expect(lower).toMatchObject({
      kind: "collection",
      rankDirection: "lower",
      items: [{ rank: 1 }, { rank: 2 }],
    });
  });

  it("recognizes a blank-corner table with models across columns as transposed", () => {
    document.body.innerHTML = `
      <table>
        <thead><tr><th></th><th>Qwen Flash</th><th>Qwen Plus</th><th>DeepSeek</th></tr></thead>
        <tbody>
          <tr><td id="params"># Params</td><td>125B</td><td>397B</td><td>284B</td></tr>
          <tr><td>Agentic coding</td><td>58.7</td><td>16.5</td><td>54.4</td></tr>
        </tbody>
      </table>
    `;
    const row = buildPresentationModel(
      document.querySelector<HTMLElement>("#params")!,
      "row",
      "higher",
    );

    expect(row).toMatchObject({
      kind: "collection",
      title: "# Params",
      rankStrategy: "within-collection",
      items: [
        { label: "Qwen Flash", value: "125B" },
        { label: "Qwen Plus", value: "397B" },
        { label: "DeepSeek", value: "284B" },
      ],
    });
  });
});

describe("media presentation models", () => {
  it("builds a chart model before treating its image as ordinary media", () => {
    document.body.innerHTML = `
      <figure id="chart" data-televizer-type="chart" data-televizer-label="Performance">
        <img src="/chart.png" alt="Agent scores" />
      </figure>
    `;
    const chart = document.querySelector<HTMLElement>("#chart")!;
    Object.defineProperty(chart, "getBoundingClientRect", {
      configurable: true,
      value: () => new DOMRect(100, 200, 800, 500),
    });

    expect(
      buildPresentationModel(chart, "element", undefined, { x: 700, y: 450 }),
    ).toMatchObject({
      kind: "chart",
      title: "Performance",
      sourceElement: chart,
      pointer: { x: 600, y: 250 },
    });
  });

  it("builds a zoomable image model with its caption", () => {
    document.body.innerHTML = `
      <figure data-televizer-label="Gap comparison">
        <img id="image" src="/gap.png" alt="Gap view" />
        <figcaption>The closest CDN is the comparison baseline.</figcaption>
      </figure>
    `;

    expect(
      buildPresentationModel(
        document.querySelector<HTMLElement>("#image")!,
        "element",
      ),
    ).toMatchObject({
      kind: "media",
      mediaType: "image",
      title: "Gap comparison",
      caption: "The closest CDN is the comparison baseline.",
      src: "http://localhost:3000/gap.png",
      alt: "Gap view",
    });
  });

  it("captures native video playback state", () => {
    document.body.innerHTML = `
      <video id="video" src="/flower.mp4" muted loop title="Flower time-lapse"></video>
    `;
    const video = document.querySelector<HTMLVideoElement>("#video")!;
    video.currentTime = 2.5;
    video.muted = true;

    expect(buildPresentationModel(video, "element")).toMatchObject({
      kind: "media",
      mediaType: "video",
      title: "Flower time-lapse",
      src: "http://localhost:3000/flower.mp4",
      playback: {
        currentTime: 2.5,
        paused: true,
        muted: true,
        loop: true,
        playbackRate: 1,
        volume: 1,
      },
    });
  });

  it("builds an embedded media model without inspecting its contents", () => {
    document.body.innerHTML = `
      <iframe id="embed" src="https://example.com/embed/42" title="Embedded demo" allow="fullscreen" sandbox allowfullscreen></iframe>
    `;

    expect(
      buildPresentationModel(
        document.querySelector<HTMLElement>("#embed")!,
        "element",
      ),
    ).toMatchObject({
      kind: "media",
      mediaType: "embed",
      title: "Embedded demo",
      src: "https://example.com/embed/42",
      embed: {
        allow: "fullscreen",
        sandbox: "",
        allowFullscreen: true,
      },
    });
  });
});
