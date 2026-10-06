import { clamp, fmtWhole, h, on, rafCoalesce } from "./util.js"
import { icon } from "./icons.js"

export function createPlayButton(ctx, { className = "btn.ghost.icon", size } = {}) {
  const btn = h(`button.${className}`, { type: "button", "aria-label": "Play", "data-action": "play" }, icon("play"))
  if (size) btn.classList.add(size)
  const sync = () => {
    const playing = !ctx.player.paused
    btn.replaceChildren(icon(playing ? "pause" : "play"))
    btn.setAttribute("aria-label", playing ? "Pause" : "Play")
  }
  const offs = [ctx.player.on("play", sync), ctx.player.on("pause", sync), ctx.player.on("ended", sync), on(btn, "click", () => ctx.togglePlay())]
  sync()
  return {
    el: btn,
    destroy() {
      for (const off of offs) off()
    },
  }
}

/** "0:04 / 3:02": the playhead inside the trimmed clip, then the clip length. */
export function createClock(ctx) {
  const now = h("span.now.tnum", "0:00")
  const total = h("span.total.tnum", "0:00")
  const el = h("span.clock", now, h("span.sep", " / "), total)
  const update = () => {
    const s = ctx.store.state
    now.textContent = fmtWhole(clamp(s.playhead - s.start, 0, s.end - s.start))
    total.textContent = fmtWhole(s.end - s.start)
  }
  const sched = rafCoalesce(update)
  const off = ctx.store.subscribe(() => sched())
  update()
  return {
    el,
    destroy() {
      off()
      sched.cancel()
    },
  }
}

/** Lets the pointer scrub the playhead on a strip's empty area (not on a handle). */
export function seekOnTrack(ctx, strip) {
  return on(strip.el, "pointerdown", (e) => {
    if (e.button !== 0) return
    if (e.target.closest(".handle, .prange, .pstill, button")) return
    e.preventDefault()
    ctx.seekPlayhead(strip.timeAt(e.clientX))
  })
}
