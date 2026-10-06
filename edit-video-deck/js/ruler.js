import { h, rafCoalesce } from "./util.js"

const STEPS = [0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600]

function pickStep(pxPerSec, minTickPx, minLabelPx) {
  let tick = STEPS[STEPS.length - 1]
  for (const s of STEPS) {
    if (s * pxPerSec >= minTickPx) {
      tick = s
      break
    }
  }
  let label = tick
  for (const s of STEPS) {
    if (s >= tick && s * pxPerSec >= minLabelPx && Number.isInteger(Math.round((s / tick) * 1000) / 1000)) {
      label = s
      break
    }
  }
  return { tick, label }
}

export function fmtTick(t, step) {
  const m = Math.floor(t / 60)
  const s = t - m * 60
  if (step >= 1) return `${m}:${String(Math.round(s)).padStart(2, "0")}`
  const digits = step >= 0.1 ? 1 : 2
  return `${m}:${s.toFixed(digits).padStart(3 + digits, "0")}`
}

/**
 * A time ruler as DOM, re-laid on every window change: when the strip zooms,
 * the ticks visibly slide apart and the labels change from seconds to tenths.
 * Minor ticks every `tick`, labelled ticks every `label`.
 */
export function createRuler(strip, { className = "", minTickPx = 8, minLabelPx = 56 } = {}) {
  const el = h(`div.ruler${className ? "." + className : ""}`, { "aria-hidden": "true" })
  const paint = () => {
    const w = strip.window()
    const span = w.e - w.s
    const width = strip.width()
    if (!(span > 0) || width < 2) return
    const pxPerSec = width / span
    const { tick, label } = pickStep(pxPerSec, minTickPx, minLabelPx)
    const first = Math.ceil(w.s / tick - 1e-9) * tick
    const nodes = []
    for (let t = first; t <= w.e + 1e-9; t += tick) {
      const tt = Math.round(t * 1000) / 1000
      const x = ((tt - w.s) / span) * 100
      const isLabel = Math.abs(tt / label - Math.round(tt / label)) < 1e-6
      const node = h(`i${isLabel ? ".major" : ""}`, { style: { left: `${x}%` } })
      if (isLabel) node.append(h("b", fmtTick(tt, label)))
      nodes.push(node)
    }
    el.replaceChildren(...nodes)
    el.dataset.tick = String(tick)
    el.dataset.label = String(label)
  }
  const scheduled = rafCoalesce(paint)
  const off = strip.onWindow(() => scheduled())
  const ro = new ResizeObserver(() => scheduled())
  ro.observe(strip.el)
  paint()
  return {
    el,
    paint,
    destroy() {
      off()
      ro.disconnect()
      scheduled.cancel()
      el.remove()
    },
  }
}
