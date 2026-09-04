import { describe, expect, it } from "vitest";
import { overlayStyles } from "../src/overlay-styles";

describe("overlay stacking", () => {
  it("keeps the overlay host as a stacking context", () => {
    const hostRule = overlayStyles.match(/:host\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(overlayStyles).not.toContain("display: contents");
    expect(hostRule).toContain("position: fixed;");
    expect(hostRule).toContain("z-index: 2147483647;");
  });

  it("puts the fixed stage above sticky page content", () => {
    const stageRule = overlayStyles.match(/\.tv-stage\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(stageRule).toContain("position: fixed;");
    expect(stageRule).toContain("z-index: 2147483647;");
  });
});
