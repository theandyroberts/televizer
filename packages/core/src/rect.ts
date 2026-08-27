export function unionRects(elements: HTMLElement[]): DOMRect {
  const rects = elements
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.width > 0 || rect.height > 0);

  if (!rects.length) return new DOMRect();
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.right));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));
  return new DOMRect(left, top, right - left, bottom - top);
}

export function normalizedText(element?: Element | null): string {
  return (element?.textContent ?? "").replace(/\s+/g, " ").trim();
}
