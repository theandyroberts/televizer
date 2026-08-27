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
});
