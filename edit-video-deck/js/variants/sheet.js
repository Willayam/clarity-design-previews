import { fmtSeconds, h, on, startDrag } from "../util.js"
import { icon } from "../icons.js"
import { createStrip, createTrimOverlay } from "../strip.js"
import { createRuler } from "../ruler.js"
import { createHoldZoom } from "../hold-zoom.js"
import { createSpeechMap } from "../speech.js"
import { createClock, createPlayButton, seekOnTrack } from "../transport.js"
import { createPreviewOverlay, previewLengthStepper, previewModeToggle } from "../preview-ui.js"
import { nudgeHandles, quietLine, saveNote, segmented, snapTransform, spinner } from "../ui.js"

/**
 * A: the sheet. Cancel and Done live in the header, as iOS Photos does it;
 * there is no footer and no X. The video fills the sheet. One strip carries
 * both tools behind a Trim | Preview segmented control, and the trim handles
 * are always on it: there is no Trim mode to enter or leave. Nothing is
 * written until Done; Done saves the trim and the preview as one write (one
 * Mux clip render) and closes; Cancel or Esc drops the draft.
 *
 * Zoom feedback: the strip grows taller, a time ruler above it respaces its
 * ticks from seconds to tenths as the window shrinks, and a readout names the
 * window ("6 s window · 7 ms per px").
 */
export const sheet = {
  id: "A",
  slug: "sheet",
  label: "Sheet",
  subtitle: "Cancel and Done in the header · one strip, Trim | Preview · zoom: taller strip, ruler, readout",
  mount(ctx) {
    const { store, session, speech } = ctx
    let mode = "trim"
    let busy = false

    /* header */
    const cancelBtn = h("button.btn.ghost.head-cancel", { type: "button", "data-action": "cancel" }, "Cancel")
    const doneBtn = h("button.btn.primary.head-done", { type: "button", "data-action": "done" }, "Done")
    const note = saveNote(ctx)
    const header = h("header.modal-head", cancelBtn, h("h2.modal-title", "Edit Video"), h("div.head-right", note.el, doneBtn))

    /* stage */
    const slot = h("div.video-slot")
    const stage = h("section.stage", slot)

    /* dock */
    const strip = createStrip({ frames: ctx.frames, duration: ctx.duration, height: 64, tileWidth: 56, labels: false, ruler: false })
    strip.el.style.height = ""
    const ruler = createRuler(strip)
    const zoomChip = h("div.zoom-chip.hidden", { "data-slot": "zoom-chip" })
    const hint = h("div.track-hint", icon("zoomIn"), h("span", "Hold a handle still to zoom in"))
    const trackBlock = h("div.track-block", ruler.el, strip.el, hint)
    const speechMap = createSpeechMap({ strip, speech, words: false })
    const zoom = createHoldZoom({
      ctx,
      strip,
      transform: snapTransform(speech),
      onZoom: (z) => {
        trackBlock.classList.toggle("zoomed", z.zoomed)
        el.classList.toggle("is-zoomed", z.zoomed)
        if (z.zoomed) {
          const mag = Math.round(ctx.duration / z.span)
          zoomChip.replaceChildren(icon("zoomIn"), h("b", `${fmtSeconds(z.span, z.span < 10 ? 1 : 0)} window`), h("span.sep", "·"), `${(z.spp * 1000).toFixed(0)} ms per px`, h("span.sep", "·"), `×${mag}`)
          zoomChip.classList.remove("hidden")
        } else zoomChip.classList.add("hidden")
      },
    })
    const overlay = createTrimOverlay(strip, store, {
      hints: { start: "Hold still to zoom in", end: "Hold still to zoom in" },
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
    const pvToggle = previewModeToggle(ctx, segmented, { className: "xs" })
    const pvLen = previewLengthStepper(ctx)
    const pvTools = h("div.plane-tools.hidden", pvToggle.el, pvLen.el)
    const seg = segmented(
      [
        { v: "trim", label: "Trim", icon: "scissors", title: "Where the video starts and ends" },
        { v: "preview", label: "Preview", icon: "film", title: "What the page shows before play" },
      ],
      "trim",
      (v) => setMode(v),
    )
    const quiet = quietLine(ctx)
    const tools = h("div.tools-row", seg.el, quiet.el, h("span.spacer"), pvTools, zoomChip)
    const play = createPlayButton(ctx, {
      toggle: () => {
        if (mode !== "preview") return ctx.togglePlay()
        const p = session.state.preview
        if (p.mode === "moving") ctx.playRange(p.start, p.end, { loop: true })
        else ctx.playRange(p.still, session.bounds().end)
      },
    })
    const clock = createClock(ctx)
    const row = h("div.dock-row", play.el, clock.el, trackBlock)
    const dock = h("div.dock.panel.sheet-dock", tools, row)
    const offSeek = seekOnTrack(ctx, strip)

    const el = h("div.modal.sheet", { role: "dialog", "aria-modal": "true", "aria-label": "Edit Video", dataset: { variant: "A" } }, header, stage, dock)
    ctx.placeVideo(slot)

    function setMode(next) {
      mode = next
      seg.set(next, { silent: true })
      strip.el.classList.toggle("no-trim", next === "preview")
      pvTools.classList.toggle("hidden", next !== "preview")
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
    const offs = [on(doneBtn, "click", done), on(cancelBtn, "click", cancel), offSeek]

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
        rulerTicks: ruler.el.children.length,
        doneLabel: doneBtn.textContent.trim(),
        saveNote: note.el.textContent,
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
