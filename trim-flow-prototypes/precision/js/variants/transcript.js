import { createStrip, createTrimOverlay } from "../strip.js"
import { buildStandardDock, kbd } from "../ui.js"
import { fmtCs, fmtWhole, h, on, rafCoalesce, startDrag } from "../util.js"

const PAD_BEFORE = 0.2
const PAD_AFTER = 0.3

/**
 * The transcript is the timeline: click a word to move the nearest edge to
 * it. The strip and handles follow, and small nudges stay available.
 */
export const transcript = {
  id: "E",
  label: "Transcript trim",
  subtitle: "Click a word to start or end there",
  mount(ctx) {
    const words = ctx.source.transcript.words
    const strip = createStrip({ frames: ctx.frames, duration: ctx.duration, mode: "equal16", height: 64 })
    const nudgeBtn = (which, delta, label) => h("button.btn.nudge", { type: "button", onclick: () => ctx.store.setHandle(which, ctx.store.state[which] + delta) }, label)
    const dock = buildStandardDock(ctx, {
      strip,
      hint: [
        "Start ", nudgeBtn("start", -0.1, "−0.1"), " ", nudgeBtn("start", 0.1, "+0.1"),
        "   End ", nudgeBtn("end", -0.1, "−0.1"), " ", nudgeBtn("end", 0.1, "+0.1"),
      ],
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

    // Build the transcript panel.
    const list = h("div.transcript", { role: "list" })
    const spans = []
    let para = null
    let lastP = -1
    const gapNote = (seconds, text) => h("span.gap", ` [${seconds.toFixed(1)} s ${text}] `)
    if (words[0].s > 1) list.append(h("p", gapNote(words[0].s, "before the first word")))
    words.forEach((w, i) => {
      if (w.p !== lastP) {
        para = h("p", h("span.stamp", fmtWhole(w.s)))
        list.append(para)
        lastP = w.p
      } else if (i > 0 && w.s - words[i - 1].e > 1.5) {
        para.append(gapNote(w.s - words[i - 1].e, "pause"))
      }
      const span = h("span.w", { dataset: { i }, role: "listitem" }, w.w)
      spans.push(span)
      para.append(span, " ")
    })
    const tailGap = ctx.duration - words[words.length - 1].e
    if (tailGap > 1) list.append(h("p", gapNote(tailGap, "after the last word")))
    const tip = h("div.word-tip.hidden")
    document.body.append(tip)
    ctx.asideSlot.replaceChildren(
      h("h3", "Transcript"),
      h("p.hint", "Click a word to move the nearest edge to it. Option-click to play from a word."),
      list,
      h("div.transcript-tip", h("span", h("b", `${words.length} words`), " from the captions"), h("span", "Struck words are cut")),
    )

    const edgeFor = (w) => {
      const s = ctx.store.state
      return Math.abs(w.s - s.start) <= Math.abs(w.e - s.end) ? "start" : "end"
    }
    const startAt = (i) => Math.max(i > 0 ? words[i - 1].e : 0, words[i].s - PAD_BEFORE)
    const endAt = (i) => Math.min(i < words.length - 1 ? words[i + 1].s : ctx.duration, words[i].e + PAD_AFTER)

    const offs = []
    offs.push(on(list, "click", (e) => {
      const el = e.target.closest(".w")
      if (!el) return
      const i = Number(el.dataset.i)
      if (e.altKey) {
        ctx.seekPlayhead(words[i].s)
        ctx.player.play()
        return
      }
      const which = edgeFor(words[i])
      if (which === "start") ctx.store.setHandle("start", startAt(i))
      else ctx.store.setHandle("end", endAt(i))
      ctx.store.setFocused(which)
    }))
    const showTip = (e) => {
      const el = e.target.closest(".w")
      if (!el) {
        tip.classList.add("hidden")
        return
      }
      const i = Number(el.dataset.i)
      const which = edgeFor(words[i])
      const r = el.getBoundingClientRect()
      tip.classList.remove("hidden")
      tip.style.left = `${r.left + r.width / 2}px`
      tip.style.top = `${r.top}px`
      tip.replaceChildren(which === "start" ? "Start here" : "End here", h("span.t", fmtCs(which === "start" ? startAt(i) : endAt(i))))
    }
    offs.push(on(list, "mouseover", showTip))
    offs.push(on(list, "mouseleave", () => tip.classList.add("hidden")))

    const findWord = (t) => {
      let lo = 0
      let hi = words.length - 1
      let ans = -1
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        if (words[mid].s <= t) {
          ans = mid
          lo = mid + 1
        } else hi = mid - 1
      }
      return ans >= 0 && t <= words[ans].e + 0.08 ? ans : -1
    }
    let nowIdx = -1
    let lastScroll = 0
    const sync = () => {
      const s = ctx.store.state
      let firstKept = -1
      let lastKept = -1
      for (let i = 0; i < words.length; i++) {
        const w = words[i]
        const cut = w.e <= s.start + 1e-3 || w.s >= s.end - 1e-3
        spans[i].classList.toggle("cut", cut)
        if (!cut) {
          if (firstKept < 0) firstKept = i
          lastKept = i
        }
        spans[i].classList.remove("edge-start", "edge-end")
      }
      if (firstKept >= 0) spans[firstKept].classList.add("edge-start")
      if (lastKept >= 0) spans[lastKept].classList.add("edge-end")
      const idx = findWord(s.playhead)
      if (idx !== nowIdx) {
        if (nowIdx >= 0) spans[nowIdx].classList.remove("now")
        nowIdx = idx
        if (idx >= 0) {
          spans[idx].classList.add("now")
          const now = performance.now()
          if (now - lastScroll > 400) {
            lastScroll = now
            const lr = list.getBoundingClientRect()
            const r = spans[idx].getBoundingClientRect()
            if (r.top < lr.top || r.bottom > lr.bottom) spans[idx].scrollIntoView({ block: "center", behavior: "smooth" })
          }
        }
      }
    }
    const sched = rafCoalesce(sync)
    offs.push(ctx.store.subscribe(() => sched()))
    sync()
    const offDur = ctx.onDuration((d) => strip.setDuration(d))

    return {
      measure: () => ({ trackWidth: +strip.width().toFixed(1), secondsPerPixel: +strip.spp().toFixed(4), words: words.length }),
      destroy() {
        for (const off of offs) off()
        offDur()
        sched.cancel()
        overlay.destroy()
        dock.destroy()
        strip.destroy()
        tip.remove()
        ctx.asideSlot.replaceChildren()
      },
    }
  },
}
