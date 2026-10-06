import { clamp, fmtSpan, fmtWhole, h, on, rafCoalesce, startDrag } from "../util.js"
import { icon } from "../icons.js"
import { createStrip, createTrimOverlay } from "../strip.js"
import { createHoldZoom } from "../hold-zoom.js"
import { createSpeechMap } from "../speech.js"
import { createClock, createPlayButton, seekOnTrack } from "../transport.js"
import { movePreview } from "../preview.js"
import { previewLengthStepper } from "../preview-ui.js"
import { nudgeHandles, segmented, snapTransform, spinner } from "../ui.js"

const GRACE_MS = 3000

/**
 * C: the stage. The modal is the video; the chrome floats over it as dark
 * glass, a title bar with one Done and a dock with the strip. Edits save as
 * you go: a moved handle starts a three-second countdown ("Trim saves in 3 s
 * · Undo"), then one write and one Mux clip render; Undo during the countdown
 * cancels it and Undo after a save puts the previous trim back. So Done only
 * closes, and there is nothing to cancel. The preview is set from the
 * playhead: scrub to a moment and press "Set preview here".
 *
 * Zoom feedback: a minimap above the strip whose bright sliver shrinks to the
 * six seconds in view, a magnification badge ("×35 · 6 s"), and the spoken
 * words appearing under the frames as the window narrows.
 */
export const stage = {
  id: "C",
  slug: "stage",
  label: "Stage",
  subtitle: "The video is the modal · saves as you go with Undo, Done only closes · zoom: minimap, ×35 badge, words",
  mount(ctx) {
    const { store, session, speech } = ctx
    let grace = null
    let savedFlashUntil = 0
    let busy = false

    /* top bar */
    const doneBtn = h("button.btn.primary", { type: "button", "data-action": "done" }, "Done")
    const saveState = h("span.save-state", { "data-slot": "save-state" })
    const head = h("header.stage-head.glass.glass-media", h("h2.modal-title", "Edit Video"), h("span.spacer"), saveState, doneBtn)

    /* video */
    const slot = h("div.video-slot")

    /* preview chip */
    const thumb = h("canvas.pchip-thumb", { width: 128, height: 72 })
    const pchipText = h("span.pchip-text")
    const pvToggle = segmented(
      [
        { v: "moving", label: "Moving", icon: "film" },
        { v: "still", label: "Still", icon: "image" },
      ],
      session.state.preview.mode,
      (mode) => {
        session.setPreview({ ...session.state.preview, mode })
        void savePreview()
      },
      { className: "xs" },
    )
    const pvLen = previewLengthStepper(ctx, { onChange: () => void savePreview() })
    const pchipPlay = h("button.btn.ghost.icon.sm", { type: "button", "aria-label": "Play the preview", onclick: () => { const p = session.state.preview; if (p.mode === "moving") ctx.playRange(p.start, p.end); else ctx.seekPlayhead(p.still) } }, icon("play"))
    const pchip = h("div.pchip.glass.glass-media", { "data-slot": "preview-chip" }, thumb, h("div.pchip-body", h("span.pchip-kicker", "Preview on the page"), pchipText, h("div.plane-tools", pvToggle.el, pvLen.el)), pchipPlay)

    /* dock */
    const strip = createStrip({ frames: ctx.frames, duration: ctx.duration, height: 56, tileWidth: 56 })
    const speechMap = createSpeechMap({ strip, speech, words: true })
    const minimap = h("div.minimap", { "data-slot": "minimap" }, h("span.mlabel.l", "0:00"), h("i.mtrim"), h("i.mwin"), h("span.mlabel.r", fmtWhole(ctx.duration)))
    const badge = h("div.mag-badge.hidden", { "data-slot": "mag-badge" })
    const wrap = h("div.track-wrap", minimap, strip.el, badge)
    const paintMinimap = (win) => {
      const d = ctx.duration
      const s = store.state
      minimap.querySelector(".mtrim").style.left = `${(s.start / d) * 100}%`
      minimap.querySelector(".mtrim").style.width = `${((s.end - s.start) / d) * 100}%`
      const w = win ?? strip.getWindow()
      minimap.querySelector(".mwin").style.left = `${(w.s / d) * 100}%`
      minimap.querySelector(".mwin").style.width = `${Math.max(0.4, ((w.e - w.s) / d) * 100)}%`
    }
    const zoom = createHoldZoom({
      ctx,
      strip,
      transform: snapTransform(speech),
      onZoom: (z) => {
        paintMinimap(z.window)
        el.classList.toggle("is-zoomed", z.zoomed)
        wrap.classList.toggle("zoomed", z.zoomed)
        if (z.zoomed) {
          badge.replaceChildren(icon("zoomIn"), h("b", `×${Math.round(ctx.duration / z.span)}`), h("span", `${z.span < 10 ? z.span.toFixed(1) : Math.round(z.span)} s in view`))
          badge.classList.remove("hidden")
        } else badge.classList.add("hidden")
      },
    })
    const overlay = createTrimOverlay(strip, store, {
      hints: { start: "Hold still to zoom in", end: "Hold still to zoom in" },
      onHandleDown(which, e, handleEl) {
        const drag = zoom.onHandleDown(which, e, handleEl)
        startDrag(e, handleEl, {
          onMove: drag.onMove,
          onEnd: (ev) => {
            handleEl.classList.remove("snap-flash")
            drag.onEnd(ev)
            afterTrimEdit()
          },
        })
      },
    })
    const play = createPlayButton(ctx)
    const clock = createClock(ctx)
    const setPreviewBtn = h("button.btn.outline.sm.on-media", { type: "button", "data-action": "set-preview", title: "Use the frame under the playhead as the preview" }, icon("pin"), "Set preview here")
    const row1 = h("div.dock-row", play.el, clock.el, wrap, setPreviewBtn)
    const line = h("div.quiet-line.save-line", { "data-slot": "quiet-line" })
    const dock = h("div.dock.glass.glass-media.stage-dock", row1, line)
    const offSeek = seekOnTrack(ctx, strip)

    const el = h("div.modal.stage", { role: "dialog", "aria-modal": "true", "aria-label": "Edit Video", dataset: { variant: "C" } }, slot, head, pchip, dock)
    ctx.placeVideo(slot)

    /* save as you go */
    const cancelGrace = () => {
      if (!grace) return
      clearTimeout(grace.timer)
      clearInterval(grace.tick)
      grace = null
    }
    function scheduleSave() {
      cancelGrace()
      if (!session.trimDirty()) {
        paint()
        return
      }
      grace = { until: performance.now() + GRACE_MS, timer: setTimeout(() => void saveNow(), GRACE_MS), tick: setInterval(paint, 250) }
      paint()
    }
    async function saveNow() {
      cancelGrace()
      if (!session.dirty()) {
        paint()
        return
      }
      busy = true
      paint()
      await session.commit()
      busy = false
      savedFlashUntil = performance.now() + 4000
      paint()
      setTimeout(paint, 4100)
    }
    function afterTrimEdit() {
      scheduleSave()
    }
    function undo() {
      if (grace) {
        cancelGrace()
        session.discard()
        paint()
        return
      }
      if (session.canUndo()) {
        session.undoToPrevious()
        void saveNow()
      }
    }
    async function savePreview() {
      cancelGrace()
      await saveNow()
    }
    function setPreviewHere() {
      const t = store.state.playhead
      const b = session.bounds()
      const p = session.state.preview
      const start = clamp(t, b.start, Math.max(b.start, b.end - 3))
      session.setPreview(movePreview({ ...p, start, end: start + 3, still: t }, "still", t, b))
      void savePreview()
    }

    const act = (label, fn, name) => h("button.btn.link.xs", { type: "button", "data-action": name, onclick: fn }, label)
    function paint() {
      const auto = speech.autoTrim
      const c = session.state.committed.trim
      const committedIsAuto = Math.abs(c.start - auto.start) < 0.0005 && Math.abs(c.end - auto.end) < 0.0005
      const committedIsFull = c.start < 0.0005 && c.end > ctx.duration - 0.0005
      const autoSilence = auto.start + (ctx.duration - auto.end)
      if (store.state.active && session.trimDirty()) {
        line.replaceChildren(icon("scissors"), h("span", "Trim saves when you let go"))
        line.dataset.state = "pending"
        saveState.replaceChildren(h("i.dirty-dot"), "Saves when you let go")
        saveState.dataset.state = "pending"
      } else if (grace) {
        const left = Math.max(1, Math.ceil((grace.until - performance.now()) / 1000))
        line.replaceChildren(icon("scissors"), h("span", `Trim saves in ${left} s`), h("span.dot", "·"), act("Undo", undo, "undo"))
        line.dataset.state = "pending"
        saveState.replaceChildren(h("i.dirty-dot"), `Saves in ${left} s`)
        saveState.dataset.state = "pending"
      } else if (session.state.save === "saving") {
        line.replaceChildren(spinner(), h("span", "Saving trim…"))
        line.dataset.state = "saving"
        saveState.replaceChildren(spinner(), "Saving…")
        saveState.dataset.state = "saving"
      } else {
        if (performance.now() < savedFlashUntil && session.canUndo()) {
          line.replaceChildren(icon("checkCircle"), h("span", committedIsFull ? "Whole video kept" : `Trim saved, ${fmtSpan(session.silenceRemoved())} removed`), h("span.dot", "·"), act("Undo", undo, "undo"))
        } else if (committedIsAuto) {
          line.replaceChildren(icon("sparkles"), h("span", `Trimmed ${fmtSpan(autoSilence)} of silence`), h("span.dot", "·"), act("Undo", () => { session.restoreFull(); scheduleSave() }, "undo-auto"))
        } else if (committedIsFull) {
          line.replaceChildren(icon("audioLines"), h("span", "Whole video kept"), h("span.dot", "·"), act(`Trim ${fmtSpan(autoSilence)} of silence`, () => { session.reapplyAuto(); scheduleSave() }, "redo-auto"))
        } else {
          line.replaceChildren(icon("scissors"), h("span", `Trimmed ${fmtSpan(session.silenceRemoved())}, adjusted by hand`), h("span.dot", "·"), session.canUndo() ? act("Undo", undo, "undo") : act("Back to auto", () => { session.reapplyAuto(); scheduleSave() }, "redo-auto"))
        }
        line.dataset.state = "saved"
        saveState.replaceChildren(icon("checkCircle"), "All changes saved")
        saveState.dataset.state = "saved"
      }
      paintMinimap()
      paintChip()
    }
    let thumbKey = null
    function paintChip() {
      const p = session.state.preview
      const t = p.mode === "moving" ? p.start : p.still
      pchipText.textContent = p.mode === "moving" ? `${fmtWhole(p.start)} to ${fmtWhole(p.end)} · ${(p.end - p.start).toFixed(0)} s loop` : `Frame at ${fmtWhole(p.still)}`
      const near = ctx.frames.nearest(t, 2)
      const key = near ? near.t : null
      if (near && key !== thumbKey) {
        thumbKey = key
        thumb.getContext("2d").drawImage(near.frame, 0, 0, 128, 72)
      }
    }
    const sched = rafCoalesce(paint)
    const offs = [
      session.subscribe(() => sched()),
      store.subscribe((s, prev, meta) => {
        // A pressed handle pauses the countdown: the save waits for the release.
        if (meta.reason === "active" && s.active && grace) cancelGrace()
        if (meta.reason === "handle" || meta.reason === "range" || meta.reason === "active") sched()
      }),
      ctx.frames.subscribe(() => sched()),
      on(setPreviewBtn, "click", setPreviewHere),
      on(doneBtn, "click", () => void done()),
      offSeek,
    ]
    paint()

    async function done() {
      if (busy) return
      const trimChanged = session.trimDirty()
      if (grace) await saveNow()
      ctx.close({ reason: "done", trimChanged, previewChanged: false })
    }

    return {
      el,
      strip,
      zoom,
      done,
      scheduleSave,
      saveNow,
      undo,
      setPreviewHere,
      onKey(e) {
        if (e.key === "Escape") {
          void done()
          return true
        }
        if (nudgeHandles(ctx, e)) {
          scheduleSave()
          return true
        }
        return false
      },
      measure: () => ({
        ...zoom.measure(),
        line: line.textContent,
        lineState: line.dataset.state,
        saveState: saveState.textContent,
        badge: badge.classList.contains("hidden") ? null : badge.textContent,
        minimapWindowPct: minimap.querySelector(".mwin").style.width,
        wordChips: strip.el.querySelectorAll(".word-chips .word").length,
        gracePending: Boolean(grace),
      }),
      destroy() {
        cancelGrace()
        for (const off of offs) off()
        sched.cancel()
        overlay.destroy()
        pvLen.destroy()
        zoom.destroy()
        speechMap.destroy()
        play.destroy()
        clock.destroy()
        strip.destroy()
        el.remove()
      },
    }
  },
}
