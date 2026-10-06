import { fmtSeconds, h, on, startDrag } from "../util.js"
import { icon } from "../icons.js"
import { createStrip, createTrimOverlay } from "../strip.js"
import { createRuler } from "../ruler.js"
import { createHoldZoom } from "../hold-zoom.js"
import { createSpeechMap } from "../speech.js"
import { createClock, createPlayButton, seekOnTrack } from "../transport.js"
import { createPreviewOverlay, previewLengthStepper, previewModeToggle } from "../preview-ui.js"
import { nudgeHandles, quietLine, segmented, snapTransform, spinner } from "../ui.js"

const PHONE = "(max-width: 480px)"

/**
 * Layout 1: actions at the foot, right-aligned. The header is the title
 * alone. Under the video: a tools row (Trim | Preview; the preview's own
 * options while it is selected; the zoom readout while a handle is held),
 * then the ruler and the strip edge to edge, then one row with the transport
 * on the left and, on the right, the auto-trim line, Cancel and Done.
 * Nothing is written until Done; Cancel or Esc drops the draft.
 *
 * While a handle is held the strip grows. The modal's top is pinned for the
 * hold so the growth extends the bottom edge and the video stays put.
 */
export const l1 = {
  id: "L1",
  slug: "bottom-right",
  label: "Actions bottom right",
  mount(ctx) {
    const { session, speech } = ctx
    let mode = "trim"
    let busy = false
    let pinned = false

    const header = h("header.modal-head", h("h2.modal-title", "Edit Video"))
    const slot = h("div.video-slot")
    const stage = h("section.stage", slot)

    /* timeline: ruler over a flush strip, both full width */
    const strip = createStrip({ frames: ctx.frames, duration: ctx.duration, height: 64, tileWidth: 56, flush: true })
    strip.el.style.height = ""
    const ruler = createRuler(strip, { minTickPx: 12 })
    const timeline = h("div.timeline", ruler.el, strip.el)
    const speechMap = createSpeechMap({ strip, speech, words: false })
    const zoomChip = h("div.zoom-chip.hidden", { "data-slot": "zoom-chip" })
    const zoom = createHoldZoom({
      ctx,
      strip,
      transform: snapTransform(speech),
      onZoom: (z) => {
        pin(z.phase !== "idle")
        timeline.classList.toggle("zoomed", z.zoomed)
        el.classList.toggle("is-zoomed", z.zoomed)
        if (z.zoomed) {
          const mag = Math.round(ctx.duration / z.span)
          zoomChip.replaceChildren(icon("zoomIn"), h("b", `${fmtSeconds(z.span, z.span < 10 ? 1 : 0)} window`), h("span.sep", "·"), `×${mag}`)
          zoomChip.classList.remove("hidden")
        } else zoomChip.classList.add("hidden")
      },
    })
    const overlay = createTrimOverlay(strip, ctx.store, {
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

    /* tools row: the mode, its options, and the zoom readout */
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
    const pvTools = h("div.pv-tools.hidden", pvToggle.el, pvLen.el)
    const tools = h("div.tools-row", seg.el, pvTools, h("span.spacer"), zoomChip)

    /* foot row: transport left, status and actions right */
    const play = createPlayButton(ctx)
    const clock = createClock(ctx)
    const quiet = quietLine(ctx)
    const cancelBtn = h("button.btn.ghost", { type: "button", "data-action": "cancel" }, "Cancel")
    const doneBtn = h("button.btn.primary", { type: "button", "data-action": "done" }, "Done")
    const foot = h("footer.foot-row", h("div.transport", play.el, clock.el), h("span.spacer"), quiet.el, h("div.actions", cancelBtn, doneBtn))

    const el = h("div.modal.l1", { role: "dialog", "aria-modal": "true", "aria-label": "Edit Video", dataset: { variant: "L1" } }, header, stage, tools, timeline, foot)
    ctx.placeVideo(slot)

    /* Holds the modal's top edge for the length of a hold, so the strip's
       growth extends the bottom edge only. The phone sheet is bottom-anchored
       and grows upward on its own. */
    function pin(want) {
      if (want === pinned) return
      if (want && matchMedia(PHONE).matches) return
      pinned = want
      if (want) {
        el.style.top = `${el.getBoundingClientRect().top}px`
        el.style.transform = "translateX(-50%)"
      } else {
        el.style.top = ""
        el.style.transform = ""
      }
    }

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
        modalRect: el.getBoundingClientRect().toJSON(),
        stageRect: stage.getBoundingClientRect().toJSON(),
        stripRect: strip.el.getBoundingClientRect().toJSON(),
        footRect: foot.getBoundingClientRect().toJSON(),
        rulerTick: ruler.el.dataset.tick,
        rulerLabel: ruler.el.dataset.label,
        rulerTicks: ruler.el.children.length,
        doneLabel: doneBtn.textContent.trim(),
        quietLine: quiet.el.textContent,
        pinned,
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
        play.destroy()
        clock.destroy()
        strip.destroy()
        el.remove()
      },
    }
  },
}
