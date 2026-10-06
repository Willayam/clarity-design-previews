import { h } from "./util.js"

/** WIL-3191: the auto-trim keeps first word minus 400 ms to last word plus 750 ms. */
export const PAD_BEFORE = 0.4
export const PAD_AFTER = 0.75
export const MERGE_GAP = 0.6
export const SNAP_PX = 5
const WORDS_BELOW = 30

/** Speech segments from word timings; bracketed caption tags such as [Music] are not speech. */
export function speechSegments(words) {
  const segments = []
  for (const w of words) {
    if (w.tag) continue
    const last = segments[segments.length - 1]
    if (last && w.s - last.e < MERGE_GAP) last.e = Math.max(last.e, w.e)
    else segments.push({ s: w.s, e: w.e })
  }
  return segments
}

export function createSpeech({ words, duration }) {
  const segments = speechSegments(words)
  const spoken = words.filter((w) => !w.tag)
  const autoTrim = {
    start: Math.max(0, segments[0].s - PAD_BEFORE),
    end: Math.min(duration, segments[segments.length - 1].e + PAD_AFTER),
  }
  const targetsFor = (which) =>
    which === "start"
      ? segments.map((s) => Math.max(0, s.s - PAD_BEFORE))
      : segments.map((s) => Math.min(duration, s.e + PAD_AFTER))

  return {
    segments,
    words: spoken,
    autoTrim,
    wordsBetween(s, e) {
      return spoken.filter((w) => w.e > s && w.s < e)
    },
    /** Snaps a mapped time to the nearest padded speech edge within SNAP_PX pixels, never more than 2.5 s. */
    snap(which, t, ev, spp) {
      if (ev?.altKey) return { t, snapped: false }
      const radius = Math.min(SNAP_PX * spp, Math.max(2.5, spp))
      let best = null
      for (const target of targetsFor(which)) {
        const d = Math.abs(target - t)
        if (d < radius && (best === null || d < Math.abs(best - t))) best = target
      }
      return best === null ? { t, snapped: false } : { t: best, snapped: true }
    },
  }
}

/**
 * The speech bar under the frames of a strip (blue is speech), and the word
 * labels that appear once the window is narrow enough to read them.
 */
export function createSpeechMap({ strip, speech, words = true, className = "" }) {
  const map = h(`div.speech-map${className ? "." + className : ""}`)
  const chips = words ? h("div.word-chips.hidden") : null
  strip.el.append(map)
  if (chips) strip.el.append(chips)

  const paint = () => {
    const w = strip.window()
    const span = w.e - w.s
    const pct = (t) => ((t - w.s) / span) * 100
    map.replaceChildren(
      ...speech.segments
        .filter((seg) => seg.e > w.s && seg.s < w.e)
        .map((seg) =>
          h("i", {
            style: {
              left: `${Math.max(0, pct(seg.s))}%`,
              width: `${Math.max(0.15, pct(Math.min(seg.e, w.e)) - pct(Math.max(seg.s, w.s)))}%`,
            },
          }),
        ),
    )
    if (!chips) return
    if (span <= WORDS_BELOW) {
      const innerW = Math.max(1, strip.width() - 8)
      const pxPerSec = innerW / span
      let lastEnd = -Infinity
      const list = []
      for (const wd of speech.wordsBetween(w.s, w.e)) {
        const x = (wd.s - w.s) * pxPerSec
        if (x < 0 || x < lastEnd) continue
        list.push(h("span.word", { style: { left: `${pct(wd.s)}%` }, title: `${wd.w} ${wd.s.toFixed(2)} to ${wd.e.toFixed(2)} s` }, wd.w))
        lastEnd = x + wd.w.length * 6.4 + 8
      }
      chips.replaceChildren(...list)
      chips.classList.remove("hidden")
    } else {
      chips.replaceChildren()
      chips.classList.add("hidden")
    }
  }
  paint()
  const off = strip.onWindow(paint)
  return {
    paint,
    destroy() {
      off()
      map.remove()
      chips?.remove()
    },
  }
}
