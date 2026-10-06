import { clamp, h, on, rafCoalesce, startDrag, tween } from "../util.js"
import { icon } from "../icons.js"
import { createStrip, createTrimOverlay } from "../strip.js"
import { createHoldZoom } from "../hold-zoom.js"
import { createSpeechMap } from "../speech.js"
import { createClock, seekOnTrack } from "../transport.js"
import { createPreviewOverlay, previewLengthStepper, previewModeToggle } from "../preview-ui.js"
import { nudgeHandles, segmented, snapTransform, spinner } from "../ui.js"

/** The preview range fills about this much of the strip: 3 s in a 10 s window. */
const PREVIEW_FILL = 0.3
/** Seconds in view around a still frame. */
const STILL_SPAN = 10
/** Pixels from the strip's edge where a dragged preview starts panning the window. */
const PAN_MARGIN = 28
const FIT_MS = 320

/**
 * Deck console, round 3. No header and no title: the modal is the picture
 * with the strip as its base. The transport (play, time) is a pill on the
 * picture's bottom-left corner. One console row sits between picture and
 * strip: Trim | Preview on the left, the trim status with Reset (or the
 * preview's Moving | Still and length) centered, Cancel and Done on the right.
 * The strip runs the full width under it with nothing beside it.
 *
 * Time is read from the frames, not from numbers: there is no ruler. Holding a
 * handle zooms the strip, and the frame tiles widen and split into larger
 * frames at their own times; letting go shrinks them back. Preview mode zooms
 * the strip to a window around the preview range the same way, with a
 * hairline overview above the strip to move that window.
 *
 * Nothing is written until Done; Done saves the trim and the preview as one
 * write and closes; Cancel or Esc drops the whole draft, so Reset is undoable.
 */
export const deck = {
  id: "D",
  slug: "deck",
  label: "Deck console",
  subtitle: "Transport on the picture · one console row · frames are the scale",
  mount(ctx) {
    const { store, session, speech } = ctx
    let mode = "trim"
    let busy = false

    /* the picture, with the transport on it */
    const slot = h("div.video-slot")
    const playBtn = h("button.hud-play", { type: "button", "aria-label": "Play", "data-action": "play" }, icon("play"))
    const clock = createClock(ctx)
    const transport = h("div.console-transport", playBtn, clock.el)
    const stage = h("section.stage.deck-stage", slot)

    /* the strip */
    const strip = createStrip({ frames: ctx.frames, duration: ctx.duration, height: 64, tileWidth: 56, maxTileWidth: 164, flush: true })
    strip.el.style.height = ""
    const speechMap = createSpeechMap({ strip, speech, words: false })
    const zoom = createHoldZoom({ ctx, strip, transform: snapTransform(speech) })
    const overlay = createTrimOverlay(strip, store, {
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
    const offSeek = seekOnTrack(ctx, strip)

    /* the preview's window: a few seconds around the range, moved from the overview or by dragging to an edge */
    let cancelFit = null
    const clampWin = (s, span) => {
      const d = ctx.duration
      span = Math.min(span, d)
      s = clamp(s, 0, d - span)
      return { s, e: s + span }
    }
    const animateWindow = (target, ms) => {
      cancelFit?.()
      const from = strip.getWindow()
      cancelFit = tween({
        from: [from.s, from.e],
        to: [target.s, target.e],
        duration: ms,
        onUpdate: ([s, e]) => strip.setWindow(s, e),
        onDone: () => {
          cancelFit = null
        },
      })
    }
    const previewWindow = () => {
      const p = session.state.preview
      const moving = p.mode === "moving"
      const span = moving ? (p.end - p.start) / PREVIEW_FILL : STILL_SPAN
      const center = moving ? (p.start + p.end) / 2 : p.still
      return clampWin(center - span / 2, span)
    }
    const fitPreview = () => animateWindow(previewWindow(), FIT_MS)
    /** After a drag that panned past the range, slide the window the short way back until the range is in view. */
    const showRange = () => {
      const p = session.state.preview
      const w = strip.getWindow()
      const span = w.e - w.s
      const pad = span * 0.08
      const s = p.mode === "moving" ? p.start : p.still
      const e = p.mode === "moving" ? p.end : p.still
      if (s >= w.s && e <= w.e) return
      const target = e > w.e ? clampWin(e + pad - span, span) : clampWin(s - pad, span)
      animateWindow(target, 200)
    }
    const preview = createPreviewOverlay(strip.el, ctx, { timeAt: strip.timeAt, pct: strip.pct }, {
      onDragFrame(ev) {
        const r = strip.rect()
        const p = session.state.preview
        const b = session.bounds()
        let over = 0
        if (ev.clientX > r.right - PAN_MARGIN) over = ev.clientX - (r.right - PAN_MARGIN)
        else if (ev.clientX < r.left + PAN_MARGIN) over = ev.clientX - (r.left + PAN_MARGIN)
        if (!over) return false
        const lead = p.mode === "moving" ? (over > 0 ? p.end : p.start) : p.still
        if (over > 0 ? lead >= b.end - 1e-6 : lead <= b.start + 1e-6) return false
        const rate = (Math.sign(over) * Math.min(Math.abs(over), 60)) / 60
        const w = strip.getWindow()
        const span = w.e - w.s
        const nw = clampWin(w.s + (rate * span * 0.7) / 60, span)
        if (Math.abs(nw.s - w.s) < 1e-9) return false
        strip.setWindow(nw.s, nw.e)
        return true
      },
    })

    const ovTrim = h("i.ov-trim")
    const ovWin = h("i.ov-win")
    const overview = h("div.overview", { "data-slot": "overview", "aria-hidden": "true" }, ovTrim, ovWin)
    const paintOverview = () => {
      const d = ctx.duration
      const s = store.state
      const w = strip.getWindow()
      ovTrim.style.left = `${(s.start / d) * 100}%`
      ovTrim.style.width = `${((s.end - s.start) / d) * 100}%`
      ovWin.style.left = `${(w.s / d) * 100}%`
      ovWin.style.width = `${((w.e - w.s) / d) * 100}%`
    }
    const schedOverview = rafCoalesce(paintOverview)
    const offOverview = on(overview, "pointerdown", (e) => {
      if (e.button !== 0) return
      e.preventDefault()
      cancelFit?.()
      cancelFit = null
      const r = overview.getBoundingClientRect()
      const at = (x) => clamp((x - r.left) / r.width, 0, 1) * ctx.duration
      const w = strip.getWindow()
      const span = w.e - w.s
      const t0 = at(e.clientX)
      // A press inside the marker drags it by its offset; elsewhere it centers on the press.
      const offset = t0 >= w.s && t0 <= w.e ? (w.s + w.e) / 2 - t0 : 0
      const place = (x) => {
        const nw = clampWin(at(x) + offset - span / 2, span)
        strip.setWindow(nw.s, nw.e)
      }
      place(e.clientX)
      startDrag(e, overview, { onMove: (ev) => place(ev.clientX), onEnd: () => {} })
    })
    const stripWrap = h("div.strip-wrap", overview, strip.el)

    /* the console row */
    const seg = segmented(
      [
        { v: "trim", label: "Trim" },
        { v: "preview", label: "Preview" },
      ],
      "trim",
      (v) => setMode(v),
    )
    const statusText = h("span")
    const resetBtn = h("button.btn.reset", { type: "button", "data-action": "reset" }, "Reset")
    const trimLine = h("div.trim-line", statusText, resetBtn)
    const paintStatus = () => {
      const auto = speech.autoTrim
      const d = session.trimDraft()
      const isAuto = Math.abs(d.start - auto.start) < 0.0005 && Math.abs(d.end - auto.end) < 0.0005
      trimLine.classList.toggle("hidden", session.isFull() || mode === "preview")
      statusText.textContent = isAuto ? "Auto-trimmed" : "Trimmed"
    }
    const schedStatus = rafCoalesce(paintStatus)
    const pvToggle = previewModeToggle(ctx, segmented, { onChange: () => fitPreview() })
    const pvLen = previewLengthStepper(ctx, { onChange: () => fitPreview() })
    const pvTools = h("div.plane-tools.hidden", pvToggle.el, pvLen.el)
    // Labels only: no hover explainers and no icons on the preview controls.
    for (const n of pvTools.querySelectorAll("[title]")) n.removeAttribute("title")
    for (const n of pvToggle.el.querySelectorAll("svg")) n.remove()
    const consoleCenter = h("div.console-center", trimLine, pvTools)
    const cancelBtn = h("button.btn.ghost", { type: "button", "data-action": "cancel" }, "Cancel")
    const doneBtn = h("button.btn.primary.deck-done", { type: "button", "data-action": "done" }, "Done")
    const actions = h("div.console-actions", cancelBtn, doneBtn)
    const consoleRow = h("div.console", h("div.console-left", transport, seg.el), consoleCenter, actions)

    const el = h("div.modal.deck", { role: "dialog", "aria-modal": "true", "aria-label": "Edit Video", dataset: { variant: "D", mode } }, stage, consoleRow, stripWrap)
    ctx.placeVideo(slot)
    for (const type of ["selectstart", "contextmenu", "dragstart"]) el.addEventListener(type, (event) => event.preventDefault())
    const offWin = strip.onWindow(() => {
      el.classList.toggle("is-zoomed", strip.span() < ctx.duration - 1e-6)
      schedOverview()
    })

    /* transport */
    const togglePlay = () => {
      if (mode !== "preview") return ctx.togglePlay()
      const p = session.state.preview
      if (p.mode === "moving") ctx.playRange(p.start, p.end, { loop: true })
      else ctx.playRange(p.still, session.bounds().end)
    }
    const syncPlay = () => {
      const playing = !ctx.player.paused
      playBtn.replaceChildren(icon(playing ? "pause" : "play"))
      playBtn.setAttribute("aria-label", playing ? "Pause" : "Play")
    }
    syncPlay()

    function setMode(next) {
      mode = next
      seg.set(next, { silent: true })
      strip.el.classList.toggle("no-trim", next === "preview")
      pvTools.classList.toggle("hidden", next !== "preview")
      el.dataset.mode = next
      if (next === "preview") {
        preview.show()
        const p = session.state.preview
        ctx.seekPlayhead(p.mode === "moving" ? p.start : p.still)
        fitPreview()
      } else {
        preview.hide()
        ctx.player.pause()
        cancelFit?.()
        cancelFit = null
        zoom.reset()
      }
      schedStatus()
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
    const reset = () => session.restoreFull()
    const offs = [
      on(doneBtn, "click", done),
      on(cancelBtn, "click", cancel),
      on(resetBtn, "click", reset),
      on(playBtn, "click", togglePlay),
      on(slot, "click", togglePlay),
      ctx.player.on("play", syncPlay),
      ctx.player.on("pause", syncPlay),
      ctx.player.on("ended", syncPlay),
      store.subscribe(() => {
        schedStatus()
        schedOverview()
      }),
      offSeek,
      offWin,
      offOverview,
      on(strip.el, "pointerup", () => { if (mode === "preview") showRange() }),
      on(strip.el, "pointercancel", () => { if (mode === "preview") showRange() }),
    ]
    paintStatus()
    paintOverview()

    return {
      el,
      strip,
      zoom,
      setMode,
      fitPreview,
      done,
      cancel,
      reset,
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
        level: strip.level(),
        tilePx: +strip.tilePx().toFixed(1),
        window: strip.getWindow(),
        trackHeight: strip.el.getBoundingClientRect().height,
        trackRect: strip.el.getBoundingClientRect().toJSON(),
        stageRect: stage.getBoundingClientRect().toJSON(),
        modalRect: el.getBoundingClientRect().toJSON(),
        consoleRect: consoleRow.getBoundingClientRect().toJSON(),
        status: trimLine.classList.contains("hidden") ? null : trimLine.textContent.trim(),
        overviewShown: getComputedStyle(overview).opacity !== "0",
        doneLabel: doneBtn.textContent.trim(),
      }),
      destroy() {
        cancelFit?.()
        for (const off of offs) off()
        schedStatus.cancel()
        schedOverview.cancel()
        overlay.destroy()
        preview.destroy()
        pvToggle.destroy()
        pvLen.destroy()
        zoom.destroy()
        speechMap.destroy()
        clock.destroy()
        strip.destroy()
        el.remove()
      },
    }
  },
}
