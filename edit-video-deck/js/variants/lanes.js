import { clamp, fmtCs, h, on, startDrag, tween } from "../util.js"
import { icon } from "../icons.js"
import { createStrip, createTrimOverlay } from "../strip.js"
import { createRuler } from "../ruler.js"
import { HOLD_MS, HOLD_SPAN } from "../hold-zoom.js"
import { createSpeechMap } from "../speech.js"
import { createClock, createPlayButton, seekOnTrack } from "../transport.js"
import { createPreviewOverlay, previewLengthStepper, previewModeToggle } from "../preview-ui.js"
import { nudgeHandles, quietLine, saveNote, segmented, spinner } from "../ui.js"

const LOUPE_GAP = 14

/**
 * The loupe: a second, taller strip that pops out above the handle being
 * held, showing HOLD_SPAN seconds around it. The overview strip underneath
 * never changes scale, so the whole video and the magnified cut are on screen
 * at once; a bracket on the overview and a trapezoid up to the loupe say which
 * few pixels it magnifies.
 */
function createLoupe({ ctx, overview, speech, wrap }) {
  const strip = createStrip({ frames: ctx.frames, duration: ctx.duration, height: 84, tileWidth: 64, flush: true })
  strip.el.classList.add("loupe-track")
  const ruler = createRuler(strip, { minLabelPx: 44 })
  const speechMap = createSpeechMap({ strip, speech, words: true })
  const center = h("div.loupe-center")
  const tip = h("div.loupe-time.tnum")
  const chipL = h("span.loupe-chip.l")
  const chipR = h("span.loupe-chip.r")
  const box = h("div.loupe.hidden", { "data-slot": "loupe" }, ruler.el, strip.el, center, tip, chipL, chipR)
  const connector = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  connector.setAttribute("class", "loupe-connector hidden")
  const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon")
  connector.append(poly)
  const bracket = h("div.loupe-bracket.hidden")
  wrap.append(connector, box)
  overview.el.append(bracket)
  let lift = 0

  const clampWin = (s, e) => {
    const d = ctx.duration
    const span = Math.min(e - s, d)
    if (s < 0) return { s: 0, e: span }
    if (s + span > d) return { s: d - span, e: d }
    return { s, e: s + span }
  }
  const follow = (t) => {
    const w = clampWin(t - HOLD_SPAN / 2, t + HOLD_SPAN / 2)
    strip.setWindow(w.s, w.e)
    const p = strip.pct(t)
    center.style.left = `${p}%`
    tip.style.left = `${p}%`
    tip.textContent = fmtCs(t)
    chipL.textContent = `${HOLD_SPAN} s of ${Math.round(ctx.duration)} s`
    chipR.textContent = `${(strip.spp() * 1000).toFixed(0)} ms per px`
    const bw = Math.max(6, HOLD_SPAN / overview.spp())
    bracket.style.left = `${overview.pct(t)}%`
    bracket.style.width = `${bw}px`
  }
  const place = (handleClientX) => {
    const wr = wrap.getBoundingClientRect()
    const tr = overview.rect()
    const w = clamp(tr.width * 0.64, 420, tr.width)
    const hx = handleClientX - wr.left
    const left = clamp(hx - w / 2, tr.left - wr.left, tr.right - wr.left - w)
    box.style.width = `${w}px`
    box.style.left = `${left}px`
    box.classList.remove("hidden")
    const bh = box.offsetHeight
    lift = bh + LOUPE_GAP
    box.style.top = `${-lift}px`
    connector.setAttribute("width", String(wr.width))
    connector.setAttribute("height", String(wr.height + lift))
    connector.setAttribute("viewBox", `0 0 ${wr.width} ${wr.height + lift}`)
    connector.style.top = `${-lift}px`
    const trackTop = tr.top - wr.top + lift
    const bw = Math.max(6, HOLD_SPAN / overview.spp())
    poly.setAttribute("points", `${hx - bw / 2},${trackTop} ${hx + bw / 2},${trackTop} ${left + w},${bh} ${left},${bh}`)
    connector.classList.remove("hidden")
    bracket.classList.remove("hidden")
  }
  return {
    strip,
    box,
    get lift() {
      return lift
    },
    show(which, handleClientX, t) {
      place(handleClientX)
      follow(t)
      box.classList.add("in")
      wrap.classList.add("loupe-open")
    },
    follow,
    hide() {
      wrap.classList.remove("loupe-open")
      box.classList.remove("in")
      box.classList.add("hidden")
      connector.classList.add("hidden")
      bracket.classList.add("hidden")
    },
    visible: () => !box.classList.contains("hidden"),
    destroy() {
      speechMap.destroy()
      ruler.destroy()
      strip.destroy()
      box.remove()
      connector.remove()
      bracket.remove()
    },
  }
}

/** Hold-to-zoom whose zoom lands in the loupe, not on the overview. */
function createLoupeZoom({ ctx, overview, loupe, speech, onZoom }) {
  let phase = "idle"
  let activeWhich = null
  const report = () => onZoom?.({ phase, zoomed: phase === "zoomed", span: loupe.strip.span(), spp: loupe.strip.spp(), which: activeWhich })
  const loupeWidth = () => loupe.strip.width() || clamp(overview.width() * 0.64, 420, Math.max(420, overview.width()))
  const fineSpp = () => HOLD_SPAN / Math.max(1, loupeWidth())
  const handleClientX = (which) => {
    const r = overview.rect()
    return r.left + (overview.pctClamped(ctx.store.state[which]) / 100) * r.width
  }
  const onHandleDown = (which, e, el) => {
    ctx.store.setActive(which)
    activeWhich = which
    const downAt = performance.now()
    let lastX = e.clientX
    let lastY = e.clientY
    let holdT = null
    let holdX = null
    let raf = 0
    const samples = []
    const coarseOffset = ctx.store.state[which] - overview.timeAtUnclamped(e.clientX)
    el.classList.add("holding")
    phase = "pressing"
    report()
    const zoomIn = () => {
      holdT = ctx.store.state[which]
      holdX = lastX
      el.classList.add("zoomed")
      loupe.show(which, handleClientX(which), holdT)
      phase = "zoomed"
      report()
    }
    const tick = () => {
      const now = performance.now()
      samples.push({ x: lastX, y: lastY, at: now })
      while (samples.length && samples[0].at < now - 500) samples.shift()
      if (phase === "pressing" && now - downAt >= HOLD_MS) {
        const old = samples.find((s) => s.at <= now - HOLD_MS)
        if (old && Math.hypot(lastX - old.x, lastY - old.y) < 5) zoomIn()
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return {
      onMove(ev) {
        lastX = ev.clientX
        lastY = ev.clientY
        const fine = phase === "zoomed"
        const t = fine ? holdT + (lastX - holdX) * fineSpp() : overview.timeAtUnclamped(lastX) + coarseOffset
        const r = speech.snap(which, t, ev, fine ? fineSpp() : overview.spp())
        el.classList.toggle("snap-flash", r.snapped)
        ctx.store.setHandle(which, r.t)
        if (fine) loupe.follow(ctx.store.state[which])
      },
      onEnd() {
        cancelAnimationFrame(raf)
        el.classList.remove("holding", "zoomed", "snap-flash")
        ctx.store.setActive(null)
        if (phase === "zoomed") loupe.hide()
        phase = "idle"
        report()
        activeWhich = null
      },
    }
  }
  return {
    onHandleDown,
    isZoomed: () => phase === "zoomed",
    holdSpan: HOLD_SPAN,
    get phase() {
      return phase
    },
    holdFor(which) {
      ctx.store.setActive(which)
      activeWhich = which
      loupe.show(which, handleClientX(which), ctx.store.state[which])
      phase = "zoomed"
      report()
    },
    release() {
      ctx.store.setActive(null)
      loupe.hide()
      phase = "idle"
      report()
    },
    measure: () => ({
      trackWidth: +overview.width().toFixed(1),
      secondsPerPixelFull: +(ctx.duration / overview.width()).toFixed(4),
      secondsPerPixelHoldZoom: +fineSpp().toFixed(4),
      currentSpan: +(phase === "zoomed" ? loupe.strip.span() : ctx.duration).toFixed(3),
      currentSecondsPerPixel: +(phase === "zoomed" ? fineSpp() : overview.spp()).toFixed(4),
      overviewSpan: +overview.span().toFixed(3),
      loupeVisible: loupe.visible(),
      phase,
    }),
    destroy() {},
  }
}

/**
 * B: lanes. A classic dialog: title and X on top, one primary Done in the
 * footer with the save state beside it. No modes at all: the trim strip and a
 * preview lane under it are both always on screen, so there is nothing to
 * enter, finish or cancel inside the dock. Done saves the trim and the preview
 * as one write and closes; X or Esc is the only way out, and asks before
 * dropping an unsaved change.
 *
 * Zoom feedback: a loupe. The overview strip stays at full scale and a second,
 * taller strip pops out above the handle with six seconds of frames, a ruler,
 * the words, and a trapezoid down to the few pixels it magnifies.
 */
export const lanes = {
  id: "B",
  slug: "lanes",
  label: "Lanes",
  subtitle: "X and one Done · no modes: trim strip plus a preview lane · zoom: a loupe over a fixed overview",
  mount(ctx) {
    const { store, session, speech } = ctx
    let busy = false

    const closeBtn = h("button.dialog-close", { type: "button", "aria-label": "Close", "data-action": "close" }, icon("x"))
    const header = h("header.modal-head.dialog-head", h("h2.modal-title", "Edit Video"), closeBtn)
    const slot = h("div.video-slot")
    const stage = h("section.stage", slot)

    const strip = createStrip({ frames: ctx.frames, duration: ctx.duration, height: 64, tileWidth: 56 })
    const speechMap = createSpeechMap({ strip, speech, words: false })
    const wrap = h("div.track-wrap", strip.el)
    const loupe = createLoupe({ ctx, overview: strip, speech, wrap })
    const zoom = createLoupeZoom({
      ctx,
      overview: strip,
      loupe,
      speech,
      onZoom: (z) => {
        el.classList.toggle("is-zoomed", z.zoomed)
      },
    })
    const overlay = createTrimOverlay(strip, store, {
      hints: { start: "Hold still for a closer look", end: "Hold still for a closer look" },
      onHandleDown(which, e, handleEl) {
        const drag = zoom.onHandleDown(which, e, handleEl)
        startDrag(e, handleEl, { onMove: drag.onMove, onEnd: drag.onEnd })
      },
    })
    const play = createPlayButton(ctx)
    const clock = createClock(ctx)
    const row1 = h("div.dock-row", play.el, clock.el, wrap)

    const lane = h("div.plane", { "data-slot": "preview-lane" })
    const laneMap = {
      timeAt: (x) => {
        const r = lane.getBoundingClientRect()
        return clamp((x - r.left) / r.width, 0, 1) * ctx.duration
      },
      pct: (t) => (t / ctx.duration) * 100,
    }
    const laneOverlay = createPreviewOverlay(lane, ctx, laneMap)
    laneOverlay.show()
    const pvToggle = previewModeToggle(ctx, segmented, { className: "xs" })
    const pvLen = previewLengthStepper(ctx)
    const laneLabel = h("div.plane-label", h("span", "Preview"))
    const row2 = h("div.dock-row.plane-row", laneLabel, lane, h("div.plane-tools", pvToggle.el, pvLen.el))
    const dock = h("div.dock.glass.glass-media.lanes-dock", row1, row2)
    const offSeek = seekOnTrack(ctx, strip)

    const quiet = quietLine(ctx)
    const note = saveNote(ctx)
    const doneBtn = h("button.btn.primary", { type: "button", "data-action": "done" }, "Done")
    const footer = h("footer.modal-foot", quiet.el, h("span.spacer"), note.el, doneBtn)

    const pop = h(
      "div.discard-pop.hidden",
      { role: "dialog", "aria-label": "Discard changes?" },
      h("b", "Discard your changes?"),
      h("p", "The trim and preview go back to what was last saved."),
      h("div.pop-actions", h("button.btn.outline.sm", { type: "button", "data-action": "keep", onclick: () => hidePop() }, "Keep editing"), h("button.btn.destructive.sm", { type: "button", "data-action": "discard", onclick: () => discard() }, "Discard")),
    )
    const el = h("div.modal.dialog", { role: "dialog", "aria-modal": "true", "aria-label": "Edit Video", dataset: { variant: "B" } }, header, stage, dock, footer, pop)
    ctx.placeVideo(slot)

    const hidePop = () => pop.classList.add("hidden")
    const discard = () => {
      hidePop()
      session.discard()
      ctx.close({ reason: "cancel" })
    }
    const requestClose = () => {
      if (busy) return
      if (session.dirty()) {
        pop.classList.toggle("hidden")
        return
      }
      ctx.close({ reason: "cancel" })
    }
    async function done() {
      if (busy) return
      hidePop()
      const result = { reason: "done", trimChanged: session.trimDirty(), previewChanged: session.previewDirty() }
      if (session.dirty()) {
        busy = true
        doneBtn.setAttribute("aria-busy", "true")
        doneBtn.prepend(spinner())
        await session.commit()
        busy = false
      }
      ctx.close(result)
    }
    const offs = [on(closeBtn, "click", requestClose), on(doneBtn, "click", done), offSeek]

    return {
      el,
      strip,
      zoom,
      loupe,
      done,
      requestClose,
      discard,
      onKey(e) {
        if (e.key === "Escape") {
          if (!pop.classList.contains("hidden")) hidePop()
          else requestClose()
          return true
        }
        return nudgeHandles(ctx, e)
      },
      measure: () => ({
        ...zoom.measure(),
        loupeBox: loupe.box.classList.contains("hidden") ? null : loupe.box.getBoundingClientRect().toJSON(),
        discardPopOpen: !pop.classList.contains("hidden"),
        saveNote: note.el.textContent,
      }),
      destroy() {
        for (const off of offs) off()
        overlay.destroy()
        laneOverlay.destroy()
        pvToggle.destroy()
        pvLen.destroy()
        zoom.destroy()
        loupe.destroy()
        speechMap.destroy()
        quiet.destroy()
        note.destroy()
        play.destroy()
        clock.destroy()
        strip.destroy()
        el.remove()
      },
    }
  },
}

export { tween }
