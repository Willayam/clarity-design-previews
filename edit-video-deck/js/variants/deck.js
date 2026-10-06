import { clamp, fmtSpan, h, on, rafCoalesce, startDrag, tween } from "../util.js"
import { icon } from "../icons.js"
import { createStrip, createTrimOverlay } from "../strip.js"
import { createHoldZoom } from "../hold-zoom.js"
import { createSpeechMap } from "../speech.js"
import { createClock, seekOnTrack } from "../transport.js"
import { createPreviewOverlay, previewLengthStepper, previewModeToggle } from "../preview-ui.js"
import { nudgeHandles, segmented, snapTransform, spinner } from "../ui.js"
import { createStatusVariants } from "./status-variants.js"

/** The preview range fills about this much of the strip: 3 s in a 10 s window. */
const PREVIEW_FILL = 0.3
/** Seconds in view around a still frame. */
const STILL_SPAN = 10
/** Pixels from the strip's edge where a dragged preview starts panning the window. */
const PAN_MARGIN = 28
const FIT_MS = 320
/** A cut shorter than this is not worth a badge. */
const MIN_CUT = 0.05

/** Prototype switches, in the URL as ?zoom= and ?status= so a link carries them. */
const ZOOM_STYLES = ["flat"]
const STATUS_KEYS = "abcdefghijklmnopqrst".split("")
const STATUS_NAMES = { a: "line", b: "chip", c: "ends", d: "switch", e: "silent", f: "autobtn", g: "modes", h: "dropdown", i: "moddot", j: "compare", k: "suggest", l: "perend", m: "quiet", n: "cycle", o: "inverse", p: "chippop", q: "threeway", r: "dropdown3", s: "chip3", t: "threeicons" }

/**
 * Deck console, round 4. No header and no title: the modal is the picture
 * with the strip as its base. One console row sits between picture and
 * strip: play and the time, then Trim | Preview on the left; the trim status
 * (or the preview's Moving | Still and length) centered; Cancel and Done on
 * the right. The strip runs the full width under it with nothing beside it.
 *
 * Time is read from the frames, not from numbers: there is no ruler. Holding a
 * handle still zooms the strip and the frame tiles widen and split into larger
 * frames at their own times; letting go shrinks them back. Two zoom styles:
 * `grow` makes the strip taller as well, `flat` keeps the box and marks the
 * zoom with a pulse on the strip's edge and fades at the ends that have more
 * video beyond them. Preview mode zooms to a window around the preview range,
 * with a hairline overview above the strip to move that window.
 *
 * Five trim-status variants (a to e) answer "what did the machine cut, and how
 * do I undo it" with different amounts of UI. Nothing is written until Done;
 * Done saves the trim and the preview as one write and closes; Cancel or Esc
 * drops the whole draft, so any reset is undoable.
 */
export const deck = {
  id: "D",
  slug: "deck",
  label: "Deck console",
  subtitle: "Transport and modes left · status centered · frames are the scale",
  mount(ctx) {
    const { store, session, speech } = ctx
    let mode = "trim"
    let busy = false
    const params = new URLSearchParams(location.search)
    let zoomStyle = "flat"
    let statusKey = STATUS_KEYS.includes((params.get("status") || "").toLowerCase()) ? params.get("status").toLowerCase() : "t"

    /* the picture */
    const slot = h("div.video-slot")
    const playBtn = h("button.hud-play", { type: "button", "aria-label": "Play", "data-action": "play" }, icon("play"))
    const clock = createClock(ctx)
    const transport = h("div.console-transport", playBtn, clock.el)
    const stage = h("section.stage.deck-stage", slot)

    /* the strip */
    const strip = createStrip({ frames: ctx.frames, duration: ctx.duration, height: 64, tileWidth: 56, maxTileWidth: 164, flush: true })
    strip.el.style.height = ""
    const speechMap = createSpeechMap({ strip, speech, words: false })
    let pulseTimer = null
    const zoom = createHoldZoom({
      ctx,
      strip,
      transform: snapTransform(speech),
      onZoom: (z) => {
        // The flat style announces the zoom with one pulse on the strip's edge as it starts.
        if (z.phase === "zooming" && !strip.el.classList.contains("zoom-pulse")) {
          strip.el.classList.add("zoom-pulse")
          clearTimeout(pulseTimer)
          pulseTimer = setTimeout(() => strip.el.classList.remove("zoom-pulse"), 700)
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

    /* ---------- trim status: what the machine cut, and the way back ---------- */
    const trimState = () => {
      const auto = speech.autoTrim
      const d = session.trimDraft()
      const isAuto = Math.abs(d.start - auto.start) < 0.0005 && Math.abs(d.end - auto.end) < 0.0005
      const head = d.start
      const tail = ctx.duration - d.end
      return { kind: session.isFull() ? "full" : isAuto ? "auto" : "hand", head, tail, total: head + tail, start: d.start, end: d.end }
    }
    const restoreFull = () => session.restoreFull()
    const restoreStart = () => store.setHandle("start", 0, { preview: false })
    const restoreEnd = () => store.setHandle("end", ctx.duration, { preview: false })

    /* a: icon, "Auto-trimmed 25.9 s", Reset */
    const lineIcon = h("span.status-icon")
    const lineText = h("span")
    const lineReset = h("button.btn.status-reset", { type: "button", "data-action": "reset" }, "Reset")
    const line = h("div.status-line", lineIcon, lineText, lineReset)

    /* b: one chip; its popover carries the two cuts and Reset */
    const chipIcon = h("span.status-icon")
    const chipText = h("span")
    const chip = h("button.status-chip", { type: "button", "aria-expanded": "false", "data-action": "status-chip" }, chipIcon, chipText)
    const popText = h("p")
    const popReset = h("button.btn.reset", { type: "button", "data-action": "reset" }, "Reset")
    const pop = h("div.status-pop.hidden", { role: "dialog", "aria-label": "Trim" }, popText, popReset)
    const chipWrap = h("div.status-chip-wrap", chip, pop)
    const setPop = (open) => {
      pop.classList.toggle("hidden", !open)
      chip.setAttribute("aria-expanded", String(open))
    }
    const popOpen = () => !pop.classList.contains("hidden")

    /* c: a badge above each cut end on the strip; tap restores that end */
    const headBadge = h("button.cut-badge.head", { type: "button", "data-action": "restore-start" }, icon("sparkles"), h("span"))
    const tailBadge = h("button.cut-badge.tail", { type: "button", "data-action": "restore-end" }, icon("sparkles"), h("span"))

    /* d: an Auto-trim switch; a hand-adjusted trim shows it mixed */
    const swText = h("span")
    const sw = h("span.sw", h("i.sw-knob"))
    const switchEl = h("button.status-switch", { type: "button", role: "switch", "aria-checked": "true", "data-action": "auto-switch" }, swText, sw)

    /* e: nothing in the console; a sparkle above each machine cut, hatched cut regions */
    const headMark = h("span.cut-mark.head", { "aria-hidden": "true" }, icon("sparkles"))
    const tailMark = h("span.cut-mark.tail", { "aria-hidden": "true" }, icon("sparkles"))

    const stripWrap = h("div.strip-wrap", overview, headBadge, tailBadge, headMark, tailMark, strip.el)

    const cutText = (s) => `−${fmtSpan(s)}`
    const popSentence = (t) => {
      const parts = []
      if (t.kind === "auto") {
        if (t.head >= MIN_CUT) parts.push(`${fmtSpan(t.head)} of silence before the first word`)
        if (t.tail >= MIN_CUT) parts.push(`${fmtSpan(t.tail)} after the last`)
      } else {
        if (t.head >= MIN_CUT) parts.push(`${fmtSpan(t.head)} at the start`)
        if (t.tail >= MIN_CUT) parts.push(`${fmtSpan(t.tail)} at the end`)
      }
      return parts.length ? `Cut ${parts.join(" and ")}.` : ""
    }
    /** Places a node in the band above the strip at a handle, kept inside the strip's width. */
    const placeAtHandle = (node, t, side, visible) => {
      const p = strip.pct(t)
      const w = strip.width()
      const show = visible && p >= -0.5 && p <= 100.5 && w > 0
      node.classList.toggle("hidden", !show)
      if (!show) return
      const x = (p / 100) * w
      const bw = node.offsetWidth
      node.style.left = `${clamp(side === "head" ? x - bw : x, 0, Math.max(0, w - bw))}px`
    }
    const paintStatus = () => {
      const t = trimState()
      const inTrim = mode === "trim"
      const v = STATUS_NAMES[statusKey]
      const icons = { auto: "sparkles", hand: "scissors" }
      line.classList.toggle("hidden", !(inTrim && v === "line" && t.kind !== "full"))
      chipWrap.classList.toggle("hidden", !(inTrim && v === "chip" && t.kind !== "full"))
      switchEl.classList.toggle("hidden", !(inTrim && v === "switch"))
      if (t.kind !== "full") {
        lineIcon.replaceChildren(icon(icons[t.kind]))
        lineText.textContent = `${t.kind === "auto" ? "Auto-trimmed" : "Trimmed"} ${fmtSpan(t.total)}`
        chipIcon.replaceChildren(icon(icons[t.kind]))
        chipText.textContent = `Trimmed ${fmtSpan(t.total)}`
        popText.textContent = popSentence(t)
      }
      if (chipWrap.classList.contains("hidden")) setPop(false)
      swText.textContent = t.kind === "auto" ? `Auto-trim ${fmtSpan(t.total)}` : t.kind === "hand" ? `Custom trim ${fmtSpan(t.total)}` : "Auto-trim"
      switchEl.setAttribute("aria-checked", t.kind === "auto" ? "true" : t.kind === "hand" ? "mixed" : "false")
      const ends = inTrim && v === "ends" && t.kind !== "full"
      headBadge.querySelector("span").textContent = cutText(t.head)
      tailBadge.querySelector("span").textContent = cutText(t.tail)
      headBadge.classList.toggle("auto", t.kind === "auto")
      tailBadge.classList.toggle("auto", t.kind === "auto")
      placeAtHandle(headBadge, t.start, "head", ends && t.head >= MIN_CUT)
      placeAtHandle(tailBadge, t.end, "tail", ends && t.tail >= MIN_CUT)
      const marks = inTrim && v === "silent" && t.kind === "auto"
      placeAtHandle(headMark, t.start, "head", marks && t.head >= MIN_CUT)
      placeAtHandle(tailMark, t.end, "tail", marks && t.tail >= MIN_CUT)
      for (const [k, ev] of Object.entries(extra.variants)) {
        const selected = statusKey === k
        const show = ev.paint(t, { selected, inTrim })
        ev.center?.classList.toggle("hidden", !(selected && inTrim && show))
      }
    }
    const schedStatus = rafCoalesce(paintStatus)

    /* the console row */
    const seg = segmented(
      [
        { v: "trim", label: "Trim", icon: "scissors" },
        { v: "preview", label: "Preview", icon: "film" },
      ],
      "trim",
      (v) => setMode(v),
    )
    const pvToggle = previewModeToggle(ctx, segmented, { onChange: () => fitPreview() })
    const pvLen = previewLengthStepper(ctx, { onChange: () => fitPreview() })
    const pvTools = h("div.plane-tools.hidden", pvToggle.el, pvLen.el)
    // Labels only: no hover explainers and no icons on the preview controls.
    for (const n of pvTools.querySelectorAll("[title]")) n.removeAttribute("title")
    const consoleCenter = h("div.console-center", line, chipWrap, switchEl, pvTools)
    const cancelBtn = h("button.btn.ghost", { type: "button", "data-action": "cancel" }, "Cancel")
    const doneBtn = h("button.btn.primary.deck-done", { type: "button", "data-action": "done" }, "Done")
    const actions = h("div.console-actions", cancelBtn, doneBtn)
    const consoleRow = h("div.console", h("div.console-left", transport, seg.el), consoleCenter, actions)
    /* round 5: variants F to O live in their own module and hang off the same slots */
    const extra = createStatusVariants({
      ctx,
      store,
      speech,
      trimState,
      applyAuto: () => session.reapplyAuto(),
      removeTrim: restoreFull,
      restoreStart,
      restoreEnd,
      placeAtHandle,
      trimTab: seg.el.querySelector('[data-value="trim"]'),
      clockEl: clock.el,
      actionsEl: actions,
      cancelBtn,
      bandEl: stripWrap,
      repaint: () => schedStatus(),
    })
    for (const v of Object.values(extra.variants)) if (v.center) consoleCenter.insertBefore(v.center, pvTools)

    const el = h("div.modal.deck", { role: "dialog", "aria-modal": "true", "aria-label": "Edit Video", dataset: { variant: "D", mode } }, stage, consoleRow, stripWrap)
    ctx.placeVideo(slot)
    for (const type of ["selectstart", "contextmenu", "dragstart"]) el.addEventListener(type, (event) => event.preventDefault())
    const offWin = strip.onWindow(() => {
      const w = strip.getWindow()
      el.classList.toggle("is-zoomed", strip.span() < ctx.duration - 1e-6)
      // The flat style fades only the ends that have more video beyond them.
      el.classList.toggle("win-at-start", w.s <= 0.01)
      el.classList.toggle("win-at-end", w.e >= ctx.duration - 0.01)
      schedOverview()
      schedStatus()
    })

    /* ---------- prototype switches: zoom style and status variant, in the URL ---------- */
    const protoButtons = []
    const protoBtn = (group, value, label) => {
      const b = h("button.proto-btn", { type: "button", dataset: { group, value } }, label)
      protoButtons.push(b)
      return b
    }
    const protoBar = h(
      "div.proto-bar",
      { "aria-label": "Prototype switches" },
      h("span.proto-tag", "proto"),
      h("span.proto-group", h("span.proto-label", "status"), ...STATUS_KEYS.map((k) => protoBtn("status", k, k.toUpperCase()))),
      h("span.proto-keys", "s"),
    )
    document.body.append(protoBar)
    const syncProto = () => {
      el.classList.toggle("zoom-grow", zoomStyle === "grow")
      el.classList.toggle("zoom-flat", zoomStyle === "flat")
      // Prefixed: the variant class on the modal must not collide with the status elements' own classes.
      for (const k of STATUS_KEYS) el.classList.toggle(`sv-${STATUS_NAMES[k]}`, k === statusKey)
      for (const b of protoButtons) b.classList.toggle("on", (b.dataset.group === "zoom" ? zoomStyle : statusKey) === b.dataset.value)
      const p = new URLSearchParams(location.search)
      p.set("zoom", zoomStyle)
      p.set("status", statusKey)
      history.replaceState(null, "", `?${p.toString()}`)
      paintStatus()
    }
    const setZoom = (z) => {
      if (!ZOOM_STYLES.includes(z)) return
      zoomStyle = z
      syncProto()
    }
    const setStatus = (k) => {
      k = String(k).toLowerCase()
      if (!STATUS_KEYS.includes(k)) return
      statusKey = k
      setPop(false)
      extra.closeMenus()
      syncProto()
    }
    const offProto = on(protoBar, "click", (e) => {
      const b = e.target.closest(".proto-btn")
      if (!b) return
      if (b.dataset.group === "zoom") setZoom(b.dataset.value)
      else setStatus(b.dataset.value)
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
      setPop(false)
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
    const onSwitch = () => {
      const t = trimState()
      if (t.kind === "auto") restoreFull()
      else session.reapplyAuto()
    }
    const offs = [
      on(doneBtn, "click", done),
      on(cancelBtn, "click", cancel),
      on(lineReset, "click", restoreFull),
      on(popReset, "click", () => {
        restoreFull()
        setPop(false)
      }),
      on(chip, "click", () => setPop(!popOpen())),
      on(document, "pointerdown", (e) => {
        if (popOpen() && !chipWrap.contains(e.target)) setPop(false)
      }),
      on(headBadge, "click", restoreStart),
      on(tailBadge, "click", restoreEnd),
      on(switchEl, "click", onSwitch),
      on(playBtn, "click", togglePlay),
      on(slot, "click", togglePlay),
      ctx.player.on("play", syncPlay),
      ctx.player.on("pause", syncPlay),
      ctx.player.on("ended", syncPlay),
      store.subscribe((s) => {
        // The drag readout sits inside the strip on the cut side of the handle, flipping near the ends.
        if (s.active) {
          const p = strip.pct(s[s.active])
          strip.el.dataset.tipSide = s.active === "end" ? (p > 88 ? "left" : "right") : p < 12 ? "right" : "left"
        }
        schedStatus()
        schedOverview()
      }),
      offSeek,
      offWin,
      offOverview,
      offProto,
      on(strip.el, "pointerup", () => { if (mode === "preview") showRange() }),
      on(strip.el, "pointercancel", () => { if (mode === "preview") showRange() }),
    ]
    const ro = new ResizeObserver(() => schedStatus())
    ro.observe(strip.el)
    syncProto()
    paintOverview()

    return {
      el,
      strip,
      zoom,
      setMode,
      setZoom,
      setStatus,
      fitPreview,
      done,
      cancel,
      reset: restoreFull,
      onKey(e) {
        if (extra.onKey(e)) return true
        if (e.key === "Escape") {
          if (popOpen()) {
            setPop(false)
            return true
          }
          cancel()
          return true
        }
        if (e.key === "s" || e.key === "S") {
          setStatus(STATUS_KEYS[(STATUS_KEYS.indexOf(statusKey) + 1) % STATUS_KEYS.length])
          return true
        }
        return nudgeHandles(ctx, e)
      },
      measure: () => ({
        ...zoom.measure(),
        mode,
        zoomStyle,
        status: statusKey,
        statusName: STATUS_NAMES[statusKey],
        trim: trimState(),
        level: strip.level(),
        tilePx: +strip.tilePx().toFixed(1),
        window: strip.getWindow(),
        trackHeight: strip.el.getBoundingClientRect().height,
        trackRect: strip.el.getBoundingClientRect().toJSON(),
        stageRect: stage.getBoundingClientRect().toJSON(),
        modalRect: el.getBoundingClientRect().toJSON(),
        consoleRect: consoleRow.getBoundingClientRect().toJSON(),
        centerText: [...consoleCenter.children].filter((c) => !c.classList.contains("hidden")).map((c) => c.textContent.trim()).join(" | "),
        actionsText: (el.querySelector(".more-btn")?.classList.contains("hidden") === false ? "⋯ " : "") + "Cancel Done",
        clockText: clock.el.textContent.trim() + (el.querySelector(".clock-auto")?.classList.contains("hidden") === false ? " ✦" : ""),
        trimTabText: el.querySelector(".mod-dot")?.classList.contains("hidden") === false ? "Trim •" : "Trim",
        arrows: stripWrap.querySelectorAll(".restore-arrow:not(.hidden)").length,
        menuOpen: extra.menuOpen(),
        peeking: extra.variants.j.peeking,
        badges: [headBadge, tailBadge].filter((b) => !b.classList.contains("hidden")).map((b) => b.textContent.trim()),
        marks: [headMark, tailMark].filter((m) => !m.classList.contains("hidden")).length,
        popOpen: popOpen(),
        popText: popText.textContent,
        switchState: switchEl.getAttribute("aria-checked"),
        overviewShown: getComputedStyle(overview).opacity !== "0",
        doneLabel: doneBtn.textContent.trim(),
      }),
      destroy() {
        cancelFit?.()
        clearTimeout(pulseTimer)
        ro.disconnect()
        for (const off of offs) off()
        schedStatus.cancel()
        schedOverview.cancel()
        extra.destroy()
        overlay.destroy()
        preview.destroy()
        pvToggle.destroy()
        pvLen.destroy()
        zoom.destroy()
        speechMap.destroy()
        clock.destroy()
        strip.destroy()
        protoBar.remove()
        el.remove()
      },
    }
  },
}
