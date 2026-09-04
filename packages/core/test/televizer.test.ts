import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Televizer } from "../src/televizer";

let televizer: Televizer | null = null;

beforeEach(() => {
  document.body.removeAttribute("style");
  document.body.innerHTML = `
    <article id="metric" data-televizer-target data-televizer-label="TTFB" data-televizer-value="38 ms">
      <strong>38 ms</strong>
    </article>
  `;
});

afterEach(() => {
  televizer?.destroy();
  televizer = null;
  vi.useRealTimers();
});

describe("Televizer hover acquisition", () => {
  it("recognizes the physical Option+T shortcut on macOS", () => {
    televizer = new Televizer({ document }).mount();

    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        altKey: true,
        code: "KeyT",
        key: "†",
      }),
    );

    expect(televizer.getState().active).toBe(true);
  });

  it("waits about one second before the first presentation", () => {
    vi.useFakeTimers();
    televizer = new Televizer({ document }).mount();
    televizer.start();
    const metric = document.querySelector<HTMLElement>("#metric")!;
    const stage = document
      .querySelector("televizer-overlay")!
      .shadowRoot!.querySelector<HTMLElement>(".tv-stage")!;
    const intentIndicator = document
      .querySelector("televizer-overlay")!
      .shadowRoot!.querySelector<HTMLElement>(".tv-intent")!;

    metric.dispatchEvent(
      new MouseEvent("pointermove", {
        bubbles: true,
        clientX: 100,
        clientY: 80,
      }),
    );
    expect(intentIndicator.dataset.visible).toBe("true");
    expect(intentIndicator.querySelectorAll("i")).toHaveLength(5);
    expect(intentIndicator.style.left).toBe("89px");
    expect(intentIndicator.style.top).toBe("95px");
    vi.advanceTimersByTime(1049);
    expect(stage.dataset.visible).not.toBe("true");
    vi.advanceTimersByTime(1);
    expect(stage.dataset.visible).toBe("true");
    expect(intentIndicator.dataset.visible).toBe("false");
  });

  it("starts intent from a mouseover-only window entry", () => {
    vi.useFakeTimers();
    televizer = new Televizer({ document, acquireDelay: 50 }).mount();
    televizer.start();
    const metric = document.querySelector<HTMLElement>("#metric")!;
    const shadow = document.querySelector("televizer-overlay")!.shadowRoot!;

    metric.dispatchEvent(
      new MouseEvent("mouseover", {
        bubbles: true,
        clientX: 120,
        clientY: 90,
      }),
    );
    expect(
      shadow.querySelector<HTMLElement>(".tv-intent")!.dataset.visible,
    ).toBe("true");
    vi.advanceTimersByTime(50);

    expect(shadow.querySelector<HTMLElement>(".tv-stage")!.dataset.visible).toBe(
      "true",
    );
  });
});

describe("Televizer viewport lifecycle", () => {
  it("hides the complete presentation as soon as scrolling starts", () => {
    televizer = new Televizer({ document }).mount();
    televizer.focus(document.querySelector<HTMLElement>("#metric")!);
    televizer.setScope("row");
    const stage = document
      .querySelector("televizer-overlay")!
      .shadowRoot!.querySelector<HTMLElement>(".tv-stage")!;

    expect(stage.dataset.visible).toBe("true");
    document.dispatchEvent(new Event("scroll"));
    expect(stage.dataset.visible).toBe("false");
    expect(televizer.getState().scope).toBe("element");
  });

  it("keeps a collection open while its own viewport is used", () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<table>
        <thead><tr><th>Model</th><th id="score-head">Score</th></tr></thead>
        <tbody>
          <tr><th scope="row">One</th><td>91</td></tr>
          <tr><th scope="row">Two</th><td>82</td></tr>
        </tbody>
      </table>`,
    );
    televizer = new Televizer({ document }).mount();
    televizer.focus(document.querySelector<HTMLElement>("#score-head")!);
    const shadow = document.querySelector("televizer-overlay")!.shadowRoot!;
    const stage = shadow.querySelector<HTMLElement>(".tv-stage")!;
    const items = shadow.querySelector<HTMLElement>(".tv-items")!;

    items.dispatchEvent(
      new MouseEvent("pointerdown", {
        bubbles: true,
        composed: true,
        button: 0,
      }),
    );
    expect(stage.dataset.visible).toBe("true");

    items.dispatchEvent(
      new Event("scroll", { bubbles: true, composed: true }),
    );
    expect(stage.dataset.visible).toBe("true");
    expect(televizer.getState().scope).toBe("column");
  });

  it("dismisses the presentation on a primary page click", () => {
    televizer = new Televizer({ document }).mount();
    televizer.focus(document.querySelector<HTMLElement>("#metric")!);
    const stage = document
      .querySelector("televizer-overlay")!
      .shadowRoot!.querySelector<HTMLElement>(".tv-stage")!;

    expect(stage.dataset.visible).toBe("true");
    document.body.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true, button: 0 }),
    );
    expect(stage.dataset.visible).toBe("false");
  });

  it("ignores secondary-button clicks", () => {
    televizer = new Televizer({ document }).mount();
    televizer.focus(document.querySelector<HTMLElement>("#metric")!);
    const stage = document
      .querySelector("televizer-overlay")!
      .shadowRoot!.querySelector<HTMLElement>(".tv-stage")!;

    document.body.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true, button: 2 }),
    );
    expect(stage.dataset.visible).toBe("true");
  });

  it("keeps operator hints hidden until H is pressed", () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<table data-televizer-rank="higher">
        <thead><tr><th>Model</th><th>Score</th></tr></thead>
        <tbody>
          <tr><th scope="row">Gemini</th><td id="score">88.1</td></tr>
          <tr><th scope="row">Mistral</th><td>80.7</td></tr>
        </tbody>
      </table>`,
    );
    televizer = new Televizer({ document }).mount();
    televizer.focus(document.querySelector<HTMLElement>("#score")!);
    televizer.setScope("row");
    const shadow = document.querySelector("televizer-overlay")!.shadowRoot!;
    const stage = shadow.querySelector<HTMLElement>(".tv-stage")!;
    const helper = shadow.querySelector<HTMLElement>(".tv-helper")!;

    expect(shadow.querySelector(".tv-transform-toggle")).toBeNull();
    expect(helper.dataset.visible).not.toBe("true");
    document.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "h", code: "KeyH" }),
    );
    expect(helper.dataset.visible).toBe("true");
    expect(helper.textContent).toContain("5 pct");
    expect(stage.dataset.visible).toBe("true");

    document.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "h", code: "KeyH" }),
    );
    expect(helper.dataset.visible).toBe("false");
  });

  it("does not show transform controls for an element fallback", () => {
    televizer = new Televizer({ document }).mount();
    televizer.focus(document.querySelector<HTMLElement>("#metric")!);
    televizer.setScope("row");
    const shadow = document.querySelector("televizer-overlay")!.shadowRoot!;

    expect(shadow.querySelector(".tv-transform-toggle")).toBeNull();
  });

  it("returns an ordinary table cell to element scope", () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<table>
        <thead><tr><th>Model</th><th>GPQA score</th></tr></thead>
        <tbody><tr><th id="model" scope="row">GPT-5</th><td id="gpqa">82.1</td></tr></tbody>
      </table>`,
    );
    televizer = new Televizer({ document }).mount();
    televizer.focus(document.querySelector<HTMLElement>("#model")!);
    expect(televizer.getState().scope).toBe("row");

    televizer.focus(document.querySelector<HTMLElement>("#gpqa")!);
    const shadow = document.querySelector("televizer-overlay")!.shadowRoot!;

    expect(televizer.getState()).toMatchObject({
      scope: "element",
      transform: "values",
    });
    expect(
      shadow.querySelector<HTMLElement>(".tv-element-title")!.textContent,
    ).toBe("GPQA score");
    expect(
      shadow.querySelector<HTMLElement>(".tv-element-value")!.textContent,
    ).toBe("82.1");
  });

  it("holds a column across its cells but traverses to a peer header", () => {
    vi.useFakeTimers();
    document.body.insertAdjacentHTML(
      "beforeend",
      `<table>
        <thead><tr><th>Model</th><th id="mmlu-head">MMLU score</th><th id="gpqa-head">GPQA score</th></tr></thead>
        <tbody>
          <tr><th scope="row">GPT-5</th><td>89.3</td><td id="gpt-gpqa">82.1</td></tr>
          <tr><th scope="row">Claude</th><td>87.9</td><td id="claude-gpqa">84.8</td></tr>
        </tbody>
      </table>`,
    );
    televizer = new Televizer({ document, acquireDelay: 10 }).mount();
    televizer.focus(document.querySelector<HTMLElement>("#gpqa-head")!);
    const shadow = document.querySelector("televizer-overlay")!.shadowRoot!;

    vi.advanceTimersByTime(421);
    for (const selector of ["#gpt-gpqa", "#claude-gpqa"]) {
      document.querySelector<HTMLElement>(selector)!.dispatchEvent(
        new MouseEvent("pointermove", { bubbles: true, clientX: 100, clientY: 100 }),
      );
      vi.advanceTimersByTime(10);
    }

    expect(televizer.getState().scope).toBe("column");
    expect(
      shadow.querySelector<HTMLElement>(".tv-collection-title")!.textContent,
    ).toBe("GPQA score");
    expect(shadow.querySelector<HTMLElement>(".tv-intent")!.dataset.visible).not.toBe(
      "true",
    );

    document.querySelector<HTMLElement>("#mmlu-head")!.dispatchEvent(
      new MouseEvent("pointermove", { bubbles: true, clientX: 100, clientY: 100 }),
    );
    vi.advanceTimersByTime(10);

    expect(televizer.getState().scope).toBe("column");
    expect(
      shadow.querySelector<HTMLElement>(".tv-collection-title")!.textContent,
    ).toBe("MMLU score");
  });

  it("traverses directly from one row header to another", () => {
    vi.useFakeTimers();
    document.body.insertAdjacentHTML(
      "beforeend",
      `<table>
        <thead><tr><th>CDN</th><th>Virginia TTFB</th><th>Oregon TTFB</th></tr></thead>
        <tbody>
          <tr><th id="adobe" scope="row">Adobe</th><td>38 ms</td><td>74 ms</td></tr>
          <tr><th scope="row">Stripo</th><td>67 ms</td><td>48 ms</td></tr>
          <tr><th id="cloudflare" scope="row">Cloudflare</th><td>18 ms</td><td>26 ms</td></tr>
        </tbody>
      </table>`,
    );
    televizer = new Televizer({ document, acquireDelay: 10 }).mount();
    televizer.focus(document.querySelector<HTMLElement>("#cloudflare")!);
    const shadow = document.querySelector("televizer-overlay")!.shadowRoot!;

    document.querySelector<HTMLElement>("#adobe")!.dispatchEvent(
      new MouseEvent("pointermove", { bubbles: true, clientX: 80, clientY: 80 }),
    );
    vi.advanceTimersByTime(10);

    expect(televizer.getState().scope).toBe("row");
    expect(
      shadow.querySelector<HTMLElement>(".tv-collection-title")!.textContent,
    ).toBe("Adobe");
    expect(
      Array.from(shadow.querySelectorAll(".tv-item-value"), (node) => node.textContent),
    ).toEqual(["38 ms", "74 ms"]);
  });

  it("opens and closes the compact keyboard help with question mark", () => {
    televizer = new Televizer({ document }).mount();
    televizer.start();
    const shadow = document.querySelector("televizer-overlay")!.shadowRoot!;
    const help = shadow.querySelector<HTMLElement>(".tv-help")!;

    document.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "?", shiftKey: true }),
    );
    expect(help.dataset.visible).toBe("true");
    expect(help.textContent).toContain("Percent from best");
    expect(help.textContent).toContain("On-air hints");
    expect(help.textContent).toContain("Force chart zoom");
    expect(help.textContent).toContain("Select text");

    document.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "?", shiftKey: true }),
    );
    expect(help.dataset.visible).toBe("false");
  });

  it("defaults unclear comparisons to higher and toggles lower with L or l", () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<table>
        <thead><tr><th>Task</th><th>System A</th><th>System B</th></tr></thead>
        <tbody>
          <tr><th id="current" scope="row">Current</th><td>73.9</td><td>70.7</td></tr>
          <tr><th scope="row">Peer</th><td>80.2</td><td>60.1</td></tr>
        </tbody>
      </table>`,
    );
    televizer = new Televizer({ document }).mount();
    televizer.focus(document.querySelector<HTMLElement>("#current")!);
    televizer.setTransform("rank");
    const shadow = document.querySelector("televizer-overlay")!.shadowRoot!;

    expect(
      Array.from(shadow.querySelectorAll(".tv-item-value"), (node) => node.textContent),
    ).toEqual(["2", "1"]);
    expect(shadow.querySelector<HTMLElement>(".tv-rank-note")!.textContent).toBe(
      "Higher is better.",
    );

    document.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "L", code: "KeyL" }),
    );
    expect(televizer.getState().comparisonDirection).toBe("lower");
    expect(
      Array.from(shadow.querySelectorAll(".tv-item-value"), (node) => node.textContent),
    ).toEqual(["1", "2"]);
    expect(shadow.querySelector<HTMLElement>(".tv-rank-note")!.textContent).toBe(
      "Lower is better.",
    );

    document.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "l", code: "KeyL" }),
    );
    expect(televizer.getState().comparisonDirection).toBe("higher");
    expect(
      Array.from(shadow.querySelectorAll(".tv-item-value"), (node) => node.textContent),
    ).toEqual(["2", "1"]);
  });

  it("ranks a transposed benchmark row across its model columns", () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<table>
        <thead>
          <tr><th></th><th>Qwen3.8-Flash-Next</th><th>Qwen3.8-27B</th><th>Qwen3.7-Plus</th><th>DeepSeek-V4</th><th>Claude</th></tr>
        </thead>
        <tbody>
          <tr><td id="params"># Params</td><td>125B</td><td>27B</td><td>397B</td><td>284B</td><td>--</td></tr>
          <tr><td>Agentic coding</td><td>58.7</td><td>42.2</td><td>16.5</td><td>54.4</td><td>--</td></tr>
        </tbody>
      </table>`,
    );
    televizer = new Televizer({ document }).mount();
    televizer.focus(document.querySelector<HTMLElement>("#params")!);
    televizer.setTransform("rank");
    const shadow = document.querySelector("televizer-overlay")!.shadowRoot!;

    expect(
      Array.from(shadow.querySelectorAll(".tv-item-value"), (node) => node.textContent),
    ).toEqual(["3", "4", "1", "2", "--"]);
    expect(shadow.querySelector<HTMLElement>(".tv-rank-note")!.textContent).toBe(
      "Higher is better.",
    );
  });

  it("shows absolute and percentage differences from the best", () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<table data-televizer-rank="lower">
        <thead><tr><th>CDN</th><th id="latency">Virginia TTFB</th></tr></thead>
        <tbody>
          <tr><th scope="row">Adobe</th><td>38 ms</td></tr>
          <tr><th scope="row">Cloudflare</th><td>18 ms</td></tr>
        </tbody>
      </table>`,
    );
    televizer = new Televizer({ document }).mount();
    televizer.focus(document.querySelector<HTMLElement>("#latency")!);
    const shadow = document.querySelector("televizer-overlay")!.shadowRoot!;

    document.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "l", code: "KeyL" }),
    );
    televizer.setTransform("difference");
    expect(
      Array.from(shadow.querySelectorAll(".tv-item-value"), (node) => node.textContent),
    ).toEqual(["+20ms", "--"]);
    expect(
      shadow.querySelector<HTMLElement>(".tv-comparison-baseline")!.textContent,
    ).toBe("vs 18ms");

    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        code: "Digit5",
        key: "5",
      }),
    );
    expect(televizer.getState().transform).toBe("percent");
    expect(
      Array.from(shadow.querySelectorAll(".tv-item-value"), (node) => node.textContent),
    ).toEqual(["+111%", "0%"]);

    televizer.setTransform("values");
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        code: "Digit5",
        key: "%",
        shiftKey: true,
      }),
    );
    expect(televizer.getState().transform).toBe("percent");
    expect(
      Array.from(shadow.querySelectorAll(".tv-item-value"), (node) => node.textContent),
    ).toEqual(["+111%", "0%"]);
  });

  it("shows positive row gaps above lower-is-better column winners", () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<table>
        <thead><tr><th>CDN</th><th>Virginia TTFB</th><th>Oregon TTFB</th><th>Frankfurt TTFB</th><th>Sydney TTFB</th></tr></thead>
        <tbody>
          <tr><th scope="row">Adobe</th><td>38 ms</td><td>74 ms</td><td>112 ms</td><td>184 ms</td></tr>
          <tr><th scope="row">Stripo</th><td>67 ms</td><td>48 ms</td><td>91 ms</td><td>152 ms</td></tr>
          <tr><th scope="row">Cloudflare</th><td>18 ms</td><td>26 ms</td><td>34 ms</td><td>61 ms</td></tr>
          <tr><th id="fastly" scope="row">Fastly</th><td>29 ms</td><td>31 ms</td><td>46 ms</td><td>72 ms</td></tr>
        </tbody>
      </table>`,
    );
    televizer = new Televizer({ document }).mount();
    televizer.focus(document.querySelector<HTMLElement>("#fastly")!);
    televizer.setTransform("difference");
    document.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "L", code: "KeyL" }),
    );
    const shadow = document.querySelector("televizer-overlay")!.shadowRoot!;

    expect(
      Array.from(shadow.querySelectorAll(".tv-item-baseline"), (node) => node.textContent),
    ).toEqual(["vs 18ms", "vs 26ms", "vs 34ms", "vs 61ms"]);
    expect(
      Array.from(shadow.querySelectorAll(".tv-item-value"), (node) => node.textContent),
    ).toEqual(["+11ms", "+5ms", "+12ms", "+11ms"]);
  });

  it("compacts byte quantities in the gap presentation", () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<table data-televizer-rank="higher">
        <thead><tr><th>CDN</th><th id="capacity">Transfer capacity</th></tr></thead>
        <tbody>
          <tr><th scope="row">Adobe</th><td>14000000000000 B</td></tr>
          <tr><th scope="row">Cloudflare</th><td>10000000000000 B</td></tr>
        </tbody>
      </table>`,
    );
    televizer = new Televizer({ document }).mount();
    televizer.focus(document.querySelector<HTMLElement>("#capacity")!);
    televizer.setTransform("difference");
    const shadow = document.querySelector("televizer-overlay")!.shadowRoot!;

    expect(
      shadow.querySelector<HTMLElement>(".tv-comparison-baseline")!.textContent,
    ).toBe("vs 14TB");
    expect(
      Array.from(shadow.querySelectorAll(".tv-item-value"), (node) => node.textContent),
    ).toEqual(["--", "−4TB"]);
  });

  it("renders an image in the media zoom panel", () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<figure data-televizer-label="Gap comparison" data-televizer-context="A focused table comparison.">
        <img id="gap-image" src="/gap.png" alt="Gap comparison view" />
      </figure>`,
    );
    televizer = new Televizer({ document }).mount();
    televizer.focus(document.querySelector<HTMLElement>("#gap-image")!);
    const shadow = document.querySelector("televizer-overlay")!.shadowRoot!;

    expect(
      shadow.querySelector<HTMLElement>(".tv-panel")!.dataset.kind,
    ).toBe("media");
    expect(
      shadow.querySelector<HTMLImageElement>("img.tv-media-content")!.src,
    ).toBe("http://localhost:3000/gap.png");
    expect(
      shadow.querySelector<HTMLElement>(".tv-media-caption")!.textContent,
    ).toBe("A focused table comparison.");
    expect(
      (document.querySelector("televizer-overlay") as HTMLElement).style
        .pointerEvents,
    ).toBe("none");
  });

  it("renders a whole chart with a pointer magnifier", () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<figure id="chart" data-televizer-type="chart" data-televizer-label="Agent performance">
        <figcaption>Benchmark scores</figcaption><div><strong>64</strong></div>
      </figure>`,
    );
    televizer = new Televizer({ document }).mount();
    televizer.focus(document.querySelector<HTMLElement>("#chart")!);
    const shadow = document.querySelector("televizer-overlay")!.shadowRoot!;

    expect(shadow.querySelector<HTMLElement>(".tv-panel")!.dataset.kind).toBe(
      "chart",
    );
    expect(
      shadow.querySelector<HTMLElement>(".tv-chart-main")!.textContent,
    ).toContain("Benchmark scores");
    expect(shadow.querySelector(".tv-chart-lens")).not.toBeNull();
    expect(
      shadow.querySelector<HTMLElement>(".tv-scope")!.textContent,
    ).toBe("chart · zoom");
  });

  it("preserves the chart page backdrop for inherited SVG colors", () => {
    document.body.style.backgroundColor = "rgb(2, 11, 14)";
    document.body.insertAdjacentHTML(
      "beforeend",
      `<figure id="dark-chart" data-televizer-type="chart">
        <svg><text fill="currentColor">60%</text></svg>
      </figure>`,
    );
    const chart = document.querySelector<HTMLElement>("#dark-chart")!;
    Object.defineProperty(chart, "getBoundingClientRect", {
      configurable: true,
      value: () => new DOMRect(100, 100, 640, 360),
    });
    televizer = new Televizer({ document }).mount();
    televizer.focus(chart);
    const frame = document
      .querySelector("televizer-overlay")!
      .shadowRoot!.querySelector<HTMLElement>(".tv-chart-frame")!;

    expect(frame.style.getPropertyValue("--tv-chart-background")).toBe(
      "rgb(2, 11, 14)",
    );
  });

  it("switches a misclassified visualization to chart zoom with Z", () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div id="visualization" data-televizer-target data-televizer-label="Terminal-Bench Science 0.1">
        <svg id="generic-plot"><g><text>$0 $10 55% 60% Accuracy API Cost</text></g></svg>
      </div>`,
    );
    const visualization = document.querySelector<HTMLElement>("#visualization")!;
    const plot = document.querySelector<SVGElement>("#generic-plot")!;
    [visualization, plot].forEach((element) => {
      Object.defineProperty(element, "getBoundingClientRect", {
        configurable: true,
        value: () => new DOMRect(100, 100, 640, 360),
      });
    });
    televizer = new Televizer({ document }).mount();
    televizer.focus(visualization);
    const shadow = document.querySelector("televizer-overlay")!.shadowRoot!;
    expect(shadow.querySelector<HTMLElement>(".tv-panel")!.dataset.kind).toBe(
      "element",
    );

    document.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "z", code: "KeyZ" }),
    );

    expect(shadow.querySelector<HTMLElement>(".tv-panel")!.dataset.kind).toBe(
      "chart",
    );
    expect(
      shadow.querySelector<HTMLElement>(".tv-scope")!.textContent,
    ).toBe("chart · zoom");
    expect(
      shadow.querySelector<HTMLElement>(".tv-chart-main")!.textContent,
    ).toContain("Accuracy API Cost");
  });

  it("moves the chart lens and relays hover to the source chart", () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<figure id="chart" data-televizer-type="chart" data-televizer-label="Agent performance">
        <div id="plot">64</div>
      </figure>`,
    );
    const chart = document.querySelector<HTMLElement>("#chart")!;
    Object.defineProperty(chart, "getBoundingClientRect", {
      configurable: true,
      value: () => new DOMRect(100, 100, 400, 200),
    });
    let relayedPoint: { x: number; y: number } | null = null;
    chart.addEventListener("mousemove", (event) => {
      const mouse = event as MouseEvent;
      relayedPoint = { x: mouse.clientX, y: mouse.clientY };
    });

    televizer = new Televizer({ document }).mount();
    televizer.focus(chart);
    const shadow = document.querySelector("televizer-overlay")!.shadowRoot!;
    const frame = shadow.querySelector<HTMLElement>(".tv-chart-frame")!;
    const lens = shadow.querySelector<HTMLElement>(".tv-chart-lens")!;
    Object.defineProperties(frame, {
      clientWidth: { configurable: true, value: 800 },
      clientHeight: { configurable: true, value: 400 },
      getBoundingClientRect: {
        configurable: true,
        value: () => new DOMRect(200, 150, 800, 400),
      },
    });

    frame.dispatchEvent(
      new MouseEvent("pointermove", {
        bubbles: true,
        composed: true,
        clientX: 600,
        clientY: 350,
      }),
    );

    expect(relayedPoint).toEqual({ x: 300, y: 200 });
    expect(lens.style.left).toBe("288px");
  });

  it("compares a row cell-by-cell against each column's best", () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<table data-televizer-rank="higher">
        <thead><tr><th>Model</th><th>MMLU score</th><th>GPQA score</th></tr></thead>
        <tbody>
          <tr><th id="gpt" scope="row">GPT-5</th><td>89.3</td><td>82.1</td></tr>
          <tr><th scope="row">Gemini</th><td>88.1</td><td>84.8</td></tr>
        </tbody>
      </table>`,
    );
    televizer = new Televizer({ document }).mount();
    televizer.focus(document.querySelector<HTMLElement>("#gpt")!);
    televizer.setTransform("difference");
    const shadow = document.querySelector("televizer-overlay")!.shadowRoot!;

    expect(
      Array.from(
        shadow.querySelectorAll(".tv-item-baseline"),
        (node) => node.textContent,
      ),
    ).toEqual(["vs 89.3", "vs 84.8"]);
    expect(
      Array.from(shadow.querySelectorAll(".tv-item-value"), (node) => node.textContent),
    ).toEqual(["--", "−2.7"]);

    televizer.setTransform("percent");
    expect(
      Array.from(shadow.querySelectorAll(".tv-item-value"), (node) => node.textContent),
    ).toEqual(["0%", "−3.2%"]);
  });

  it("shows a zero row comparison baseline", () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<table data-televizer-rank="higher">
        <thead><tr><th>Model</th><th>Change</th></tr></thead>
        <tbody>
          <tr><th id="flat" scope="row">Flat</th><td>0</td></tr>
          <tr><th scope="row">Down</th><td>−1.2</td></tr>
        </tbody>
      </table>`,
    );
    televizer = new Televizer({ document }).mount();
    televizer.focus(document.querySelector<HTMLElement>("#flat")!);
    televizer.setTransform("difference");
    const shadow = document.querySelector("televizer-overlay")!.shadowRoot!;

    expect(
      shadow.querySelector<HTMLElement>(".tv-item-baseline")!.textContent,
    ).toBe("vs 0");
  });

  it("starts quote intent only after selection drag release", () => {
    vi.useFakeTimers();
    document.body.insertAdjacentHTML(
      "beforeend",
      `<p id="copy">The source order always remains intact.</p>`,
    );
    const copy = document.querySelector<HTMLElement>("#copy")!;
    const text = copy.firstChild!;
    const range = document.createRange();
    range.setStart(text, 4);
    range.setEnd(text, 16);
    Object.defineProperty(range, "getBoundingClientRect", {
      configurable: true,
      value: () => new DOMRect(40, 40, 120, 20),
    });
    const selection = document.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    const originalElementFromPoint = document.elementFromPoint;
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: () => copy,
    });
    televizer = new Televizer({ document }).mount();
    televizer.start();
    copy.dispatchEvent(
      new MouseEvent("pointerdown", {
        bubbles: true,
        button: 0,
        buttons: 1,
        clientX: 40,
        clientY: 50,
      }),
    );
    copy.dispatchEvent(
      new MouseEvent("pointermove", {
        bubbles: true,
        buttons: 1,
        clientX: 160,
        clientY: 50,
      }),
    );
    document.dispatchEvent(new Event("selectionchange"));
    vi.advanceTimersByTime(1050);
    const shadow = document.querySelector("televizer-overlay")!.shadowRoot!;

    expect(shadow.querySelector<HTMLElement>(".tv-stage")!.dataset.visible).not.toBe(
      "true",
    );
    expect(shadow.querySelector<HTMLElement>(".tv-intent")!.dataset.visible).not.toBe(
      "true",
    );

    copy.dispatchEvent(
      new MouseEvent("pointerup", {
        bubbles: true,
        button: 0,
        clientX: 160,
        clientY: 50,
      }),
    );
    expect(shadow.querySelector<HTMLElement>(".tv-intent")!.dataset.visible).toBe(
      "true",
    );
    vi.advanceTimersByTime(1050);

    expect(
      shadow.querySelector<HTMLElement>(".tv-quote-text")!.textContent,
    ).toBe("source order");
    expect(shadow.querySelector<HTMLElement>(".tv-scope")!.textContent).toBe(
      "quote",
    );

    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: originalElementFromPoint,
    });
  });
});
