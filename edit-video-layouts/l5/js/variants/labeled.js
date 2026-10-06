import { clamp, fmtSeconds, fmtSpan, h, on, rafCoalesce, startDrag } from "../util.js"
import { icon } from "../icons.js"
import { createStrip, createTrimOverlay } from "../strip.js"
import { createRuler } from "../ruler.js"
import { createHoldZoom } from "../hold-zoom.js"
import { createSpeechMap } from "../speech.js"
import { createPlayButton, seekOnTrack } from "../transport.js"
import { createPreviewOverlay, previewLengthStepper, previewModeToggle } from "../preview-ui.js"
import { nudgeHandles, segmented, snapTransform, spinner } from "../ui.js"

/** m:ss.cc, every time this layout prints. */
export function fmtTc(t) {
  if (!Number.isFinite(t) || t < 0) t = 0
  const cs = Math.round(t * 100)
  const m = Math.floor(cs / 6000)
  const s = Math.floor((cs % 6000) / 100)
  return `${m}:${String(s).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`
}

/**
 * The auto-trim chip: "Trimmed 25.9 s of silence · Undo" while the auto-trim
 * stands, "Whole video · Trim silence" after Undo, "Trimmed 48.8 s · Back to
 * auto" once a handle moved by hand. Everything stays a draft until Done.
 */
function trimChip(ctx) {
  const { session, speech } = ctx
  const el = h("div.tl-chip")
  let state = ""
  const paint = () => {
    const auto = speech.autoTrim
    const d = session.trimDraft()
    const isAuto = Math.abs(d.start - auto.start) < 0.0005 && Math.abs(d.end - auto.end) < 0.0005
    const act = (label, fn, name) =>
      h("button", { type: "button", "data-action": name, onpointerdown: (e) => e.stopPropagation(), onclick: (e) => { e.stopPropagation(); fn() } }, label)
    const silence = auto.start + (ctx.duration - auto.end)
    const next = isAuto ? "auto" : session.isFull() ? "full" : "hand"
    // Parts marked .long drop out when the row is short of room (the phone).
    if (next === "auto") el.replaceChildren(icon("sparkles"), h("span.long", `Trimmed ${fmtSpan(silence)} of silence`), h("span.short", `−${fmtSpan(silence)}`), act("Undo", () => session.restoreFull(), "undo-auto"))
    else if (next === "full") el.replaceChildren(icon("audioLines"), h("span.long", "Whole video"), act("Trim silence", () => session.reapplyAuto(), "redo-auto"))
    else el.replaceChildren(icon("scissors"), h("span.long", `Trimmed ${fmtSpan(session.draftSilence())}`), h("span.short", `−${fmtSpan(session.draftSilence())}`), act("Back to auto", () => session.reapplyAuto(), "redo-auto"))
    el.dataset.state = next
    if (next !== state) {
      state = next
      return true
    }
    return false
  }
  return { el, paint }
}

/**
 * The hairline row under the strip. In Trim it prints the start time under
 * the start handle and the end time under the end handle, both following the
 * handles, the trimmed length centred on a dimension line between them, and
 * the auto-trim chip beside the start. A handle scrolled out of a zoomed
 * window pins its label to that edge. In Preview it prints the preview pin's
 * time and length under the pin.
 */
function createLabelRow(ctx, strip) {
  const { store, session } = ctx
  const lineL = h("i.tl-dim")
  const lineR = h("i.tl-dim")
  const footS = h("i.tl-foot")
  const footE = h("i.tl-foot")
  const S = h("span.tl-tc.tl-start")
  const E = h("span.tl-tc.tl-end")
  const L = h("span.tl-len")
  const P = h("span.tl-tc.tl-pv")
  const chip = trimChip(ctx)
  const el = h("div.tl-labels", lineL, lineR, footS, footE, S, E, L, chip.el, P)
  let mode = "trim"
  const GAP = 10

  const place = (node, x, show = true) => {
    node.style.display = show ? "" : "none"
    if (show) node.style.transform = `translateX(${Math.round(x)}px)`
  }

  const paint = () => {
    const W = el.clientWidth
    if (W < 2) return
    const w = strip.window()
    const span = w.e - w.s
    const X = (t) => ((t - w.s) / span) * W
    if (mode === "preview") {
      for (const n of [S, E, L, chip.el, lineL, lineR, footS, footE]) n.style.display = "none"
      const p = session.state.preview
      const at = p.mode === "moving" ? p.start : p.still
      P.textContent = p.mode === "moving" ? `${fmtTc(at)} · ${(p.end - p.start).toFixed(0)} s` : fmtTc(at)
      P.style.display = ""
      const pw = P.offsetWidth
      place(P, clamp(X(at) - 4, 0, W - pw))
      return
    }
    P.style.display = "none"
    const s = store.state
    chip.paint()
    const xs = X(s.start)
    const xe = X(s.end)
    const offL = xs < -0.5
    const offR = xe > W + 0.5
    S.textContent = `${offL ? "‹ " : ""}${fmtTc(s.start)}`
    E.textContent = `${fmtTc(s.end)}${offR ? " ›" : ""}`
    L.textContent = fmtTc(s.end - s.start)
    S.classList.toggle("active", s.active === "start")
    E.classList.toggle("active", s.active === "end")
    S.classList.toggle("pinned", offL)
    E.classList.toggle("pinned", offR)
    for (const n of [S, E, L]) n.style.display = ""
    const sw = S.offsetWidth
    const ew = E.offsetWidth
    const lw = L.offsetWidth
    chip.el.style.display = ""
    chip.el.classList.remove("compact")
    const cwFull = chip.el.offsetWidth
    chip.el.classList.add("compact")
    const cwShort = chip.el.offsetWidth
    // Labels sit inside the selection, flush with each handle's outer edge.
    let sx = clamp(xs - 4, 0, W - sw)
    let ex = clamp(xe + 4 - ew, 0, W - ew)
    if (sx + sw + GAP > ex) {
      // Handles too close: the labels turn outward, into the trimmed-off area.
      sx = clamp(xs - 4 - sw, 0, W - sw)
      ex = clamp(xe + 4, 0, W - ew)
      if (sx + sw + 4 > ex) ex = sx + sw + 4
    }
    const inner0 = sx + sw + GAP
    const inner1 = ex - GAP
    const room = inner1 - inner0
    // Most to least: full chip and length, short chip and length, short chip
    // alone, the chip outside the start label, the length alone.
    let chipAt = null
    let cw = cwFull
    let showLen = true
    if (room >= cwFull + GAP + lw) chipAt = "in"
    else if (room >= cwShort + GAP + lw) (chipAt = "in"), (cw = cwShort)
    else if (room >= cwShort) (chipAt = "in"), (cw = cwShort), (showLen = false)
    else if (xs - 4 - cwShort - GAP >= 0) (chipAt = "out"), (cw = cwShort), (showLen = room >= lw)
    else showLen = room >= lw
    chip.el.classList.toggle("compact", cw !== cwFull)
    const chipX = chipAt === "out" ? sx - GAP - cw : inner0
    const lo = chipAt === "in" ? chipX + cw + GAP : inner0
    const mid = (Math.max(0, xs) + Math.min(W, xe)) / 2
    const lx = clamp(mid - lw / 2, lo, inner1 - lw)
    place(S, sx)
    place(E, ex)
    place(chip.el, chipX, chipAt !== null)
    place(L, lx, showLen)
    // The dimension line runs from the start group to the end label, broken by the length.
    const d0 = (chipAt === "in" ? chipX + cw : sx + sw) + 6
    const d1 = ex - 6
    const segs = showLen ? [[d0, lx - 2], [lx + lw + 2, d1]] : [[d0, d1], [0, 0]]
    for (const [node, [a, b]] of [[lineL, segs[0]], [lineR, segs[1]]]) {
      node.style.display = b - a >= 12 ? "" : "none"
      node.style.left = `${Math.round(a)}px`
      node.style.width = `${Math.max(0, Math.round(b - a))}px`
    }
    place(footS, clamp(xs, 0, W) - 0.5, !offL)
    place(footE, clamp(xe, 0, W) - 0.5, !offR)
  }
  const sched = rafCoalesce(paint)
  const offs = [store.subscribe(() => sched()), session.subscribe(() => sched()), strip.onWindow(() => sched())]
  const ro = new ResizeObserver(() => sched())
  ro.observe(el)
  return {
    el,
    paint,
    setMode(m) {
      mode = m
      el.dataset.mode = m
      paint()
    },
    destroy() {
      for (const off of offs) off()
      ro.disconnect()
      sched.cancel()
    },
  }
}

/** The playhead's time on its own line, beside the play button. */
function createPlayheadTime(ctx) {
  const el = h("span.tl-now.tnum", "0:00.00")
  const sched = rafCoalesce(() => (el.textContent = fmtTc(ctx.store.state.playhead)))
  const off = ctx.store.subscribe(() => sched())
  sched()
  return {
    el,
    destroy() {
      off()
      sched.cancel()
    },
  }
}

/**
 * Layout 5: the timeline carries its own labels. Title and Trim | Preview at
 * the top left, the video full width, a ruler, the strip, and one hairline
 * row of handle times under it. Play and the playhead time share the bottom
 * line with Cancel and Done. Nothing is written until Done; Done saves trim
 * and preview as one write and closes; Cancel or Esc drops the draft.
 */
export const labeled = {
  id: "5",
  slug: "labeled",
  label: "Self-labeled timeline",
  subtitle: "",
  mount(ctx) {
    const { store, session, speech } = ctx
    let mode = "trim"
    let busy = false

    /* head: title, then the segment under it; Preview's tools on the right */
    const seg = segmented(
      [
        { v: "trim", label: "Trim", icon: "scissors" },
        { v: "preview", label: "Preview", icon: "film" },
      ],
      "trim",
      (v) => setMode(v),
    )
    const pvToggle = previewModeToggle(ctx, segmented, { className: "xs" })
    const pvLen = previewLengthStepper(ctx)
    const pvTools = h("div.tl-pvtools.hidden", pvToggle.el, pvLen.el)
    const head = h("header.tl-head", h("div.tl-titleblock", h("h2.modal-title", "Edit Video"), seg.el), pvTools)

    /* video */
    const slot = h("div.video-slot")
    const stage = h("section.stage", slot)

    /* timeline: ruler, strip, labels */
    const strip = createStrip({ frames: ctx.frames, duration: ctx.duration, height: 56, tileWidth: 52, flush: true, gap: 1 })
    strip.el.style.height = ""
    const ruler = createRuler(strip, { minTickPx: 7, minLabelPx: 60 })
    const zoomChip = h("div.tl-zoom.hidden")
    const rulerRow = h("div.tl-ruler", ruler.el, zoomChip)
    const labels = createLabelRow(ctx, strip)
    const speechMap = createSpeechMap({ strip, speech, words: false })
    const timeline = h("div.tl", rulerRow, strip.el, labels.el)

    const zoom = createHoldZoom({
      ctx,
      strip,
      transform: snapTransform(speech),
      onZoom: (z) => {
        const grown = z.zoomed && z.phase !== "releasing"
        el.classList.toggle("is-zoomed", grown)
        if (z.zoomed) {
          zoomChip.replaceChildren(icon("zoomIn"), h("b", `${fmtSeconds(z.span, z.span < 10 ? 1 : 0)} window`))
          // The readout sits at the end of the ruler away from the handle in use.
          const which = store.state.active
          const x = which ? strip.pct(store.state[which]) : 50
          zoomChip.classList.toggle("left", x > 50)
          zoomChip.classList.remove("hidden")
        } else zoomChip.classList.add("hidden")
      },
    })
    const overlay = createTrimOverlay(strip, store, {
      tooltip: false,
      onHandleDown(which, e, handleEl) {
        if (mode !== "trim") return
        const drag = zoom.onHandleDown(which, e, handleEl)
        startDrag(e, handleEl, {
          onMove: drag.onMove,
          onEnd: (ev) => {
            handleEl.classList.remove("snap-flash")
            drag.onEnd(ev)
          },
        })
      },
    })
    const preview = createPreviewOverlay(strip.el, ctx, { timeAt: strip.timeAt, pct: strip.pct })
    const offSeek = seekOnTrack(ctx, strip)

    /* bottom line: play and the playhead time; Cancel and Done */
    const play = createPlayButton(ctx, { className: "btn.ghost.icon.sm" })
    const now = createPlayheadTime(ctx)
    const cancelBtn = h("button.btn.ghost.sm.tl-cancel", { type: "button", "data-action": "cancel" }, "Cancel")
    const doneBtn = h("button.btn.primary.sm.tl-done", { type: "button", "data-action": "done" }, "Done")
    const foot = h("footer.tl-foot-row", h("div.tl-transport", play.el, now.el), h("div.tl-actions", cancelBtn, doneBtn))

    const el = h("div.modal.l5", { role: "dialog", "aria-modal": "true", "aria-label": "Edit Video", dataset: { variant: "5", mode: "trim" } }, head, stage, timeline, foot)
    ctx.placeVideo(slot)
    labels.setMode("trim")

    // In Preview, play runs the preview, not the clip.
    const onPlay = (e) => {
      if (mode !== "preview") return
      e.stopImmediatePropagation()
      const p = session.state.preview
      if (p.mode === "moving") ctx.playRange(p.start, p.end, { loop: true })
      else ctx.playRange(p.still, session.bounds().end)
    }
    play.el.addEventListener("click", onPlay, { capture: true })

    function setMode(next) {
      mode = next
      seg.set(next, { silent: true })
      strip.el.classList.toggle("no-trim", next === "preview")
      pvTools.classList.toggle("hidden", next !== "preview")
      labels.setMode(next)
      if (next === "preview") {
        if (zoom.isZoomed()) zoom.reset()
        preview.show()
        const p = session.state.preview
        ctx.seekPlayhead(p.mode === "moving" ? p.start : p.still)
      } else {
        preview.hide()
        ctx.player.pause()
      }
      el.dataset.mode = next
    }

    async function done() {
      if (busy) return
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
    function cancel() {
      if (busy) return
      session.discard()
      ctx.close({ reason: "cancel" })
    }
    const offs = [on(doneBtn, "click", done), on(cancelBtn, "click", cancel), offSeek, () => play.el.removeEventListener("click", onPlay, { capture: true })]

    return {
      el,
      strip,
      zoom,
      setMode,
      done,
      cancel,
      onKey(e) {
        if (e.key === "Escape") {
          cancel()
          return true
        }
        return nudgeHandles(ctx, e)
      },
      measure: () => ({
        ...zoom.measure(),
        mode,
        zoomChip: zoomChip.classList.contains("hidden") ? null : zoomChip.textContent,
        trackHeight: strip.el.getBoundingClientRect().height,
        rulerTick: ruler.el.dataset.tick,
        rulerLabel: ruler.el.dataset.label,
        labels: [...labels.el.querySelectorAll(".tl-tc, .tl-len, .tl-chip")].filter((n) => n.style.display !== "none").map((n) => n.textContent),
        doneLabel: doneBtn.textContent.trim(),
      }),
      destroy() {
        for (const off of offs) off()
        overlay.destroy()
        preview.destroy()
        pvToggle.destroy()
        pvLen.destroy()
        zoom.destroy()
        speechMap.destroy()
        ruler.destroy()
        labels.destroy()
        play.destroy()
        now.destroy()
        strip.destroy()
        el.remove()
      },
    }
  },
}
