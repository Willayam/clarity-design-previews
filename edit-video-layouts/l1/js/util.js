export const clamp = (v, a, b) => Math.min(Math.max(v, a), b)
export const round3 = (v) => Math.round(v * 1000) / 1000
export const lerp = (a, b, k) => a + (b - a) * k
export const easeOutCubic = (k) => 1 - Math.pow(1 - k, 3)

/** mm:ss.cc, the readout format every variant shares. */
export function fmtCs(t) {
  if (!Number.isFinite(t) || t < 0) t = 0
  const cs = Math.round(t * 100)
  const m = Math.floor(cs / 6000)
  const s = Math.floor((cs % 6000) / 100)
  const c = cs % 100
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(c).padStart(2, "0")}`
}

/** Today's tooltip format: mm:ss,cc. */
export function fmtTooltip(t) {
  return fmtCs(t).replace(".", ",")
}

/** m:ss, the dock's whole-second label. */
export function fmtWhole(t) {
  if (!Number.isFinite(t) || t < 0) t = 0
  const total = Math.floor(t)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`
}

/** mm:ss or mm:ss.c for ruler labels. */
export function fmtRuler(t, step) {
  const m = Math.floor(t / 60)
  const s = t - m * 60
  if (step >= 1) return `${String(m).padStart(2, "0")}:${String(Math.round(s)).padStart(2, "0")}`
  const digits = step >= 0.1 ? 1 : 2
  return `${String(m).padStart(2, "0")}:${s.toFixed(digits).padStart(3 + digits, "0")}`
}

export function fmtSeconds(t, digits = 1) {
  return `${t.toFixed(digits)} s`
}

/** Parses "mm:ss.cc", "m:ss", "ss.cc", "h:mm:ss.cc" or plain seconds. */
export function parseTimecode(text) {
  const s = String(text).trim().replace(",", ".")
  if (!s) return null
  const parts = s.split(":")
  if (parts.length > 3) return null
  let total = 0
  for (const part of parts) {
    if (!/^\d*(\.\d*)?$/.test(part) || part === "" || part === ".") return null
    total = total * 60 + Number(part)
  }
  return Number.isFinite(total) ? total : null
}

export function on(el, ev, fn, opts) {
  el.addEventListener(ev, fn, opts)
  return () => el.removeEventListener(ev, fn, opts)
}

/** Tiny DOM builder: h("div.cls", {attr}, child, ...). */
export function h(spec, attrs, ...children) {
  const [tag, ...classes] = spec.split(".")
  const el = document.createElement(tag || "div")
  if (classes.length) el.className = classes.join(" ")
  if (attrs && typeof attrs === "object" && !(attrs instanceof Node) && !Array.isArray(attrs)) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue
      if (k === "html") el.innerHTML = v
      else if (k === "text") el.textContent = v
      else if (k === "style" && typeof v === "object") Object.assign(el.style, v)
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v)
      else if (k === "dataset") Object.assign(el.dataset, v)
      else el.setAttribute(k, v === true ? "" : v)
    }
  } else if (attrs != null) {
    children.unshift(attrs)
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue
    el.append(c instanceof Node ? c : document.createTextNode(String(c)))
  }
  return el
}

/** Calls fn at most once per animation frame with the latest arguments. */
export function rafCoalesce(fn) {
  let id = null
  let lastArgs = null
  const run = () => {
    id = null
    const args = lastArgs
    lastArgs = null
    fn(...args)
  }
  const wrapped = (...args) => {
    lastArgs = args
    if (id === null) id = requestAnimationFrame(run)
  }
  wrapped.cancel = () => {
    if (id !== null) cancelAnimationFrame(id)
    id = null
  }
  return wrapped
}

/** Runs an eased tween; returns a cancel function. */
export function tween({ from, to, duration = 220, ease = easeOutCubic, onUpdate, onDone }) {
  const start = performance.now()
  let id = 0
  const step = (now) => {
    const k = clamp((now - start) / duration, 0, 1)
    const e = ease(k)
    const value = Array.isArray(from) ? from.map((f, i) => lerp(f, to[i], e)) : lerp(from, to, e)
    onUpdate(value, k)
    if (k < 1) id = requestAnimationFrame(step)
    else onDone?.()
  }
  id = requestAnimationFrame(step)
  return () => cancelAnimationFrame(id)
}

/**
 * Pointer drag on a handle element with pointer capture: moves and the release
 * reach the handle even when the pointer leaves the window.
 */
export function startDrag(event, target, { onMove, onEnd }) {
  const pointerId = event.pointerId
  try { target.setPointerCapture(pointerId) } catch {}
  const move = (e) => { if (e.pointerId === pointerId) onMove(e) }
  const end = (e) => {
    if (e.pointerId !== pointerId) return
    target.removeEventListener("pointermove", move)
    target.removeEventListener("pointerup", end)
    target.removeEventListener("pointercancel", end)
    try { target.releasePointerCapture(pointerId) } catch {}
    onEnd(e)
  }
  target.addEventListener("pointermove", move)
  target.addEventListener("pointerup", end)
  target.addEventListener("pointercancel", end)
}

export function isTypingTarget(el) {
  if (!el) return false
  const tag = el.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable
}

/** m:ss.d, the quiet line's tenths. */
export function fmtTenths(t) {
  if (!Number.isFinite(t) || t < 0) t = 0
  const d = Math.round(t * 10)
  const m = Math.floor(d / 600)
  const s = (d % 600) / 10
  return `${m}:${s.toFixed(1).padStart(4, "0")}`
}

/** "25.9 s" or "1 min 4 s" for a removed span. */
export function fmtSpan(t) {
  if (t >= 60) return `${Math.floor(t / 60)} min ${Math.round(t % 60)} s`
  return `${t.toFixed(1)} s`
}
