import { fmtCs, h, on, rafCoalesce } from "./util.js"
import { icon } from "./icons.js"

export function createPlayButton(ctx) {
  const btn = h("button.btn.ghost.icon", { type: "button", "aria-label": "Play preview" }, icon("play"))
  const sync = () => {
    const playing = !ctx.player.paused
    btn.replaceChildren(icon(playing ? "pause" : "play"))
    btn.setAttribute("aria-label", playing ? "Pause preview" : "Play preview")
  }
  const offs = [
    ctx.player.on("play", sync),
    ctx.player.on("pause", sync),
    ctx.player.on("ended", sync),
    on(btn, "click", () => ctx.togglePlay()),
  ]
  sync()
  return {
    el: btn,
    destroy() {
      for (const off of offs) off()
    },
  }
}

/** Done and Cancel as today: stacked beside the strip, or in a row. */
export function createActions({ row = false } = {}) {
  const mk = (label) => h("button.btn.ghost.sm.min-w-19", { type: "button", title: "Inert in the prototype" }, label)
  return h(`div.dock-actions${row ? ".row" : ""}`, mk("Done"), mk("Cancel"))
}

/** Start, end, clip length and playhead to hundredths, live. */
export function createReadout(ctx, { hint } = {}) {
  const mk = (label, cls) => {
    const value = h("span.value.tnum", "00:00.00")
    const item = h(`span.item.${cls}`, h("span.label", label), value)
    return { item, value }
  }
  const start = mk("Start", "start")
  const end = mk("End", "end")
  const clip = mk("Clip", "clip")
  const ph = mk("Playhead", "ph")
  const hintEl = h("span.hint")
  const el = h("div.readout", start.item, end.item, clip.item, ph.item, h("span.spacer"), hintEl)
  const update = () => {
    const s = ctx.store.state
    start.value.textContent = fmtCs(s.start)
    end.value.textContent = fmtCs(s.end)
    clip.value.textContent = fmtCs(s.end - s.start)
    ph.value.textContent = fmtCs(s.playhead)
    const act = s.active || s.focused
    start.item.classList.toggle("active", act === "start")
    end.item.classList.toggle("active", act === "end")
  }
  const sched = rafCoalesce(update)
  const off = ctx.store.subscribe(() => sched())
  update()
  const api = {
    el,
    setHint(content) {
      hintEl.replaceChildren(...[].concat(content ?? []))
    },
    destroy() {
      off()
      sched.cancel()
      el.remove()
    },
  }
  if (hint) api.setHint(hint)
  return api
}

/**
 * Today's dock layout: play button, the track, Done and Cancel stacked at
 * the end, and the shared readout underneath.
 */
export function buildStandardDock(ctx, { strip, hint, actions = createActions(), seekOnTrackClick = true } = {}) {
  const play = createPlayButton(ctx)
  const wrap = h("div.track-wrap", strip.el)
  const trimmer = h("div.trimmer", { "aria-label": "Video trim controls" }, play.el, wrap)
  const row = h("div.dock-row", trimmer, actions)
  const readout = createReadout(ctx, { hint })
  ctx.dock.replaceChildren(row, readout.el)
  const offs = []
  if (seekOnTrackClick) {
    offs.push(
      on(strip.el, "pointerdown", (e) => {
        if (e.button !== 0) return
        e.preventDefault()
        ctx.seekPlayhead(strip.timeAt(e.clientX))
      }),
    )
  }
  return {
    row,
    wrap,
    trimmer,
    readout,
    play,
    destroy() {
      for (const off of offs) off()
      play.destroy()
      readout.destroy()
    },
  }
}

export function kbd(text) {
  return h("kbd", text)
}
