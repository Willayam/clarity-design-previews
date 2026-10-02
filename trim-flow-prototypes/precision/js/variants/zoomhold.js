import { createStrip, createTrimOverlay } from "../strip.js"
import { buildStandardDock, kbd } from "../ui.js"
import { clamp, fmtSeconds, h, on, startDrag, tween } from "../util.js"

const HOLD_SPAN = 6
const HOLD_MS = 280
const MIN_SPAN = 1.5

/**
 * Hold a handle still (or drag it slowly) and the strip zooms to a few
 * seconds around it, so each pixel is a few milliseconds. Release zooms back.
 * The wheel zooms and pans too, and that zoom persists.
 */
export const zoomhold = {
  id: "B",
  label: "Zoom on hold",
  subtitle: "Hold a handle still to zoom the strip around it",
  mount(ctx) {
    const strip = createStrip({ frames: ctx.frames, duration: ctx.duration, mode: "grid", height: 64, tileWidth: 56, labels: true, ruler: true })
    const dock = buildStandardDock(ctx, {
      strip,
      hint: ["Grab a handle and hold still to zoom. Scroll to zoom, ", kbd("shift"), " + scroll to pan."],
    })
    const chipText = h("span.text")
    const chipReset = h("button", { type: "button" }, "Reset")
    const chip = h("div.zoom-chip.hidden", chipText, chipReset)
    dock.wrap.append(chip)

    const full = () => ({ s: 0, e: ctx.duration })
    let rest = full()
    let cancelAnim = null
    let holdZoomed = false
    let lastSpp = { full: strip.spp(), zoomed: null }

    const clampWin = (s, e) => {
      const d = ctx.duration
      const span = Math.min(e - s, d)
      if (s < 0) return { s: 0, e: span }
      if (s + span > d) return { s: d - span, e: d }
      return { s, e: s + span }
    }
    const isZoomed = () => strip.span() < ctx.duration - 1e-6
    const updateChip = () => {
      if (!isZoomed()) {
        chip.classList.add("hidden")
        return
      }
      chip.classList.remove("hidden")
      chipText.textContent = `${fmtSeconds(strip.span(), 1)} across · ${(strip.spp() * 1000).toFixed(0)} ms/px`
      chipReset.style.display = holdZoomed ? "none" : ""
      // Keep the chip clear of the tooltip over the handle being dragged.
      const s = ctx.store.state
      const onRight = s.active ? strip.pct(s[s.active]) > 55 : false
      chip.style.left = onRight ? "10px" : ""
      chip.style.right = onRight ? "" : "10px"
    }
    const setWin = (w) => {
      strip.setWindow(w.s, w.e)
      updateChip()
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

    const overlay = createTrimOverlay(strip, ctx.store, {
      edgeChips: true,
      onEdgeChip: (which) => {
        const span = strip.span()
        const t = ctx.store.state[which]
        rest = clampWin(t - span / 2, t + span / 2)
        animateTo(rest, 200)
      },
      onHandleDown(which, e, el) {
        ctx.store.setActive(which)
        const downAt = performance.now()
        let lastX = e.clientX
        let lastY = e.clientY
        let offset = 0
        let zooming = false
        let raf = 0
        const samples = []
        holdZoomed = false
        const mapTime = () => strip.timeAtUnclamped(lastX) + offset
        const zoomIn = () => {
          const span = Math.min(HOLD_SPAN, strip.span())
          if (span >= strip.span() - 1e-6) {
            holdZoomed = true
            updateChip()
            return
          }
          zooming = true
          const rect = strip.rect()
          const frac = clamp((lastX - rect.left) / rect.width, 0, 1)
          const t = ctx.store.state[which]
          const target = clampWin(t - frac * span, t - frac * span + span)
          animateTo(target, 220, () => {
            zooming = false
            holdZoomed = true
            offset = ctx.store.state[which] - strip.timeAtUnclamped(lastX)
            lastSpp.zoomed = strip.spp()
            updateChip()
          })
        }
        const edgePan = () => {
          const r = strip.rect()
          const margin = 10
          let over = 0
          if (lastX > r.right - margin) over = lastX - (r.right - margin)
          else if (lastX < r.left + margin) over = lastX - (r.left + margin)
          if (!over) return
          const rate = (Math.sign(over) * Math.min(Math.abs(over), 120)) / 120
          const dt = (rate * strip.span() * 0.8) / 60
          const w = strip.getWindow()
          const nw = clampWin(w.s + dt, w.e + dt)
          if (Math.abs(nw.s - w.s) < 1e-9) return
          setWin(nw)
          ctx.store.setHandle(which, mapTime())
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
        startDrag(e, el, {
          onMove: (ev) => {
            lastX = ev.clientX
            lastY = ev.clientY
            if (zooming) return
            ctx.store.setHandle(which, mapTime())
          },
          onEnd: () => {
            cancelAnimationFrame(raf)
            ctx.store.setActive(null)
            if (holdZoomed) {
              holdZoomed = false
              animateTo(rest, 200, updateChip)
            }
            updateChip()
          },
        })
      },
    })

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
    chipReset.addEventListener("click", () => {
      rest = full()
      animateTo(rest, 200, updateChip)
    })
    const offDur = ctx.onDuration((d) => {
      strip.setDuration(d)
      rest = full()
      updateChip()
    })
    return {
      measure: () => ({
        trackWidth: +strip.width().toFixed(1),
        secondsPerPixelFull: +(ctx.duration / strip.width()).toFixed(4),
        secondsPerPixelHoldZoom: +(HOLD_SPAN / strip.width()).toFixed(4),
        currentSpan: +strip.span().toFixed(3),
        currentSecondsPerPixel: +strip.spp().toFixed(4),
      }),
      destroy() {
        cancelAnim?.()
        offWheel()
        offDur()
        overlay.destroy()
        dock.destroy()
        strip.destroy()
        chip.remove()
      },
    }
  },
}
