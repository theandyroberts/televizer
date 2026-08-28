import { describe, expect, it } from "vitest";
import {
  isAutomaticForUrl,
  normalizeSettings,
  sitePatternForUrl,
} from "../src/settings";

describe("sitePatternForUrl", () => {
  it("reduces an HTTP page to an exact-origin match pattern", () => {
    expect(sitePatternForUrl("https://huggingface.co/models?sort=trending")).toBe(
      "https://huggingface.co/*",
    );
  });

  it("keeps ports and rejects browser-controlled schemes", () => {
    expect(sitePatternForUrl("http://127.0.0.1:4173/demo")).toBe(
      "http://127.0.0.1:4173/*",
    );
    expect(sitePatternForUrl("chrome://extensions")).toBeNull();
  });
});

describe("extension settings", () => {
  it("deduplicates and sorts valid site patterns", () => {
    expect(
      normalizeSettings({
        autoEverywhere: false,
        autoSites: [
          "https://z.example/*",
          "not a pattern",
          "https://a.example/*",
          "https://z.example/*",
        ],
      }).autoSites,
    ).toEqual(["https://a.example/*", "https://z.example/*"]);
  });

  it("recognizes global and exact-site automatic access", () => {
    expect(
      isAutomaticForUrl(
        { autoEverywhere: false, autoSites: ["https://example.com/*"] },
        "https://example.com/report",
      ),
    ).toBe(true);
    expect(
      isAutomaticForUrl(
        { autoEverywhere: false, autoSites: ["https://example.com/*"] },
        "https://other.example/report",
      ),
    ).toBe(false);
    expect(
      isAutomaticForUrl(
        { autoEverywhere: true, autoSites: [] },
        "https://other.example/report",
      ),
    ).toBe(true);
  });
});
