import { fmtSeconds, h, on, startDrag } from "../util.js"
import { icon } from "../icons.js"
import { createStrip, createTrimOverlay } from "../strip.js"
import { createRuler } from "../ruler.js"
import { createHoldZoom } from "../hold-zoom.js"
import { createSpeechMap } from "../speech.js"
import { createClock, createPlayButton, seekOnTrack } from "../transport.js"
import { createPreviewOverlay, previewLengthStepper, previewModeToggle } from "../preview-ui.js"
import { nudgeHandles, quietLine, segmented, snapTransform, spinner } from "../ui.js"

/**
 * Layout 4: one toolbar. The header carries everything that is not the
 * timeline: the title on the left, Trim | Preview in the center, Cancel and
 * Done together on the right. Below the video there is only the timeline: the
 * time on its own line, the ruler and the full-width strip, and the trim (or
 * preview) settings right-aligned under the strip.
 *
 * Nothing is written until Done; Done saves trim and preview as one write and
 * closes; Cancel or Esc drops the draft.
 *
 * Zoom feedback: the strip grows down over the settings line, the ruler
 * respaces, and the time line shows "6.0 s window · ×35" on its right.
 */
export const toolbar = {
  id: "4",
  slug: "toolbar",
  label: "Header toolbar",
  subtitle: "Title left, Trim | Preview center, Cancel and Done right",
  mount(ctx) {
    const { store, session, speech } = ctx
    let mode = "trim"
    let busy = false

    /* header: title, mode, actions */
    const seg = segmented(
      [
        { v: "trim", label: "Trim", icon: "scissors" },
        { v: "preview", label: "Preview", icon: "film" },
      ],
      "trim",
      (v) => setMode(v),
    )
    const cancelBtn = h("button.btn.quiet", { type: "button", "data-action": "cancel" }, "Cancel")
    const doneBtn = h("button.btn.primary", { type: "button", "data-action": "done" }, "Done")
    const header = h(
      "header.tb-head",
      h("h2.modal-title.tb-title", "Edit Video"),
      h("div.tb-seg", seg.el),
      h("div.tb-actions", cancelBtn, doneBtn),
    )

    /* video */
    const slot = h("div.video-slot")
    const stage = h("section.stage.tb-stage", slot)

    /* timeline */
    const strip = createStrip({ frames: ctx.frames, duration: ctx.duration, height: 56, tileWidth: 84, flush: true, labels: false, ruler: false })
    strip.el.style.height = ""
    const ruler = createRuler(strip, { minTickPx: 14, minLabelPx: 64 })
    const speechMap = createSpeechMap({ strip, speech, words: false })
    const zoomChip = h("div.tb-zoom")
    const block = h("div.tb-block")
    const zoom = createHoldZoom({
      ctx,
      strip,
      transform: snapTransform(speech),
      onZoom: (z) => {
        block.classList.toggle("zoomed", z.zoomed)
        el.classList.toggle("is-zoomed", z.zoomed)
        if (z.zoomed) {
          const mag = Math.round(ctx.duration / z.span)
          zoomChip.replaceChildren(icon("zoomIn"), h("b", `${fmtSeconds(z.span, z.span < 10 ? 1 : 0)} window`), h("span.sep", "·"), `×${mag}`)
          zoomChip.classList.add("on")
        } else zoomChip.classList.remove("on")
      },
    })
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
    const preview = createPreviewOverlay(strip.el, ctx, { timeAt: strip.timeAt, pct: strip.pct })
    const pvToggle = previewModeToggle(ctx, segmented, { className: "xs" })
    const pvLen = previewLengthStepper(ctx)
    const quiet = quietLine(ctx)
    const pvTools = h("div.tb-pv.hidden", pvToggle.el, pvLen.el)
    const settings = h("div.tb-settings", quiet.el, pvTools)
    block.append(ruler.el, strip.el, settings)

    const play = createPlayButton(ctx, { className: "btn.quiet.icon.sm" })
    // In Preview the play button plays the preview, as the strip's tag does.
    play.el.addEventListener(
      "click",
      (e) => {
        if (mode !== "preview") return
        e.stopImmediatePropagation()
        const p = session.state.preview
        if (p.mode === "moving") ctx.playRange(p.start, p.end, { loop: true })
        else ctx.playRange(p.still, session.bounds().end)
      },
      { capture: true },
    )
    const clock = createClock(ctx)
    const timeLine = h("div.tb-time", play.el, clock.el, h("span.spacer"), zoomChip)
    const editor = h("div.tb-edit", timeLine, block)
    const offSeek = seekOnTrack(ctx, strip)

    const el = h(
      "div.modal.tb",
      { role: "dialog", "aria-modal": "true", "aria-label": "Edit Video", dataset: { variant: "4", mode: "trim" } },
      header,
      stage,
      editor,
    )
    ctx.placeVideo(slot)
    on(slot, "click", () => ctx.togglePlay())

    function setMode(next) {
      mode = next
      seg.set(next, { silent: true })
      strip.el.classList.toggle("no-trim", next === "preview")
      quiet.el.classList.toggle("hidden", next === "preview")
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
        cancelBtn.disabled = true
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
        zoomChip: zoomChip.classList.contains("on") ? zoomChip.textContent : null,
        trackHeight: strip.el.getBoundingClientRect().height,
        rulerTick: ruler.el.dataset.tick,
        rulerLabel: ruler.el.dataset.label,
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
        quiet.destroy()
        play.destroy()
        clock.destroy()
        strip.destroy()
        el.remove()
      },
    }
  },
}
