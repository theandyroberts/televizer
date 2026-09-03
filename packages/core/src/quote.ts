const NATURAL_BREAK = /[.!?;:,—]$/;
const JOINING_WORD = /^(?:and|but|or|because|while|which|that|so|yet)$/i;

export interface GovernedQuote {
  text: string;
  truncated: boolean;
  wordCount: number;
}

/**
 * Turns an arbitrary browser selection into a broadcast-safe quote. The
 * governor preserves short selections and edits longer ones at the nearest
 * natural break before falling back to a hard word limit.
 */
export function governQuote(value: string, maxWords = 24): GovernedQuote {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return { text: "", truncated: false, wordCount: 0 };

  const words = normalized.split(" ");
  if (words.length <= maxWords) {
    return { text: normalized, truncated: false, wordCount: words.length };
  }

  const minimumBreak = Math.min(12, maxWords);
  let cut = maxWords;
  for (let index = maxWords - 1; index >= minimumBreak - 1; index -= 1) {
    if (NATURAL_BREAK.test(words[index] ?? "")) {
      cut = index + 1;
      break;
    }
    if (JOINING_WORD.test(words[index + 1] ?? "")) {
      cut = index + 1;
      break;
    }
  }

  const excerpt = words
    .slice(0, cut)
    .join(" ")
    .replace(/[\s,;:\u2014.]+$/u, "");
  return { text: `${excerpt}\u2026`, truncated: true, wordCount: cut };
}
