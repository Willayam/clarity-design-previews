import { clamp, on, tween } from "./util.js"

export const HOLD_SPAN = 12
export const HOLD_MS = 280
const MIN_SPAN = 1.5

/**
 * Hold-to-zoom for a grid strip, as the trimmer on feat/auto-trim does it:
 * press a handle and hold still for HOLD_MS and the window shrinks to
 * HOLD_SPAN seconds around the handle, keeping the handle under the pointer so
 * nothing jumps. Release zooms back to the rest window. The wheel zooms and
 * pans, and that zoom persists in `rest`.
 *
 * `transform(which, t, event, info)` may adjust a mapped time before it is
 * applied (speech snapping). `onZoom(state)` reports every change of the
 * window so a variant can paint its own feedback: state is { zoomed, span,
 * spp, phase } with phase one of idle, pressing, zooming, zoomed, releasing.
 */
export function createHoldZoom({ ctx, strip, transform, onZoom }) {
  const full = () => ({ s: 0, e: ctx.duration })
  let rest = full()
  let cancelAnim = null
  let holdZoomed = false
  let phase = "idle"

  const clampWin = (s, e) => {
    const d = ctx.duration
    const span = Math.min(e - s, d)
    if (s < 0) return { s: 0, e: span }
    if (s + span > d) return { s: d - span, e: d }
    return { s, e: s + span }
  }
  const isZoomed = () => strip.span() < ctx.duration - 1e-6
  const report = () => onZoom?.({ zoomed: isZoomed(), span: strip.span(), spp: strip.spp(), phase, window: strip.getWindow() })
  const setPhase = (p) => {
    phase = p
    report()
  }
  const setWin = (w) => {
    strip.setWindow(w.s, w.e)
    report()
  }
  const animateTo = (target, ms, done) => {
    cancelAnim?.()
    const from = strip.getWindow()
    cancelAnim = tween({
      from: [from.s, from.e],
      to: [target.s, target.e],
      duration: ms,
      onUpdate: ([s, e]) => setWin({ s, e }),
      onDone: () => {
        cancelAnim = null
        done?.()
      },
    })
  }
  const apply = (which, t, ev, el) => (transform ? transform(which, t, ev, { zoomed: isZoomed(), spp: strip.spp(), el }) : t)

  const onHandleDown = (which, e, el) => {
    ctx.store.setActive(which)
    const downAt = performance.now()
    const downX = e.clientX
    let lastX = e.clientX
    let lastY = e.clientY
    let lastEvent = e
    let offset = 0
    let zooming = false
    let raf = 0
    const samples = []
    holdZoomed = false
    el.classList.add("holding")
    setPhase("pressing")
    const mapTime = () => strip.timeAtUnclamped(lastX) + offset
    const zoomIn = () => {
      const span = Math.min(HOLD_SPAN, strip.span())
      if (span >= strip.span() - 1e-6) {
        holdZoomed = true
        setPhase("zoomed")
        return
      }
      zooming = true
      el.classList.add("zoomed")
      setPhase("zooming")
      const rect = strip.rect()
      const frac = clamp((lastX - rect.left) / rect.width, 0, 1)
      const t = ctx.store.state[which]
      const target = clampWin(t - frac * span, t - frac * span + span)
      animateTo(target, 320, () => {
        zooming = false
        holdZoomed = true
        offset = ctx.store.state[which] - strip.timeAtUnclamped(lastX)
        setPhase("zoomed")
      })
    }
    const edgePan = () => {
      const r = strip.rect()
      const margin = 10
      // The hold's own spot never pans: a handle that sits inside the margin
      // would otherwise drift the moment the zoom lands.
      const leftEdge = Math.min(r.left + margin, downX - 6)
      const rightEdge = Math.max(r.right - margin, downX + 6)
      let over = 0
      if (lastX > rightEdge) over = lastX - rightEdge
      else if (lastX < leftEdge) over = lastX - leftEdge
      if (!over) return
      const rate = (Math.sign(over) * Math.min(Math.abs(over), 120)) / 120
      const dt = (rate * strip.span() * 0.8) / 60
      const w = strip.getWindow()
      const nw = clampWin(w.s + dt, w.e + dt)
      if (Math.abs(nw.s - w.s) < 1e-9) return
      setWin(nw)
      ctx.store.setHandle(which, apply(which, mapTime(), lastEvent, el))
    }
    const tick = () => {
      const now = performance.now()
      samples.push({ x: lastX, y: lastY, at: now })
      while (samples.length && samples[0].at < now - 500) samples.shift()
      if (!holdZoomed && !zooming && now - downAt >= HOLD_MS) {
        const old = samples.find((s) => s.at <= now - HOLD_MS)
        if (old && Math.hypot(lastX - old.x, lastY - old.y) < 5) zoomIn()
      }
      if (isZoomed() && !zooming) edgePan()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return {
      onMove: (ev) => {
        lastX = ev.clientX
        lastY = ev.clientY
        lastEvent = ev
        if (zooming) return
        ctx.store.setHandle(which, apply(which, mapTime(), ev, el))
      },
      onEnd: () => {
        cancelAnimationFrame(raf)
        el.classList.remove("holding", "zoomed")
        ctx.store.setActive(null)
        if (holdZoomed) {
          holdZoomed = false
          setPhase("releasing")
          animateTo(rest, 260, () => setPhase("idle"))
        } else setPhase("idle")
      },
    }
  }

  const offWheel = on(
    strip.el,
    "wheel",
    (e) => {
      e.preventDefault()
      if (ctx.store.state.dragging) return
      const w = strip.getWindow()
      const span = w.e - w.s
      const rect = strip.rect()
      const zoomGesture = e.ctrlKey || (!e.shiftKey && Math.abs(e.deltaY) >= Math.abs(e.deltaX))
      let nw
      if (zoomGesture) {
        const factor = Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.003))
        const nspan = clamp(span * factor, MIN_SPAN, ctx.duration)
        const tAt = strip.timeAt(e.clientX)
        const frac = clamp((e.clientX - rect.left) / rect.width, 0, 1)
        nw = clampWin(tAt - frac * nspan, tAt - frac * nspan + nspan)
      } else {
        const dx = (e.shiftKey ? e.deltaY : e.deltaX) * strip.spp()
        nw = clampWin(w.s + dx, w.e + dx)
      }
      rest = nw
      setWin(nw)
    },
    { passive: false },
  )
  const offDur = ctx.onDuration((d) => {
    strip.setDuration(d)
    rest = full()
    report()
  })

  return {
    onHandleDown,
    isZoomed,
    holdSpan: HOLD_SPAN,
    get phase() {
      return phase
    },
    reset() {
      rest = full()
      animateTo(rest, 260, report)
    },
    /** Simulates the hold for a scripted check: zooms to HOLD_SPAN around `which` and stays there until release(). */
    holdFor(which) {
      const span = Math.min(HOLD_SPAN, ctx.duration)
      const t = ctx.store.state[which]
      const frac = strip.pct(t) / 100
      ctx.store.setActive(which)
      holdZoomed = true
      setPhase("zooming")
      animateTo(clampWin(t - frac * span, t - frac * span + span), 320, () => setPhase("zoomed"))
    },
    release() {
      ctx.store.setActive(null)
      holdZoomed = false
      setPhase("releasing")
      animateTo(rest, 260, () => setPhase("idle"))
    },
    measure: () => ({
      trackWidth: +strip.width().toFixed(1),
      secondsPerPixelFull: +(ctx.duration / strip.width()).toFixed(4),
      secondsPerPixelHoldZoom: +(HOLD_SPAN / strip.width()).toFixed(4),
      currentSpan: +strip.span().toFixed(3),
      currentSecondsPerPixel: +strip.spp().toFixed(4),
      phase,
    }),
    destroy() {
      cancelAnim?.()
      offWheel()
      offDur()
    },
  }
}
