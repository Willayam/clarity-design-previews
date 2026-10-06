import { fmtSpan, h, rafCoalesce } from "./util.js"
import { icon } from "./icons.js"

export function spinner() {
  return icon("loader", "spin")
}

export function kbd(text) {
  return h("kbd", text)
}

/** A segmented control: one pressed option, `onChange(value)`. */
export function segmented(options, value, onChange, { className = "" } = {}) {
  const buttons = options.map((o) =>
    h("button", { type: "button", "aria-pressed": String(o.v === value), dataset: { value: o.v }, title: o.title ?? null }, o.icon ? icon(o.icon) : null, o.label),
  )
  const el = h(`div.segmented${className ? "." + className : ""}`, { role: "group" }, ...buttons)
  const set = (v, { silent = false } = {}) => {
    if (v === value) return
    value = v
    for (const b of buttons) b.setAttribute("aria-pressed", String(b.dataset.value === v))
    if (!silent) onChange?.(v)
  }
  for (const b of buttons) b.addEventListener("click", () => set(b.dataset.value))
  return {
    el,
    set,
    get value() {
      return value
    },
  }
}

/**
 * The auto-trim's quiet line, draft model: "Trimmed 25.9 s of silence · Undo".
 * Undo widens the handles to the whole video as a draft; the line then offers
 * the auto-trim back. A hand-adjusted trim offers a reset to the auto-trim.
 */
export function quietLine(ctx, { onChange } = {}) {
  const { session, speech } = ctx
  const el = h("div.quiet-line")
  const paint = () => {
    const auto = speech.autoTrim
    const d = session.trimDraft()
    const isAuto = Math.abs(d.start - auto.start) < 0.0005 && Math.abs(d.end - auto.end) < 0.0005
    const isFull = session.isFull()
    const autoSilence = auto.start + (ctx.duration - auto.end)
    const act = (label, fn, name) => h("button.btn.link.xs", { type: "button", "data-action": name, onclick: () => { fn(); onChange?.() } }, label)
    if (isAuto) {
      el.replaceChildren(icon("sparkles"), h("span", `Trimmed ${fmtSpan(autoSilence)} of silence`), h("span.dot", "·"), act("Undo", () => session.restoreFull(), "undo-auto"))
    } else if (isFull) {
      el.replaceChildren(icon("audioLines"), h("span", "Whole video kept"), h("span.dot", "·"), act(`Trim ${fmtSpan(autoSilence)} of silence`, () => session.reapplyAuto(), "redo-auto"))
    } else {
      el.replaceChildren(icon("scissors"), h("span", `Trimmed ${fmtSpan(session.draftSilence())}, adjusted by hand`), h("span.dot", "·"), act("Back to auto", () => session.reapplyAuto(), "redo-auto"))
    }
  }
  const sched = rafCoalesce(paint)
  const off = ctx.store.subscribe(() => sched())
  paint()
  return {
    el,
    paint,
    destroy() {
      off()
      sched.cancel()
    },
  }
}

/** "Trim changed · saves on Done", or nothing, for the draft-model variants. */
export function saveNote(ctx, { suffix = "saves on Done" } = {}) {
  const el = h("span.save-note")
  const paint = () => {
    const s = ctx.session
    if (s.state.save === "saving") {
      el.replaceChildren(spinner(), "Saving…")
      el.dataset.state = "saving"
      return
    }
    const parts = []
    if (s.trimDirty()) parts.push("Trim")
    if (s.previewDirty()) parts.push("preview")
    if (!parts.length) {
      el.replaceChildren()
      el.dataset.state = "clean"
      return
    }
    const what = parts.join(" and ")
    el.replaceChildren(h("i.dirty-dot"), `${what.charAt(0).toUpperCase()}${what.slice(1)} changed · ${suffix}`)
    el.dataset.state = "dirty"
  }
  const sched = rafCoalesce(paint)
  const offs = [ctx.store.subscribe(() => sched()), ctx.session.subscribe(() => sched())]
  paint()
  return {
    el,
    destroy() {
      for (const off of offs) off()
      sched.cancel()
    },
  }
}

export function snapTransform(speech) {
  return (which, t, ev, info) => {
    const r = speech.snap(which, t, ev, info.spp)
    info.el?.classList.toggle("snap-flash", r.snapped)
    return r.t
  }
}

/** Arrow keys on a focused trim handle nudge it a frame (shift: a second). Returns true when handled. */
export function nudgeHandles(ctx, e) {
  const el = document.activeElement
  if (!el?.classList?.contains("handle")) return false
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return false
  const which = el.classList.contains("start") ? "start" : "end"
  const step = (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 1 : 1 / ctx.fps)
  ctx.store.setHandle(which, ctx.store.state[which] + step)
  return true
}
