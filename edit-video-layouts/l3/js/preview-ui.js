import { clamp, fmtWhole, h, on, rafCoalesce, startDrag } from "./util.js"
import { icon } from "./icons.js"
import { MAX_PREVIEW, MIN_PREVIEW, movePreview } from "./preview.js"

/**
 * The preview picker drawn over a host track. A preview is 1 to 8 seconds
 * inside a video of minutes, so on a full-length track it is a few pixels
 * wide: it is drawn as a pin at its start with the span marked beside it, and
 * its length comes from the stepper, not from edge grips. Drag the pin to
 * move the preview; the still frame is the same pin without a span. `map`
 * gives the host's scale: timeAt(clientX) and pct(t).
 */
export function createPreviewOverlay(host, ctx, map) {
  const { session } = ctx
  const boundL = h("div.pbound.left")
  const boundR = h("div.pbound.right")
  const tag = h("button.ptag", { type: "button", "aria-label": "Play the preview", onclick: (e) => { e.stopPropagation(); const p = session.state.preview; if (p.mode === "moving") ctx.playRange(p.start, p.end); else ctx.seekPlayhead(p.still) } }, icon("play"), h("span"))
  const mark = h("div.pmark", { role: "slider", "aria-label": "Preview", tabindex: "0" }, h("i.band"), h("i.pin"), tag)
  const nodes = [boundL, boundR, mark]
  for (const n of nodes) host.append(n)
  let visible = false
  const offs = []

  const paint = () => {
    const p = session.state.preview
    const b = session.bounds()
    const pc = (t) => clamp(map.pct(t), 0, 100)
    boundL.style.width = `${pc(b.start)}%`
    boundR.style.left = `${pc(b.end)}%`
    const moving = p.mode === "moving"
    const at = moving ? p.start : p.still
    mark.style.left = `${pc(at)}%`
    mark.classList.toggle("still", !moving)
    mark.querySelector(".band").style.width = moving ? `${Math.max(0, pc(p.end) - pc(p.start))}%` : "0"
    tag.querySelector("span").textContent = moving ? `${(p.end - p.start).toFixed(0)} s from ${fmtWhole(p.start)}` : `Frame at ${fmtWhole(p.still)}`
    tag.replaceChild(icon(moving ? (ctx.isPlayingRange(p.start, p.end) ? "pause" : "play") : "image"), tag.firstChild)
    // Keep the tag inside the host near the right edge.
    const hostW = host.getBoundingClientRect().width
    const x = (pc(at) / 100) * hostW
    mark.classList.toggle("flip", hostW > 2 && x + tag.offsetWidth + 24 > hostW)
    mark.setAttribute("aria-valuetext", tag.textContent)
  }
  const sched = rafCoalesce(paint)
  offs.push(session.subscribe(() => sched()), ctx.store.subscribe(() => sched()))
  offs.push(ctx.player.on("play", () => sched()), ctx.player.on("pause", () => sched()))
  const ro = new ResizeObserver(() => sched())
  ro.observe(host)
  offs.push(() => ro.disconnect())

  offs.push(
    on(mark, "pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest(".ptag")) return
      e.preventDefault()
      e.stopPropagation()
      mark.focus({ preventScroll: true })
      const p0 = { ...session.state.preview }
      const t0 = map.timeAt(e.clientX)
      const which = p0.mode === "moving" ? "range" : "still"
      const anchor = which === "range" ? p0.start : p0.still
      host.classList.add("pdragging")
      startDrag(e, mark, {
        onMove: (ev) => {
          const t = anchor + (map.timeAt(ev.clientX) - t0)
          session.setPreview(movePreview(session.state.preview, which, t, session.bounds()))
          const p = session.state.preview
          ctx.scrubber.seek(which === "still" ? p.still : p.start)
        },
        onEnd: () => host.classList.remove("pdragging"),
      })
    }),
  )
  offs.push(
    on(mark, "keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
      e.preventDefault()
      const p = session.state.preview
      const step = (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 1 : 0.1)
      const which = p.mode === "moving" ? "range" : "still"
      session.setPreview(movePreview(p, which, (which === "range" ? p.start : p.still) + step, session.bounds()))
    }),
  )

  const setVisible = (v) => {
    visible = v
    for (const n of nodes) n.classList.toggle("off", !v)
    host.classList.toggle("preview-mode", v)
    if (v) paint()
  }
  setVisible(false)
  return {
    paint,
    show: () => setVisible(true),
    hide: () => setVisible(false),
    get visible() {
      return visible
    },
    destroy() {
      for (const off of offs) off()
      sched.cancel()
      for (const n of nodes) n.remove()
    },
  }
}

/** Moving | Still, bound to the session's preview mode. */
export function previewModeToggle(ctx, segmentedFactory, opts) {
  const seg = segmentedFactory(
    [
      { v: "moving", label: "Moving", icon: "film"},
      { v: "still", label: "Still", icon: "image"},
    ],
    ctx.session.state.preview.mode,
    (mode) => {
      const p = ctx.session.state.preview
      ctx.session.setPreview({ ...p, mode })
      ctx.scrubber.seek(mode === "still" ? p.still : p.start)
      opts?.onChange?.(mode)
    },
    opts,
  )
  const off = ctx.session.subscribe((s) => seg.set(s.preview.mode, { silent: true }))
  return {
    el: seg.el,
    destroy() {
      off()
    },
  }
}

/** The moving preview's length, 1 to 8 s, as a stepper. Hidden for a still. */
export function previewLengthStepper(ctx, { onChange } = {}) {
  const value = h("b.tnum")
  const minus = h("button", { type: "button", "aria-label": "Shorter preview" }, "−")
  const plus = h("button", { type: "button", "aria-label": "Longer preview" }, "+")
  const el = h("div.stepper", minus, value, plus)
  const set = (len) => {
    const p = ctx.session.state.preview
    const b = ctx.session.bounds()
    const next = clamp(len, MIN_PREVIEW, Math.min(MAX_PREVIEW, b.end - p.start))
    ctx.session.setPreview({ ...p, end: p.start + next })
    onChange?.()
  }
  minus.addEventListener("click", () => set(Math.round(ctx.session.state.preview.end - ctx.session.state.preview.start) - 1))
  plus.addEventListener("click", () => set(Math.round(ctx.session.state.preview.end - ctx.session.state.preview.start) + 1))
  const paint = () => {
    const p = ctx.session.state.preview
    const len = p.end - p.start
    value.textContent = `${len.toFixed(0)} s`
    minus.disabled = len <= MIN_PREVIEW + 0.01
    plus.disabled = len >= MAX_PREVIEW - 0.01
    el.classList.toggle("hidden", p.mode !== "moving")
  }
  const off = ctx.session.subscribe(paint)
  paint()
  return {
    el,
    destroy() {
      off()
    },
  }
}
