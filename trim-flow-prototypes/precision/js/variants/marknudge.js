import { createStrip, createTrimOverlay } from "../strip.js"
import { buildStandardDock, kbd } from "../ui.js"
import { fmtCs, h, on, parseTimecode, startDrag } from "../util.js"

/**
 * Mark the playhead as start or end, then nudge: editable timecodes, frame,
 * tenth and second buttons, and arrow keys on the focused edge.
 */
export const marknudge = {
  id: "D",
  label: "Mark and nudge",
  subtitle: "Start here / End here at the playhead, then nudge by frame",
  mount(ctx) {
    const strip = createStrip({ frames: ctx.frames, duration: ctx.duration, mode: "equal16", height: 64 })
    const dock = buildStandardDock(ctx, {
      strip,
      hint: [kbd("I"), " start here · ", kbd("O"), " end here · ", kbd(","), " ", kbd("."), " step a frame · ", kbd("←"), " ", kbd("→"), " nudge the focused edge, ", kbd("shift"), " 1 s, ", kbd("alt"), " 0.1 s"],
    })
    const overlay = createTrimOverlay(strip, ctx.store, {
      onHandleDown(which, e, el) {
        ctx.store.setActive(which)
        startDrag(e, el, {
          onMove: (ev) => ctx.store.setHandle(which, strip.timeAt(ev.clientX)),
          onEnd: () => ctx.store.setActive(null),
        })
      },
    })

    const frame = () => 1 / ctx.fps
    const nudge = (which, delta) => {
      ctx.store.setHandle(which, ctx.store.state[which] + delta)
      ctx.store.setFocused(which)
    }
    const markHere = (which) => {
      ctx.store.setHandle(which, ctx.store.state.playhead)
      ctx.store.setFocused(which)
      cards[which].classList.add("focused")
    }
    const cards = {}
    const inputs = {}
    const offs = []
    const mkCard = (which) => {
      const input = h("input.tc-input", { type: "text", inputmode: "decimal", spellcheck: "false", "aria-label": `${which} timecode`, value: "00:00.00" })
      inputs[which] = input
      const commit = () => {
        const t = parseTimecode(input.value)
        if (t == null) {
          input.classList.add("invalid")
          input.value = fmtCs(ctx.store.state[which])
          setTimeout(() => input.classList.remove("invalid"), 600)
          return
        }
        ctx.store.setHandle(which, t)
        input.value = fmtCs(ctx.store.state[which])
      }
      offs.push(on(input, "focus", () => {
        ctx.store.setFocused(which)
        input.select()
      }))
      offs.push(on(input, "blur", commit))
      offs.push(on(input, "keydown", (e) => {
        if (e.key === "Enter") {
          commit()
          input.blur()
        } else if (e.key === "Escape") {
          input.value = fmtCs(ctx.store.state[which])
          input.blur()
        } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault()
          nudge(which, (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 1 : e.altKey ? 0.1 : frame()))
        }
      }))
      const nb = (label, delta, title) => h("button.btn.nudge", { type: "button", title, onclick: () => nudge(which, delta) }, label)
      const card = h(
        "div.mark-card",
        h(
          "div.head",
          h("span.title", which === "start" ? "Start" : "End"),
          input,
          h("span.spacer"),
          h("button.btn.sm.mark", { type: "button", onclick: () => markHere(which) }, which === "start" ? "Start here" : "End here", kbd(which === "start" ? "I" : "O")),
        ),
        h(
          "div.nudge",
          nb("−1 s", -1, "Back one second"),
          nb("−0.1", -0.1, "Back a tenth"),
          nb("−1 f", -frame(), "Back one frame"),
          h("span.gap"),
          nb("+1 f", frame(), "Forward one frame"),
          nb("+0.1", 0.1, "Forward a tenth"),
          nb("+1 s", 1, "Forward one second"),
        ),
      )
      cards[which] = card
      return card
    }
    const grid = h("div.mark-cards", mkCard("start"), mkCard("end"))
    ctx.dock.insertBefore(grid, dock.readout.el)

    const sync = () => {
      const s = ctx.store.state
      for (const which of ["start", "end"]) {
        if (document.activeElement !== inputs[which]) inputs[which].value = fmtCs(s[which])
        cards[which].classList.toggle("focused", (s.focused ?? s.active) === which)
      }
    }
    const offStore = ctx.store.subscribe(sync)
    sync()
    const offDur = ctx.onDuration((d) => strip.setDuration(d))

    return {
      onKey(e) {
        const k = e.key
        if (k === "i" || k === "I") {
          markHere("start")
          return true
        }
        if (k === "o" || k === "O") {
          markHere("end")
          return true
        }
        if (k === "," || k === ".") {
          const step = (k === "." ? 1 : -1) * (e.shiftKey ? 1 : frame())
          ctx.seekPlayhead(ctx.store.state.playhead + step)
          return true
        }
        if ((k === "ArrowLeft" || k === "ArrowRight") && ctx.store.state.focused) {
          const dir = k === "ArrowRight" ? 1 : -1
          nudge(ctx.store.state.focused, dir * (e.shiftKey ? 1 : e.altKey ? 0.1 : frame()))
          return true
        }
        return false
      },
      measure: () => ({ trackWidth: +strip.width().toFixed(1), secondsPerPixel: +strip.spp().toFixed(4), frameSeconds: +frame().toFixed(5) }),
      destroy() {
        for (const off of offs) off()
        offStore()
        offDur()
        overlay.destroy()
        dock.destroy()
        strip.destroy()
        grid.remove()
      },
    }
  },
}
