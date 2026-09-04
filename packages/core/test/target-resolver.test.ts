import { describe, expect, it } from "vitest";
import { TargetResolver } from "../src/target-resolver";

describe("TargetResolver", () => {
  it("accepts site-specific selectors as explicit migration targets", () => {
    document.body.innerHTML = `
      <div class="presentationZoom"><strong id="value">286 ms</strong></div>
    `;
    const resolver = new TargetResolver(420, [".presentationZoom"]);
    const value = document.querySelector("#value");
    expect(resolver.resolve(value)).toBe(
      document.querySelector(".presentationZoom"),
    );
  });

  it("allows a deliberate target inside an otherwise ignored region", () => {
    document.body.innerHTML = `
      <section data-televizer-ignore>
        <div id="command" data-televizer-target><kbd id="key">1</kbd> Ordinal</div>
      </section>
    `;
    const resolver = new TargetResolver();

    expect(resolver.resolve(document.querySelector("#key"))).toBe(
      document.querySelector("#command"),
    );
  });

  it("recognizes image, video, and iframe media without text content", () => {
    document.body.innerHTML = `
      <img id="image" src="/gap.png" alt="Gap comparison" />
      <video id="video" src="/flower.mp4"></video>
      <iframe id="embed" src="https://example.com/embed"></iframe>
    `;
    const resolver = new TargetResolver();
    ["image", "video", "embed"].forEach((id) => {
      const media = document.querySelector<HTMLElement>(`#${id}`)!;
      Object.defineProperty(media, "getBoundingClientRect", {
        configurable: true,
        value: () => new DOMRect(10, 10, 320, 180),
      });
      expect(resolver.resolve(media)).toBe(media);
    });
  });

  it("keeps headings and paragraphs inert unless explicitly targeted", () => {
    document.body.innerHTML = `
      <section id="copy"><h2 id="heading">A heading</h2><p id="paragraph"><strong id="word">Paragraph copy</strong></p></section>
      <p id="explicit" data-televizer-target>Deliberate target</p>
    `;
    const resolver = new TargetResolver();

    expect(resolver.resolve(document.querySelector("#heading"))).toBeNull();
    expect(resolver.resolve(document.querySelector("#word"))).toBeNull();
    expect(resolver.resolve(document.querySelector("#explicit"))).toBe(
      document.querySelector("#explicit"),
    );
  });

  it("promotes an explicit chart above an image or canvas inside it", () => {
    document.body.innerHTML = `
      <figure id="chart" data-televizer-type="chart">
        <figcaption>Benchmark score</figcaption>
        <canvas id="plot"></canvas>
      </figure>
    `;
    const resolver = new TargetResolver();

    expect(resolver.resolve(document.querySelector("#plot"))).toBe(
      document.querySelector("#chart"),
    );
  });

  it("recognizes a large Recharts surface and returns its single-chart card", () => {
    document.body.innerHTML = `
      <div id="card"><h3>DeepSWE score</h3><div class="recharts-wrapper">
        <svg class="recharts-surface" id="plot"><rect id="bar"></rect></svg>
        <div class="recharts-tooltip-wrapper">Kimi · 64</div>
      </div></div>
    `;
    const card = document.querySelector<HTMLElement>("#card")!;
    const plot = document.querySelector<SVGElement>("#plot")!;
    Object.defineProperty(card, "getBoundingClientRect", {
      configurable: true,
      value: () => new DOMRect(10, 10, 820, 520),
    });
    Object.defineProperty(plot, "getBoundingClientRect", {
      configurable: true,
      value: () => new DOMRect(30, 90, 780, 400),
    });
    const resolver = new TargetResolver();

    expect(resolver.resolve(document.querySelector("#bar"))).toBe(card);
  });

  it("recognizes a Vega visualization and keeps its chart title", () => {
    document.body.innerHTML = `
      <div id="chart"><h3>Terminal-Bench Science 0.1</h3>
        <div><div class="vega-embed" role="graphics-document" aria-label="Vega visualization">
          <svg class="marks" id="plot"><g><text id="score">59.3%</text></g></svg>
        </div></div>
      </div>
    `;
    const chart = document.querySelector<HTMLElement>("#chart")!;
    const embed = document.querySelector<HTMLElement>(".vega-embed")!;
    const plot = document.querySelector<SVGElement>("#plot")!;
    [chart, embed, plot].forEach((element) => {
      Object.defineProperty(element, "getBoundingClientRect", {
        configurable: true,
        value: () => new DOMRect(20, 20, 680, 380),
      });
    });
    const resolver = new TargetResolver();

    expect(resolver.resolve(document.querySelector("#score"))).toBe(chart);
  });

  it("recognizes a structured HTML bar chart without chart-specific classes", () => {
    document.body.innerHTML = `
      <div id="chart">
        <div>Humanity's Last Exam</div><div>Pass rate</div>
        <div style="display:flex"><span>Fable 5.1</span><i></i><b id="bar">60.9</b></div>
        <div style="display:flex"><span>Fable 5</span><i></i><b>57.8</b></div>
        <div style="display:flex"><span>Opus 5</span><i></i><b>56.6</b></div>
      </div>
    `;
    const chart = document.querySelector<HTMLElement>("#chart")!;
    Object.defineProperty(chart, "getBoundingClientRect", {
      configurable: true,
      value: () => new DOMRect(20, 20, 680, 380),
    });
    const resolver = new TargetResolver();

    expect(resolver.resolve(document.querySelector("#bar"))).toBe(chart);
  });
});
