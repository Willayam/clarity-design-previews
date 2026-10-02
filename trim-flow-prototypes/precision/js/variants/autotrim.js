import { createStrip, createTrimOverlay } from "../strip.js"
import { buildStandardDock, kbd } from "../ui.js"
import { fmtCs, h, startDrag, tween } from "../util.js"
import { icon } from "../icons.js"

const PAD_BEFORE = 0.25
const PAD_AFTER = 0.4
const MERGE_GAP = 0.6

/**
 * Captions find the dead air; one click trims to speech. The speech map on
 * the strip stays, and handles snap to speech edges while dragging.
 */
export const autotrim = {
  id: "F",
  label: "Auto trim to speech",
  subtitle: "Dead air detected from captions, one click to cut it, snapping after",
  mount(ctx) {
    const words = ctx.source.transcript.words
    const segments = []
    for (const w of words) {
      const last = segments[segments.length - 1]
      if (last && w.s - last.e < MERGE_GAP) last.e = Math.max(last.e, w.e)
      else segments.push({ s: w.s, e: w.e })
    }
    const suggestion = () => ({
      start: Math.max(0, segments[0].s - PAD_BEFORE),
      end: Math.min(ctx.duration, segments[segments.length - 1].e + PAD_AFTER),
    })

    const strip = createStrip({ frames: ctx.frames, duration: ctx.duration, mode: "equal16", height: 64 })
    const dock = buildStandardDock(ctx, {
      strip,
      hint: ["Blue is speech. Handles snap to speech edges; hold ", kbd("alt"), " to drag freely."],
    })
    const map = h("div.speech-map")
    const paintMap = () => {
      map.replaceChildren(
        ...segments.map((seg) => h("i", { style: { left: `${(seg.s / ctx.duration) * 100}%`, width: `${Math.max(0.15, ((seg.e - seg.s) / ctx.duration) * 100)}%` } })),
      )
    }
    paintMap()
    strip.el.append(map)

    let cancelAnim = null
    const overlay = createTrimOverlay(strip, ctx.store, {
      onHandleDown(which, e, el) {
        ctx.store.setActive(which)
        const targets = which === "start"
          ? segments.map((s) => Math.max(0, s.s - PAD_BEFORE))
          : segments.map((s) => Math.min(ctx.duration, s.e + PAD_AFTER))
        startDrag(e, el, {
          onMove: (ev) => {
            let t = strip.timeAt(ev.clientX)
            let snapped = false
            if (!ev.altKey) {
              const radius = 5 * strip.spp()
              let best = null
              for (const target of targets) {
                const d = Math.abs(target - t)
                if (d < radius && (best === null || d < Math.abs(best - t))) best = target
              }
              if (best !== null) {
                t = best
                snapped = true
              }
            }
            el.classList.toggle("snap-flash", snapped)
            ctx.store.setHandle(which, t)
          },
          onEnd: () => {
            el.classList.remove("snap-flash")
            ctx.store.setActive(null)
          },
        })
      },
    })

    const banner = h("div.suggest")
    const render = (applied) => {
      const sug = suggestion()
      const lead = sug.start
      const tail = ctx.duration - sug.end
      banner.classList.toggle("applied", applied)
      if (!applied) {
        banner.replaceChildren(
          icon("audioLines"),
          h("div.text",
            h("b", `Dead air found: ${lead.toFixed(1)} s before the first word and ${tail.toFixed(1)} s after the last.`),
            h("small", `From the captions. Trimming keeps ${fmtCs(sug.start)} to ${fmtCs(sug.end)}, a ${fmtCs(sug.end - sug.start)} clip.`),
          ),
          h("button.btn.sm.mark", { type: "button", onclick: () => apply(sug) }, "Trim dead air"),
          h("button.btn.sm.ghost", { type: "button", onclick: () => banner.remove() }, "Keep everything"),
        )
      } else {
        banner.replaceChildren(
          icon("check"),
          h("div.text",
            h("b", `Trimmed to speech: ${lead.toFixed(1)} s cut at the start, ${tail.toFixed(1)} s at the end.`),
            h("small", "Drag a handle to adjust. It snaps to the nearest speech edge."),
          ),
          h("button.btn.sm.ghost", { type: "button", onclick: () => {
            cancelAnim?.()
            ctx.store.setRange(0, ctx.duration, { preview: false })
            render(false)
          } }, icon("undo"), "Undo"),
        )
      }
    }
    const apply = (sug) => {
      cancelAnim?.()
      const from = [ctx.store.state.start, ctx.store.state.end]
      cancelAnim = tween({
        from,
        to: [sug.start, sug.end],
        duration: 380,
        onUpdate: ([s, e]) => ctx.store.setRange(s, e, { preview: false }),
        onDone: () => {
          cancelAnim = null
          ctx.store.setRange(sug.start, sug.end, { preview: true, which: "start" })
          render(true)
        },
      })
    }
    render(false)
    ctx.dock.prepend(banner)
    const offDur = ctx.onDuration((d) => {
      strip.setDuration(d)
      paintMap()
      if (!banner.classList.contains("applied")) render(false)
    })

    return {
      apply: () => apply(suggestion()),
      measure: () => ({ trackWidth: +strip.width().toFixed(1), secondsPerPixel: +strip.spp().toFixed(4), suggestion: suggestion(), segments: segments.length }),
      destroy() {
        cancelAnim?.()
        offDur()
        overlay.destroy()
        dock.destroy()
        strip.destroy()
        banner.remove()
      },
    }
  },
}
