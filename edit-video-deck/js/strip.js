import { clamp, fmtRuler, fmtTooltip, h, on, rafCoalesce } from "./util.js"
import { TILE_W, TILE_H, drawCover } from "./source.js"
import { icon } from "./icons.js"

let stripSeq = 0

/**
 * A filmstrip track: a canvas of frames for a time window plus a mapping
 * between pointer x and source time.
 *
 * The frames are the scale. Tiles sit on a binary ladder of durations (base,
 * base/2, base/4, ...) aligned to absolute time, so as the window shrinks a
 * tile only ever widens, and splits in two when it passes `maxTileWidth`; on
 * the way back out the tiles narrow and merge. At rest a tile is `tileWidth`
 * wide and covers the whole source over the strip; zoomed in, each tile is a
 * larger frame at its own time, refetched for that time.
 */
export function createStrip({ frames, duration, height = 64, tileWidth = 56, maxTileWidth = 164, flush = false, className = "", gap = 2 }) {
  const id = `strip-${stripSeq++}`
  const canvas = h("canvas.frames")
  const el = h(`div.track${flush ? ".flush" : ""}${className ? "." + className.split(" ").join(".") : ""}`, { style: { height: `${height}px` } }, canvas)
  const ctx = canvas.getContext("2d")
  let win = { s: 0, e: duration }
  let getDuration = () => duration
  let wantTimer = null
  let destroyed = false
  const windowSubs = new Set()

  const pitch = tileWidth + gap
  /** Seconds one rest tile covers: the whole source laid over the strip at `pitch` per tile. */
  const baseDur = (W) => (getDuration() * pitch) / Math.max(1, W)
  /** The ladder level for a window: a tile widens with the zoom until it would pass maxTileWidth, then halves. */
  const levelFor = (span) => {
    const z = getDuration() / Math.max(1e-6, span)
    return Math.max(0, Math.ceil(Math.log2((pitch * z) / (maxTileWidth + gap)) - 1e-9))
  }
  const tilesFor = (W) => {
    const span = Math.max(1e-6, win.e - win.s)
    const level = levelFor(span)
    const tileDur = baseDur(W) / 2 ** level
    const pxPerSec = W / span
    const k0 = Math.floor(win.s / tileDur)
    const k1 = Math.ceil(win.e / tileDur)
    const list = []
    for (let k = k0; k < k1; k++) {
      const t0 = k * tileDur
      list.push({ x: (t0 - win.s) * pxPerSec, w: Math.max(1, tileDur * pxPerSec - gap), t: t0 + tileDur / 2, dur: tileDur, t0 })
    }
    return { list, tileDur, level }
  }

  const draw = () => {
    if (destroyed) return
    const rect = canvas.getBoundingClientRect()
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
    const { list } = tilesFor(W)
    const missing = []
    const focus = (win.s + win.e) / 2
    for (const tile of list) {
      if (tile.x + tile.w < 0 || tile.x > W) continue
      let frame = frames.get(tile.t)
      let dim = false
      if (!frame) {
        missing.push(tile.t)
        // A tile that just split keeps its parent's frame until its own arrives.
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
    getWindow: () => ({ ...win }),
    setWindow(s, e) {
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
      if (Math.abs(win.e - duration) < 1e-6) win = { s: win.s, e: d }
      duration = d
      render()
      for (const cb of windowSubs) cb(win)
    },
    window: () => win,
    render,
    rect: () => el.getBoundingClientRect(),
    width: () => el.getBoundingClientRect().width,
    span: () => win.e - win.s,
    /** Seconds one tile covers at the current window. */
    tileDur: () => tilesFor(Math.max(1, api.width())).tileDur,
    /** The ladder level at the current window: 0 at rest, one more per halving. */
    level: () => levelFor(api.span()),
    /** CSS pixels one tile is wide at the current window. */
    tilePx: () => (api.tileDur() / api.span()) * api.width() - gap,
    /** Seconds per CSS pixel at the current window. */
    spp: () => api.span() / Math.max(1, api.width()),
    timeAt(clientX) {
      const r = el.getBoundingClientRect()
      return win.s + (clamp(clientX - r.left, 0, r.width) / r.width) * (win.e - win.s)
    },
    timeAtUnclamped(clientX) {
      const r = el.getBoundingClientRect()
      return win.s + ((clientX - r.left) / r.width) * (win.e - win.s)
    },
    pct(t) {
      return ((t - win.s) / (win.e - win.s)) * 100
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
