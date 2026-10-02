// Lucide outlines, inlined so the page has no icon dependency.
const svg = (body, extra = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${body}</svg>`

export const icons = {
  play: svg(`<polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none"/>`),
  pause: svg(`<rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/><rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none"/>`),
  x: svg(`<path d="M18 6 6 18"/><path d="m6 6 12 12"/>`),
  chevronLeft: svg(`<path d="m15 18-6-6 6-6"/>`),
  chevronRight: svg(`<path d="m9 18 6-6-6-6"/>`),
  check: svg(`<path d="M20 6 9 17l-5-5"/>`),
  scissors: svg(`<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>`),
  zoomIn: svg(`<circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/>`),
  wand: svg(`<path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/>`),
  undo: svg(`<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>`),
  arrowLeftToLine: svg(`<path d="M3 19V5"/><path d="m13 6-6 6 6 6"/><path d="M7 12h14"/>`),
  arrowRightToLine: svg(`<path d="M17 12H3"/><path d="m11 18 6-6-6-6"/><path d="M21 5v14"/>`),
  audioLines: svg(`<path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/>`),
}

export function icon(name, cls) {
  const t = document.createElement("template")
  t.innerHTML = icons[name].trim()
  const el = t.content.firstChild
  if (cls) el.setAttribute("class", cls)
  return el
}
