import { createStrip, createTrimOverlay } from "../strip.js"
import { buildStandardDock } from "../ui.js"
import { startDrag } from "../util.js"

/** Today's trimmer: pointer x maps linearly over the whole source. */
export const current = {
  id: "0",
  label: "Current",
  subtitle: "Today's trimmer, as a baseline",
  mount(ctx) {
    const strip = createStrip({ frames: ctx.frames, duration: ctx.duration, mode: "equal16", height: 64 })
    const dock = buildStandardDock(ctx, { strip, hint: "Drag a handle. One pixel is a fixed slice of the whole video." })
    const overlay = createTrimOverlay(strip, ctx.store, {
      onHandleDown(which, e, el) {
        ctx.store.setActive(which)
        startDrag(e, el, {
          onMove: (ev) => ctx.store.setHandle(which, strip.timeAt(ev.clientX)),
          onEnd: () => ctx.store.setActive(null),
        })
      },
    })
    const offDur = ctx.onDuration((d) => strip.setDuration(d))
    return {
      measure: () => ({ trackWidth: +strip.width().toFixed(1), secondsPerPixel: +strip.spp().toFixed(4) }),
      destroy() {
        offDur()
        overlay.destroy()
        dock.destroy()
        strip.destroy()
      },
    }
  },
}
