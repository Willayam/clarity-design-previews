import { createStrip, createTrimOverlay } from "../strip.js"
import { buildStandardDock, kbd } from "../ui.js"
import { h, startDrag } from "../util.js"

const BANDS = [
  { upTo: 40, factor: 1, name: "Full speed" },
  { upTo: 100, factor: 0.5, name: "Half speed" },
  { upTo: 170, factor: 0.25, name: "Quarter speed" },
  { upTo: Infinity, factor: 0.05, name: "Fine scrubbing (1/20)" },
]

/**
 * iOS-style scrubbing: the further the pointer drifts above or below the
 * strip, the less each horizontal pixel moves the handle.
 */
export const finescrub = {
  id: "A",
  label: "Fine scrub by drag distance",
  subtitle: "Pull away from the strip to slow the handle down",
  mount(ctx) {
    const strip = createStrip({ frames: ctx.frames, duration: ctx.duration, mode: "equal16", height: 64 })
    const dock = buildStandardDock(ctx, {
      strip,
      hint: ["Drag a handle, then move the pointer up or down to slow it: full, half, quarter, fine."],
    })
    const bands = h("div.speed-bands", { style: { display: "none" } })
    const speedLabel = h("div.speed-label", { style: { display: "none" } })
    document.body.append(bands, speedLabel)

    const bandFor = (dy) => BANDS.find((b) => Math.abs(dy) < b.upTo)

    const layoutBands = (centerY) => {
      bands.replaceChildren()
      const edges = [
        { off: 40, label: "half" },
        { off: 100, label: "quarter" },
        { off: 170, label: "fine" },
      ]
      for (const sign of [-1, 1]) {
        for (const e of edges) {
          const line = h("div.band", { dataset: { off: e.off }, style: { top: `${centerY + sign * e.off}px` } }, h("span", e.label))
          bands.append(line)
        }
      }
    }

    let measureLast = null
    const overlay = createTrimOverlay(strip, ctx.store, {
      onHandleDown(which, e, el) {
        ctx.store.setActive(which)
        const rect = strip.rect()
        const centerY = rect.top + rect.height / 2
        const sppFull = strip.spp()
        let lastX = e.clientX
        let time = ctx.store.state[which]
        layoutBands(centerY)
        bands.style.display = ""
        speedLabel.style.display = ""
        const paint = (ev, band) => {
          speedLabel.style.left = `${ev.clientX}px`
          speedLabel.style.top = `${ev.clientY}px`
          speedLabel.innerHTML = `<b>${band.name}</b> · ${(sppFull * band.factor * 1000).toFixed(0)} ms per px`
          for (const line of bands.children) {
            const off = Number(line.dataset.off)
            line.classList.toggle("active", Math.abs(ev.clientY - centerY) >= off && Math.abs(ev.clientY - centerY) < (BANDS.find((b) => b.upTo > off)?.upTo ?? Infinity))
          }
        }
        paint(e, bandFor(0))
        startDrag(e, el, {
          onMove: (ev) => {
            const band = bandFor(ev.clientY - centerY)
            const dx = ev.clientX - lastX
            lastX = ev.clientX
            time += dx * sppFull * band.factor
            time = Math.min(Math.max(time, 0), ctx.duration)
            ctx.store.setHandle(which, time)
            time = ctx.store.state[which]
            measureLast = { band: band.name, factor: band.factor, secondsPerPixel: +(sppFull * band.factor).toFixed(4) }
            paint(ev, band)
          },
          onEnd: () => {
            ctx.store.setActive(null)
            bands.style.display = "none"
            speedLabel.style.display = "none"
          },
        })
      },
    })
    const offDur = ctx.onDuration((d) => strip.setDuration(d))
    return {
      measure: () => ({
        trackWidth: +strip.width().toFixed(1),
        secondsPerPixelFull: +strip.spp().toFixed(4),
        secondsPerPixelFine: +(strip.spp() * 0.05).toFixed(4),
        last: measureLast,
      }),
      destroy() {
        offDur()
        overlay.destroy()
        dock.destroy()
        strip.destroy()
        bands.remove()
        speedLabel.remove()
      },
    }
  },
}
