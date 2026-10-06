import { clamp, round3 } from "./util.js"

export const MIN_PREVIEW = 1
export const MAX_PREVIEW = 8
export const DEFAULT_PREVIEW = 3

/**
 * The preview a Journey Page shows before the video plays: a moving range
 * (1 to 8 s, the animated GIF) or one still frame, both inside the trim.
 * Mirrors VideoPreviewPicker's PreviewSelection: { mode, range, thumbnailTime }.
 */
export function defaultPreview(bounds) {
  const len = clamp(DEFAULT_PREVIEW, MIN_PREVIEW, Math.max(MIN_PREVIEW, bounds.end - bounds.start))
  return {
    mode: "moving",
    start: round3(bounds.start),
    end: round3(Math.min(bounds.end, bounds.start + len)),
    still: round3(bounds.start + Math.min(1.5, (bounds.end - bounds.start) / 2)),
  }
}

export function clampPreview(p, bounds) {
  const span = Math.max(MIN_PREVIEW, Math.min(MAX_PREVIEW, p.end - p.start))
  const start = clamp(p.start, bounds.start, Math.max(bounds.start, bounds.end - span))
  const end = clamp(start + span, start + Math.min(MIN_PREVIEW, bounds.end - start), bounds.end)
  return { mode: p.mode, start: round3(start), end: round3(end), still: round3(clamp(p.still, bounds.start, bounds.end)) }
}

export function previewsEqual(a, b) {
  if (!a || !b) return a === b
  return a.mode === b.mode && Math.abs(a.start - b.start) < 0.005 && Math.abs(a.end - b.end) < 0.005 && Math.abs(a.still - b.still) < 0.005
}

/** Drags one edge of the moving range, or the whole range, within the bounds. */
export function movePreview(p, which, t, bounds) {
  if (which === "start") {
    const start = clamp(t, bounds.start, p.end - MIN_PREVIEW)
    return clampPreview({ ...p, start: Math.max(start, p.end - MAX_PREVIEW) }, bounds)
  }
  if (which === "end") {
    const end = clamp(t, p.start + MIN_PREVIEW, bounds.end)
    return clampPreview({ ...p, end: Math.min(end, p.start + MAX_PREVIEW) }, bounds)
  }
  if (which === "still") return clampPreview({ ...p, still: t }, bounds)
  const span = p.end - p.start
  const start = clamp(t, bounds.start, bounds.end - span)
  return clampPreview({ ...p, start, end: start + span }, bounds)
}
