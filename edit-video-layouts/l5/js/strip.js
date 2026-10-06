import { clamp, fmtRuler, fmtTooltip, h, on, rafCoalesce } from "./util.js"
import { TILE_W, TILE_H, drawCover } from "./source.js"
import { icon } from "./icons.js"

let stripSeq = 0

/**
 * A filmstrip track: a canvas of frames for a time window plus a mapping
 * between pointer x and source time.
 *
 * mode "equal16": today's strip, sixteen equal tiles over the whole source,
 * each cover-cropped (narrow slivers on a wide track).
 * mode "grid": tiles of a fixed width aligned to absolute time, so a window
 * can pan and zoom without the frames re-flowing.
 */
export function createStrip({
  frames,
  duration,
  mode = "grid",
  height = 64,
  tileWidth = 56,
  flush = false,
  labels = false,
  ruler = false,
  className = "",
  gap = 2,
}) {
  const id = `strip-${stripSeq++}`
  const canvas = h("canvas.frames")
  const el = h(`div.track${flush ? ".flush" : ""}${className ? "." + className.split(" ").join(".") : ""}`, { style: { height: `${height}px` } }, canvas)
  const ctx = canvas.getContext("2d")
  let win = { s: 0, e: duration }
  let getDuration = () => duration
  let wantTimer = null
  let destroyed = false
  const windowSubs = new Set()

  const inner = () => {
    const rect = canvas.getBoundingClientRect()
    return rect
  }

  const tilesFor = (rect) => {
    const W = rect.width
    const H = rect.height
    if (mode === "equal16") {
      const n = 16
      const d = getDuration()
      const tw = (W - gap * (n - 1)) / n
      const list = []
      for (let i = 0; i < n; i++) {
        list.push({ x: i * (tw + gap), w: tw, t: (d * (i + 0.5)) / n, dur: d / n })
      }
      return { list, tileDur: d / n, tw, H }
    }
    const span = Math.max(1e-6, win.e - win.s)
    const tw = tileWidth
    const perTile = (tw + gap) / W
    const tileDur = span * perTile
    const k0 = Math.floor(win.s / tileDur)
    const k1 = Math.ceil(win.e / tileDur)
    const list = []
    for (let k = k0; k < k1; k++) {
      const t0 = k * tileDur
      const x = ((t0 - win.s) / span) * W
      // The last tile straddles the end; sample inside the video so it gets a frame.
      list.push({ x, w: tw, t: Math.min(t0 + tileDur / 2, Math.max(t0, getDuration() - 0.25)), dur: tileDur, t0 })
    }
    return { list, tileDur, tw, H }
  }

  const pickRulerStep = (pxPerSec) => {
    const steps = [0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300]
    let tick = steps[steps.length - 1]
    for (const s of steps) {
      if (s * pxPerSec >= 9) {
        tick = s
        break
      }
    }
    let label = tick
    for (const s of steps) {
      if (s >= tick && s * pxPerSec >= 64 && Number.isInteger(s / tick)) {
        label = s
        break
      }
    }
    return { tick, label }
  }

  const draw = () => {
    if (destroyed) return
    const rect = inner()
    if (rect.width < 2 || rect.height < 2) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const W = Math.round(rect.width)
    const H = Math.round(rect.height)
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width = W * dpr
      canvas.height = H * dpr
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)
    const { list, tileDur } = tilesFor({ width: W, height: H })
    const missing = []
    const focus = (win.s + win.e) / 2
    const span = win.e - win.s
    for (const tile of list) {
      if (tile.x + tile.w < 0 || tile.x > W) continue
      let frame = frames.get(tile.t)
      let dim = false
      if (!frame) {
        missing.push(tile.t)
        const near = frames.nearest(tile.t, Math.max(tile.dur * 0.75, 0.02))
        if (near) frame = near.frame
        else {
          const far = frames.nearest(tile.t)
          if (far) {
            frame = far.frame
            dim = true
          }
        }
      }
      if (frame) {
        ctx.globalAlpha = dim ? 0.45 : 0.9
        drawCover(ctx, frame, TILE_W, TILE_H, tile.x, 0, tile.w, H)
        ctx.globalAlpha = 1
      } else {
        ctx.fillStyle = "rgba(248,250,252,0.16)"
        ctx.fillRect(tile.x, H * 0.3, tile.w, H * 0.4)
      }
      if (labels && tileDur <= 3.01 && tile.w >= 40) {
        const text = fmtRuler(tile.t0 ?? tile.t - tile.dur / 2, tileDur < 1 ? 0.1 : 1)
        ctx.font = "600 9px ui-monospace, Menlo, monospace"
        const tw = ctx.measureText(text).width + 6
        ctx.fillStyle = "rgba(2,6,23,0.72)"
        ctx.fillRect(tile.x + 2, 2, tw, 12)
        ctx.fillStyle = "#f8fafc"
        ctx.fillText(text, tile.x + 5, 11)
      }
    }
    if (ruler && span > 0) {
      const pxPerSec = W / span
      const { tick, label } = pickRulerStep(pxPerSec)
      const band = ctx.createLinearGradient(0, H - 18, 0, H)
      band.addColorStop(0, "rgba(2,6,23,0)")
      band.addColorStop(1, "rgba(2,6,23,0.85)")
      ctx.fillStyle = band
      ctx.fillRect(0, H - 18, W, 18)
      const first = Math.ceil(win.s / tick) * tick
      ctx.font = "600 9px ui-monospace, Menlo, monospace"
      for (let t = first; t <= win.e + 1e-9; t += tick) {
        const x = ((t - win.s) / span) * W
        const isLabel = Math.abs(t / label - Math.round(t / label)) < 1e-6
        ctx.fillStyle = isLabel ? "#f8fafc" : "rgba(248,250,252,0.55)"
        ctx.fillRect(Math.round(x), H - (isLabel ? 9 : 5), 1, isLabel ? 9 : 5)
        if (isLabel) {
          const text = fmtRuler(t, label)
          ctx.fillText(text, Math.round(x) + 3, H - 10)
        }
      }
    }
    if (missing.length && frames.extract) {
      clearTimeout(wantTimer)
      wantTimer = setTimeout(() => frames.want(missing, focus, id), 80)
    }
  }
  const render = rafCoalesce(draw)

  const offFrames = frames.subscribe(() => render())
  const ro = new ResizeObserver(() => render())
  ro.observe(el)

  const api = {
    id,
    el,
    canvas,
    get mode() {
      return mode
    },
    getWindow: () => ({ ...win }),
    setWindow(s, e) {
      if (mode === "equal16") return
      win = { s, e }
      render()
      for (const cb of windowSubs) cb(win)
    },
    onWindow(cb) {
      windowSubs.add(cb)
      return () => windowSubs.delete(cb)
    },
    setDuration(d) {
      getDuration = () => d
      if (mode === "equal16" || Math.abs(win.e - duration) < 1e-6) win = { s: win.s, e: d }
      duration = d
      render()
      for (const cb of windowSubs) cb(win)
    },
    window: () => (mode === "equal16" ? { s: 0, e: getDuration() } : win),
    render,
    rect: () => el.getBoundingClientRect(),
    width: () => el.getBoundingClientRect().width,
    span: () => {
      const w = api.window()
      return w.e - w.s
    },
    /** Seconds one tile covers at the current window. */
    tileDur: () => tilesFor({ width: Math.max(1, api.width()), height: 1 }).tileDur,
    /** Seconds per CSS pixel at the current window. */
    spp: () => api.span() / Math.max(1, api.width()),
    timeAt(clientX) {
      const r = el.getBoundingClientRect()
      const w = api.window()
      return w.s + (clamp(clientX - r.left, 0, r.width) / r.width) * (w.e - w.s)
    },
    timeAtUnclamped(clientX) {
      const r = el.getBoundingClientRect()
      const w = api.window()
      return w.s + ((clientX - r.left) / r.width) * (w.e - w.s)
    },
    pct(t) {
      const w = api.window()
      return ((t - w.s) / (w.e - w.s)) * 100
    },
    pctClamped(t) {
      return clamp(api.pct(t), 0, 100)
    },
    destroy() {
      destroyed = true
      render.cancel()
      clearTimeout(wantTimer)
      offFrames()
      ro.disconnect()
      el.remove()
    },
  }
  return api
}

/**
 * The range overlay on a strip: scrims, the selection band, the playhead,
 * the two handles and the drag tooltip, positioned from the strip's window.
 */
export function createTrimOverlay(strip, store, { handles = true, tooltip = true, playhead = true, edgeChips = false, hints = null, onHandleDown, onEdgeChip } = {}) {
  const scrimL = h("div.scrim.left")
  const scrimR = h("div.scrim.right")
  const sel = h("div.selection")
  const head = playhead ? h("div.playhead") : null
  const tip = tooltip ? h("div.tooltip.hidden") : null
  const hStart = handles ? h("button.handle.start", { type: "button", "aria-label": "Trim start", tabindex: "0" }) : null
  const hEnd = handles ? h("button.handle.end", { type: "button", "aria-label": "Trim end", tabindex: "0" }) : null
  const chipL = edgeChips ? h("button.edge-chip.left.hidden", { type: "button" }, icon("chevronLeft"), h("span")) : null
  const chipR = edgeChips ? h("button.edge-chip.right.hidden", { type: "button" }, h("span"), icon("chevronRight")) : null
  const hint = hints ? h("div.handle-hint.hidden") : null
  const nodes = [scrimL, scrimR, sel, head, hStart, hEnd, tip, chipL, chipR, hint].filter(Boolean)
  for (const n of nodes) strip.el.append(n)

  const offs = []
  if (handles) {
    for (const [el, which] of [[hStart, "start"], [hEnd, "end"]]) {
      offs.push(
        on(el, "pointerdown", (e) => {
          if (e.button !== 0) return
          e.preventDefault()
          e.stopPropagation()
          el.focus({ preventScroll: true })
          onHandleDown?.(which, e, el)
        }),
      )
      if (hint && hints[which]) {
        offs.push(on(el, "mouseenter", () => {
          if (store.state.dragging) return
          hint.textContent = hints[which]
          hint.style.left = el.style.left
          hint.classList.remove("hidden")
        }))
        offs.push(on(el, "mouseleave", () => hint.classList.add("hidden")))
        offs.push(on(el, "pointerdown", () => hint.classList.add("hidden")))
      }
      offs.push(on(el, "focus", () => store.setFocused(which)))
      offs.push(on(el, "blur", () => { if (store.state.focused === which) store.setFocused(null) }))
      offs.push(on(el, "click", (e) => e.stopPropagation()))
    }
  }
  if (edgeChips) {
    offs.push(on(chipL, "pointerdown", (e) => e.stopPropagation()))
    offs.push(on(chipR, "pointerdown", (e) => e.stopPropagation()))
    offs.push(on(chipL, "click", (e) => { e.stopPropagation(); onEdgeChip?.(chipL.dataset.which) }))
    offs.push(on(chipR, "click", (e) => { e.stopPropagation(); onEdgeChip?.(chipR.dataset.which) }))
  }

  const update = () => {
    const s = store.state
    const w = strip.window()
    const span = w.e - w.s
    const pct = (t) => ((t - w.s) / span) * 100
    const pc = (t) => clamp(pct(t), 0, 100)
    scrimL.style.width = `${pc(s.start)}%`
    scrimR.style.left = `${pc(s.end)}%`
    sel.style.left = `${pc(s.start)}%`
    sel.style.width = `${Math.max(0, pc(s.end) - pc(s.start))}%`
    if (head) {
      const p = pct(s.playhead)
      head.style.left = `${clamp(p, 0, 100)}%`
      head.style.display = p < -0.5 || p > 100.5 ? "none" : ""
    }
    if (handles) {
      for (const [el, which] of [[hStart, "start"], [hEnd, "end"]]) {
        const t = s[which]
        const p = pct(t)
        const visible = p >= -0.6 && p <= 100.6
        el.classList.toggle("hidden", !visible)
        el.style.left = `${clamp(p, 0, 100)}%`
        el.classList.toggle("active", s.active === which)
        el.classList.toggle("focused", s.focused === which && s.active !== which)
      }
    }
    if (tip) {
      const which = s.active
      if (which && s.dragging) {
        const t = s[which]
        tip.classList.remove("hidden")
        tip.style.left = `${pc(t)}%`
        tip.textContent = fmtTooltip(t)
      } else tip.classList.add("hidden")
    }
    if (edgeChips) {
      const ps = pct(s.start)
      const pe = pct(s.end)
      const leftWhich = ps < -0.6 ? "start" : pe < -0.6 ? "end" : null
      const rightWhich = pe > 100.6 ? "end" : ps > 100.6 ? "start" : null
      chipL.classList.toggle("hidden", !leftWhich)
      chipR.classList.toggle("hidden", !rightWhich)
      if (leftWhich) {
        chipL.dataset.which = leftWhich
        chipL.querySelector("span").textContent = `${leftWhich === "start" ? "Start" : "End"} ${fmtTooltip(s[leftWhich]).replace(",", ".")}`
      }
      if (rightWhich) {
        chipR.dataset.which = rightWhich
        chipR.querySelector("span").textContent = `${rightWhich === "start" ? "Start" : "End"} ${fmtTooltip(s[rightWhich]).replace(",", ".")}`
      }
    }
  }
  const scheduled = rafCoalesce(update)
  offs.push(store.subscribe(() => scheduled()))
  offs.push(strip.onWindow(() => scheduled()))
  update()

  return {
    update: scheduled,
    handles: { start: hStart, end: hEnd },
    tip,
    destroy() {
      scheduled.cancel()
      for (const off of offs) off()
      for (const n of nodes) n.remove()
    },
  }
}
