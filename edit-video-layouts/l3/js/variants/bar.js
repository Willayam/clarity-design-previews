import { fmtSeconds, fmtSpan, h, on, rafCoalesce, startDrag } from "../util.js"
import { icon } from "../icons.js"
import { createStrip, createTrimOverlay } from "../strip.js"
import { createRuler } from "../ruler.js"
import { createHoldZoom } from "../hold-zoom.js"
import { createSpeechMap } from "../speech.js"
import { createClock, createPlayButton, seekOnTrack } from "../transport.js"
import { createPreviewOverlay, previewLengthStepper, previewModeToggle } from "../preview-ui.js"
import { nudgeHandles, segmented, snapTransform, spinner } from "../ui.js"

/**
 * Layout 3, the player toolbar. No header: the video starts at the top edge.
 * One toolbar row sits between the video and the timeline: the Trim | Preview
 * segment on the left, play and the clock centred under the video, and on the
 * right the active mode's tools (the trim line, or Moving | Still and the
 * length) followed by Cancel and Done. The ruler and the strip come last and
 * span the full width.
 *
 * Zoom feedback: the strip grows downward (the modal is top-anchored so
 * nothing above it moves), the ruler respaces, and the centred clock turns
 * into a "6.0 s window" readout until the handle is released.
 */

/** The trim line, short enough to share the toolbar with the actions. */
function trimLine(ctx) {
  const { session, speech } = ctx
  const el = h("div.trim-line")
  const paint = () => {
    const auto = speech.autoTrim
    const d = session.trimDraft()
    const isAuto = Math.abs(d.start - auto.start) < 0.0005 && Math.abs(d.end - auto.end) < 0.0005
    const autoSilence = auto.start + (ctx.duration - auto.end)
    const act = (label, fn, name) => h("button.btn.link.xs", { type: "button", "data-action": name, onclick: fn }, label)
    const dot = h("span.dot", "·")
    if (isAuto) el.replaceChildren(icon("sparkles"), h("span", `Trimmed ${fmtSpan(autoSilence)}`, h("span.long", " of silence")), dot, act("Undo", () => session.restoreFull(), "undo-auto"))
    else if (session.isFull()) el.replaceChildren(icon("audioLines"), h("span", "Whole video"), dot, act(`Trim ${fmtSpan(autoSilence)}`, () => session.reapplyAuto(), "redo-auto"))
    else el.replaceChildren(icon("scissors"), h("span", `Trimmed ${fmtSpan(session.draftSilence())}`), dot, act("Back to auto", () => session.reapplyAuto(), "redo-auto"))
  }
  const sched = rafCoalesce(paint)
  const off = ctx.store.subscribe(() => sched())
  paint()
  return {
    el,
    destroy() {
      off()
      sched.cancel()
    },
  }
}

export const bar = {
  id: "L3",
  slug: "bar",
  label: "Player toolbar",
  mount(ctx) {
    const { store, session, speech } = ctx
    let mode = "trim"
    let busy = false

    /* video */
    const slot = h("div.video-slot")
    const stage = h("section.stage", slot)

    /* toolbar: mode | transport | mode tools + actions */
    const seg = segmented(
      [
        { v: "trim", label: "Trim", icon: "scissors" },
        { v: "preview", label: "Preview", icon: "film" },
      ],
      "trim",
      (v) => setMode(v),
    )
    const play = createPlayButton(ctx, {
      className: "btn.ghost.icon.sm",
      toggle: () => {
        if (mode !== "preview") return ctx.togglePlay()
        const p = session.state.preview
        if (p.mode === "moving") ctx.playRange(p.start, p.end, { loop: true })
        else ctx.playRange(p.still, session.bounds().end)
      },
    })
    const clock = createClock(ctx)
    const transport = h("div.transport", play.el, clock.el)
    const zoomChip = h("div.zoom-chip.hidden", { "data-slot": "zoom-chip", role: "status" })
    const trim = trimLine(ctx)
    const pvToggle = previewModeToggle(ctx, segmented, { className: "xs" })
    const pvLen = previewLengthStepper(ctx)
    const pvTools = h("div.pv-tools.hidden", pvToggle.el, pvLen.el)
    const cancelBtn = h("button.btn.ghost.bar-cancel", { type: "button", "data-action": "cancel" }, "Cancel")
    const doneBtn = h("button.btn.primary.bar-done", { type: "button", "data-action": "done" }, "Done")
    const toolbar = h(
      "div.bar",
      h("div.bar-mode", seg.el),
      h("div.bar-center", transport, zoomChip),
      h("div.bar-right", h("div.bar-info", trim.el, pvTools), h("div.bar-actions", cancelBtn, doneBtn)),
    )

    /* timeline */
    const strip = createStrip({ frames: ctx.frames, duration: ctx.duration, height: 60, tileWidth: 56, flush: true })
    strip.el.style.height = ""
    const ruler = createRuler(strip, { minTickPx: 14, minLabelPx: 52 })
    const timeline = h("div.timeline", ruler.el, strip.el)
    const speechMap = createSpeechMap({ strip, speech, words: false })
    const zoom = createHoldZoom({
      ctx,
      strip,
      transform: snapTransform(speech),
      onZoom: (z) => {
        el.classList.toggle("is-zoomed", z.zoomed)
        if (z.zoomed) {
          const mag = Math.round(ctx.duration / z.span)
          zoomChip.replaceChildren(icon("zoomIn"), h("b", `${fmtSeconds(z.span, z.span < 10 ? 1 : 0)} window`), h("span.sep", "·"), `×${mag}`)
        }
        zoomChip.classList.toggle("hidden", !z.zoomed)
        transport.classList.toggle("hidden", z.zoomed)
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
    const offSeek = seekOnTrack(ctx, strip)

    const el = h("div.modal.bar-modal", { role: "dialog", "aria-modal": "true", "aria-label": "Edit Video", dataset: { variant: "L3", mode: "trim" } }, stage, toolbar, timeline)
    ctx.placeVideo(slot)

    function setMode(next) {
      mode = next
      seg.set(next, { silent: true })
      strip.el.classList.toggle("no-trim", next === "preview")
      pvTools.classList.toggle("hidden", next !== "preview")
      trim.el.classList.toggle("hidden", next === "preview")
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
        cancelBtn.disabled = true
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
        trim.destroy()
        play.destroy()
        clock.destroy()
        strip.destroy()
        el.remove()
      },
    }
  },
}
