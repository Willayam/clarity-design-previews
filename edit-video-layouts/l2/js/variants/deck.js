import { fmtSeconds, h, on, startDrag } from "../util.js"
import { icon } from "../icons.js"
import { createStrip, createTrimOverlay } from "../strip.js"
import { createRuler } from "../ruler.js"
import { createHoldZoom } from "../hold-zoom.js"
import { createSpeechMap } from "../speech.js"
import { createClock, seekOnTrack } from "../transport.js"
import { createPreviewOverlay, previewLengthStepper, previewModeToggle } from "../preview-ui.js"
import { nudgeHandles, quietLine, segmented, snapTransform, spinner } from "../ui.js"

/**
 * Deck console. No header and no title: the modal is the picture with the
 * strip as its base, the way a tape deck stacks the monitor over the
 * transport over the tape.
 *
 * The transport (play, time) is a pill on the picture's bottom-left corner,
 * as a player carries its own controls, so no row under the video is spent on
 * it and the time never shares a line with the strip. One console row sits
 * between the picture and the strip: on the left, Trim | Preview and the line
 * that belongs to that mode (the auto-trim line with Undo, or Moving | Still
 * and the length); on the right, Cancel and the one primary, Done. The ruler
 * and the strip then run the full width with nothing beside them.
 *
 * Nothing is written until Done; Done saves the trim and the preview as one
 * write and closes; Cancel or Esc drops the draft.
 *
 * Zoom feedback: the strip grows taller, the ruler respaces its ticks from
 * seconds to tenths, and a window readout sits at the ruler's right end.
 */
export const deck = {
  id: "D",
  slug: "deck",
  label: "Deck console",
  subtitle: "Transport on the picture · one console row between picture and strip · strip is the base",
  mount(ctx) {
    const { store, session, speech } = ctx
    let mode = "trim"
    let busy = false

    /* the picture, with the transport on it */
    const slot = h("div.video-slot")
    const playBtn = h("button.hud-play", { type: "button", "aria-label": "Play", "data-action": "play" }, icon("play"))
    const clock = createClock(ctx)
    const hud = h("div.hud.glass.glass-media", playBtn, clock.el)
    const stage = h("section.stage.deck-stage", slot, hud)

    /* the strip and its ruler */
    const strip = createStrip({ frames: ctx.frames, duration: ctx.duration, height: 64, tileWidth: 56, flush: true })
    strip.el.style.height = ""
    const ruler = createRuler(strip)
    const zoomChip = h("div.zoom-chip.hidden", { "data-slot": "zoom-chip" })
    const rulerRow = h("div.ruler-row", ruler.el, zoomChip)
    const speechMap = createSpeechMap({ strip, speech, words: false })
    let chipSideSet = false
    const zoom = createHoldZoom({
      ctx,
      strip,
      transform: snapTransform(speech),
      onZoom: (z) => {
        el.classList.toggle("is-zoomed", z.zoomed)
        if (z.zoomed) {
          // The readout takes the ruler end away from the held handle, decided
          // once per zoom so it never jumps mid-drag.
          if (!chipSideSet) {
            chipSideSet = true
            const which = store.state.active
            const farLeft = which ? strip.pct(store.state[which]) > 55 : false
            zoomChip.classList.toggle("at-left", farLeft)
          }
          zoomChip.replaceChildren(icon("zoomIn"), h("b", `${fmtSeconds(z.span, z.span < 10 ? 1 : 0)} window`))
          zoomChip.classList.remove("hidden")
        } else {
          chipSideSet = false
          zoomChip.classList.add("hidden")
        }
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

    /* the console row */
    const seg = segmented(
      [
        { v: "trim", label: "Trim", icon: "scissors" },
        { v: "preview", label: "Preview", icon: "film" },
      ],
      "trim",
      (v) => setMode(v),
    )
    const quiet = quietLine(ctx)
    const pvToggle = previewModeToggle(ctx, segmented)
    const pvLen = previewLengthStepper(ctx)
    const pvTools = h("div.plane-tools.hidden", pvToggle.el, pvLen.el)
    // Labels only: the shared preview controls carry hover explainers, which this layout drops.
    for (const n of pvTools.querySelectorAll("[title]")) n.removeAttribute("title")
    const modeLine = h("div.mode-line", quiet.el, pvTools)
    const cancelBtn = h("button.btn.ghost", { type: "button", "data-action": "cancel" }, "Cancel")
    const doneBtn = h("button.btn.primary.deck-done", { type: "button", "data-action": "done" }, "Done")
    const actions = h("div.console-actions", cancelBtn, doneBtn)
    const consoleRow = h("div.console", seg.el, modeLine, actions)

    const el = h("div.modal.deck", { role: "dialog", "aria-modal": "true", "aria-label": "Edit Video", dataset: { variant: "D", mode } }, stage, consoleRow, rulerRow, strip.el)
    ctx.placeVideo(slot)

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
      quiet.el.classList.toggle("hidden", next === "preview")
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
    const offs = [
      on(doneBtn, "click", done),
      on(cancelBtn, "click", cancel),
      on(playBtn, "click", togglePlay),
      on(slot, "click", togglePlay),
      ctx.player.on("play", syncPlay),
      ctx.player.on("pause", syncPlay),
      ctx.player.on("ended", syncPlay),
      offSeek,
    ]

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
        trackRect: strip.el.getBoundingClientRect().toJSON(),
        stageRect: stage.getBoundingClientRect().toJSON(),
        modalRect: el.getBoundingClientRect().toJSON(),
        consoleRect: consoleRow.getBoundingClientRect().toJSON(),
        rulerTick: ruler.el.dataset.tick,
        rulerLabel: ruler.el.dataset.label,
        rulerTicks: ruler.el.children.length,
        doneLabel: doneBtn.textContent.trim(),
        modeLine: modeLine.textContent.trim(),
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
        clock.destroy()
        strip.destroy()
        el.remove()
      },
    }
  },
}
