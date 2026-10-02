import { createStrip, createTrimOverlay } from "../strip.js"
import { createActions, createPlayButton, createReadout, kbd } from "../ui.js"
import { clamp, h, on, startDrag } from "../util.js"

const PRESETS = [5, 10, 30]

/**
 * Two strips: a thin overview of the whole video with a movable viewport,
 * and a wide detail strip where the handles live at a few milliseconds per
 * pixel.
 */
export const overview = {
  id: "C",
  label: "Overview plus detail",
  subtitle: "Handles live on a wide 10-second strip; a thin overview moves it",
  mount(ctx) {
    const ov = createStrip({ frames: ctx.frames, duration: ctx.duration, mode: "grid", height: 30, tileWidth: 50, flush: true, gap: 1, className: "overview" })
    const det = createStrip({ frames: ctx.frames, duration: ctx.duration, mode: "grid", height: 92, tileWidth: 64, labels: true, ruler: true, className: "detail" })
    let span = 10
    const clampWin = (s, e) => {
      const d = ctx.duration
      const sp = Math.min(e - s, d)
      if (s < 0) return { s: 0, e: sp }
      if (s + sp > d) return { s: d - sp, e: d }
      return { s, e: s + sp }
    }
    const centerOn = (t) => clampWin(t - span / 2, t + span / 2)
    const vp = h("div.viewport", { title: "Drag to move the detail window" })
    const mStart = h("div.marker")
    const mEnd = h("div.marker")
    ov.el.append(mStart, mEnd, vp)

    const setView = (w) => {
      det.setWindow(w.s, w.e)
      vp.style.left = `${(w.s / ctx.duration) * 100}%`
      vp.style.width = `${((w.e - w.s) / ctx.duration) * 100}%`
      for (const b of seg.children) b.setAttribute("aria-pressed", String(Math.abs(Number(b.dataset.span) - span) < 1e-6))
    }
    const goTo = (t) => setView(centerOn(t))

    const ovOverlay = createTrimOverlay(ov, ctx.store, { handles: false, tooltip: false })
    const detOverlay = createTrimOverlay(det, ctx.store, {
      edgeChips: true,
      onEdgeChip: (which) => goTo(ctx.store.state[which]),
      onHandleDown(which, e, el) {
        ctx.store.setActive(which)
        let lastX = e.clientX
        let raf = 0
        const edgePan = () => {
          const r = det.rect()
          const margin = 14
          let over = 0
          if (lastX > r.right - margin) over = lastX - (r.right - margin)
          else if (lastX < r.left + margin) over = lastX - (r.left + margin)
          if (!over) return
          const rate = (Math.sign(over) * Math.min(Math.abs(over), 120)) / 120
          const dt = (rate * span * 0.8) / 60
          const w = det.getWindow()
          const nw = clampWin(w.s + dt, w.e + dt)
          if (Math.abs(nw.s - w.s) < 1e-9) return
          setView(nw)
          ctx.store.setHandle(which, det.timeAtUnclamped(lastX))
        }
        const tick = () => {
          edgePan()
          raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        startDrag(e, el, {
          onMove: (ev) => {
            lastX = ev.clientX
            ctx.store.setHandle(which, det.timeAtUnclamped(lastX))
          },
          onEnd: () => {
            cancelAnimationFrame(raf)
            ctx.store.setActive(null)
          },
        })
      },
    })

    const updateMarkers = () => {
      const s = ctx.store.state
      mStart.style.left = `${(s.start / ctx.duration) * 100}%`
      mEnd.style.left = `${(s.end / ctx.duration) * 100}%`
    }
    const offStore = ctx.store.subscribe(updateMarkers)
    updateMarkers()

    const offOvDown = on(ov.el, "pointerdown", (e) => {
      if (e.button !== 0) return
      e.preventDefault()
      const w = det.getWindow()
      const vpRect = vp.getBoundingClientRect()
      let grab
      if (e.clientX >= vpRect.left && e.clientX <= vpRect.right) {
        grab = ov.timeAt(e.clientX) - w.s
      } else {
        const t = ov.timeAt(e.clientX)
        const nw = centerOn(t)
        setView(nw)
        grab = t - nw.s
      }
      vp.classList.add("dragging")
      startDrag(e, ov.el, {
        onMove: (ev) => {
          const t = ov.timeAt(ev.clientX)
          setView(clampWin(t - grab, t - grab + span))
        },
        onEnd: () => vp.classList.remove("dragging"),
      })
    })

    const offDetDown = on(det.el, "pointerdown", (e) => {
      if (e.button !== 0) return
      e.preventDefault()
      ctx.seekPlayhead(det.timeAt(e.clientX))
    })

    const offWheel = on(
      det.el,
      "wheel",
      (e) => {
        e.preventDefault()
        if (ctx.store.state.dragging) return
        const w = det.getWindow()
        if (e.ctrlKey) {
          const rect = det.rect()
          const nspan = clamp(span * Math.exp(e.deltaY * 0.01), 2, Math.min(60, ctx.duration))
          const tAt = det.timeAt(e.clientX)
          const frac = clamp((e.clientX - rect.left) / rect.width, 0, 1)
          span = nspan
          setView(clampWin(tAt - frac * nspan, tAt - frac * nspan + nspan))
        } else {
          const dx = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * det.spp()
          setView(clampWin(w.s + dx, w.e + dx))
        }
      },
      { passive: false },
    )

    const seg = h(
      "div.segmented",
      PRESETS.map((p) =>
        h("button", { type: "button", dataset: { span: p }, "aria-pressed": "false", onclick: () => {
          span = p
          const w = det.getWindow()
          goTo((w.s + w.e) / 2)
        } }, `${p} s`),
      ),
    )
    const jump = (which) => h("button.btn.xs.ghost", { type: "button", onclick: () => goTo(ctx.store.state[which]) }, which === "start" ? "Go to start" : "Go to end")

    const play = createPlayButton(ctx)
    const readout = createReadout(ctx, { hint: ["Drag on the overview to move the window. Scroll pans, ", kbd("ctrl"), " + scroll zooms."] })
    const toolbar = h("div.strip-toolbar", h("span", "Overview"), h("span.spacer"), jump("start"), jump("end"), h("span", "Window"), seg)
    const bottom = h("div.dock-row", play.el, readout.el, createActions({ row: true }))
    ctx.dock.replaceChildren(toolbar, ov.el, det.el, bottom)
    readout.el.style.flex = "1"
    setView(centerOn(ctx.store.state.start))

    const offDur = ctx.onDuration((d) => {
      ov.setDuration(d)
      det.setDuration(d)
      setView(clampWin(det.getWindow().s, det.getWindow().s + span))
    })
    return {
      measure: () => ({
        detailWidth: +det.width().toFixed(1),
        overviewWidth: +ov.width().toFixed(1),
        windowSeconds: span,
        secondsPerPixelDetail: +det.spp().toFixed(4),
        secondsPerPixelOverview: +ov.spp().toFixed(4),
      }),
      destroy() {
        offStore()
        offOvDown()
        offDetDown()
        offWheel()
        offDur()
        ovOverlay.destroy()
        detOverlay.destroy()
        play.destroy()
        readout.destroy()
        ov.destroy()
        det.destroy()
      },
    }
  },
}
