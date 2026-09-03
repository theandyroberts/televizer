import { describe, expect, it } from "vitest";
import { governQuote } from "../src/quote";

describe("governQuote", () => {
  it("preserves short quotes and normalizes their whitespace", () => {
    expect(governQuote("  Make\nmeaning   visible. ")).toEqual({
      text: "Make meaning visible.",
      truncated: false,
      wordCount: 3,
    });
  });

  it("preserves a quote at the word limit", () => {
    const quote = Array.from({ length: 24 }, (_, index) => `word${index + 1}`).join(
      " ",
    );
    expect(governQuote(quote).text).toBe(quote);
    expect(governQuote(quote).truncated).toBe(false);
  });

  it("prefers a natural punctuation break", () => {
    const quote =
      "One two three four five six seven eight nine ten eleven twelve, thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twenty-one twenty-two twenty-three twenty-four twenty-five.";
    expect(governQuote(quote).text).toBe(
      "One two three four five six seven eight nine ten eleven twelve\u2026",
    );
  });

  it("falls back to 24 words and uses a real ellipsis", () => {
    const quote = Array.from({ length: 30 }, (_, index) => `word${index + 1}`).join(
      " ",
    );
    const governed = governQuote(quote);
    expect(governed.wordCount).toBe(24);
    expect(governed.text.endsWith("\u2026")).toBe(true);
    expect(governed.text.split(" ")).toHaveLength(24);
  });
});
