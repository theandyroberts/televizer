import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Televizer } from "../src/televizer";

let televizer: Televizer | null = null;

beforeEach(() => {
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
    expect(help.textContent).toContain("Select text");

    document.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "?", shiftKey: true }),
    );
    expect(help.dataset.visible).toBe("false");
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

    televizer.setTransform("difference");
    expect(
      Array.from(shadow.querySelectorAll(".tv-item-value"), (node) => node.textContent),
    ).toEqual(["−20 ms", "0 ms"]);

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
    ).toEqual(["−111%", "0%"]);
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
    televizer.setTransform("percent");
    const shadow = document.querySelector("televizer-overlay")!.shadowRoot!;

    expect(
      Array.from(shadow.querySelectorAll(".tv-item-value"), (node) => node.textContent),
    ).toEqual(["0%", "−3.2%"]);
  });

  it("lifts selected text as a quote after hover intent", () => {
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
      new MouseEvent("mouseover", {
        bubbles: true,
        clientX: 100,
        clientY: 50,
      }),
    );
    document.dispatchEvent(new Event("selectionchange"));
    vi.advanceTimersByTime(1050);
    const shadow = document.querySelector("televizer-overlay")!.shadowRoot!;

    expect(
      shadow.querySelector<HTMLElement>(".tv-element-title")!.textContent,
    ).toBe("Quote");
    expect(
      shadow.querySelector<HTMLElement>(".tv-element-value")!.textContent,
    ).toBe("source order");

    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: originalElementFromPoint,
    });
  });
});
