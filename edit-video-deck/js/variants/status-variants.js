import { fmtSpan, h, on } from "../util.js"
import { icon } from "../icons.js"
import { segmented } from "../ui.js"

/** A cut shorter than this is not worth a control. */
const MIN_CUT = 0.05
/** A press shorter than this on a compare button applies the other side instead of peeking. */
const TAP_MS = 250

/**
 * Trim-status variants F to O, round 5. Each answers three states (auto: the
 * handles sit at the machine trim; hand: the rep moved one; full: the whole
 * video) and gives a way back to auto and a way to remove the trim.
 *
 * Every variant returns { center, paint(t, { selected, inTrim }) -> show }.
 * `center` is the console-center element (or null); `paint` updates it and
 * anything the variant hangs elsewhere (the Trim tab, the clock, the actions,
 * the band above the strip) and says whether the center should show.
 */
export function createStatusVariants(api) {
  const { ctx, store, speech, trimState, applyAuto, removeTrim, restoreStart, restoreEnd, placeAtHandle, trimTab, clockEl, actionsEl, cancelBtn, bandEl, repaint } = api
  const offs = []
  const menus = []
  const autoSilence = () => speech.autoTrim.start + (ctx.duration - speech.autoTrim.end)

  /** A small menu under an anchor; closes on an outside press or Escape. */
  const createMenu = (wrap, { align = "center" } = {}) => {
    const el = h(`div.menu.hidden.align-${align}`, { role: "menu" })
    wrap.append(el)
    const m = {
      el,
      wrap,
      isOpen: () => !el.classList.contains("hidden"),
      open: () => el.classList.remove("hidden"),
      close: () => el.classList.add("hidden"),
      toggle: () => (m.isOpen() ? m.close() : m.open()),
      setItems(items) {
        el.replaceChildren(
          ...items.map((it) =>
            h(
              "button.menu-item",
              {
                type: "button",
                role: "menuitemcheckbox",
                "aria-checked": String(Boolean(it.checked)),
                onclick: () => {
                  it.onPick?.()
                  if (!it.keepOpen) m.close()
                },
              },
              h("span.check", it.checked ? icon("check") : null),
              h("span.menu-label", it.label, it.sub ? h("small", it.sub) : null),
            ),
          ),
        )
      },
    }
    menus.push(m)
    return m
  }
  offs.push(
    on(document, "pointerdown", (e) => {
      for (const m of menus) if (m.isOpen() && !m.wrap.contains(e.target)) m.close()
    }),
  )
  const quietLink = (label, action, fn) => {
    const b = h("button.btn.link-quiet", { type: "button", "data-action": action }, label)
    offs.push(on(b, "click", fn))
    return b
  }
  const variants = {}

  /* F: Photos-style Auto button. Filled at the machine trim, outlined after a hand edit, plain on the full video. */
  {
    const btn = h("button.auto-btn", { type: "button", "aria-pressed": "true", "data-action": "auto-toggle" }, icon("sparkles"), h("span", "Auto"))
    offs.push(on(btn, "click", () => (trimState().kind === "auto" ? removeTrim() : applyAuto())))
    variants.f = {
      center: btn,
      paint(t) {
        btn.dataset.state = t.kind
        btn.setAttribute("aria-pressed", t.kind === "auto" ? "true" : "false")
        return true
      },
    }
  }

  /* G: Auto | Full, with Custom appearing once the rep drags. */
  {
    const pick = (v) => {
      if (v === "auto") applyAuto()
      else if (v === "full") removeTrim()
    }
    const two = segmented(
      [
        { v: "auto", label: "Auto" },
        { v: "full", label: "Full" },
      ],
      "auto",
      pick,
    )
    const three = segmented(
      [
        { v: "auto", label: "Auto" },
        { v: "full", label: "Full" },
        { v: "custom", label: "Custom" },
      ],
      "custom",
      pick,
    )
    const wrap = h("div.modes-wrap", two.el, three.el)
    variants.g = {
      center: wrap,
      paint(t) {
        const hand = t.kind === "hand"
        two.el.classList.toggle("hidden", hand)
        three.el.classList.toggle("hidden", !hand)
        if (hand) three.set("custom", { silent: true })
        else two.set(t.kind === "auto" ? "auto" : "full", { silent: true })
        return true
      },
    }
  }

  /* H: a dropdown, "Trim: Auto". */
  {
    const value = h("span.dd-value")
    const btn = h("button.dd-btn", { type: "button", "aria-haspopup": "menu", "aria-expanded": "false", "data-action": "trim-menu" }, h("span.dd-label", "Trim"), value, icon("chevronDown"))
    const wrap = h("div.dd-wrap", btn)
    const menu = createMenu(wrap)
    offs.push(
      on(btn, "click", () => {
        menu.toggle()
        btn.setAttribute("aria-expanded", String(menu.isOpen()))
      }),
    )
    variants.h = {
      center: wrap,
      menu,
      paint(t) {
        value.textContent = t.kind === "auto" ? "Auto" : t.kind === "full" ? "Full video" : "Custom"
        const items = [
          { label: "Auto", sub: `cuts ${fmtSpan(autoSilence())} of silence`, checked: t.kind === "auto", onPick: applyAuto },
          { label: "Full video", checked: t.kind === "full", onPick: removeTrim },
        ]
        if (t.kind === "hand") items.push({ label: "Custom", checked: true })
        menu.setItems(items)
        return true
      },
    }
  }

  /* I: a dot on the Trim tab only when the trim differs from auto, with "Reset to auto" then. Auto is silent. */
  {
    const dot = h("span.mod-dot.hidden", { "aria-hidden": "true" })
    trimTab.append(dot)
    const link = quietLink("Reset to auto", "reset-auto", applyAuto)
    variants.i = {
      center: link,
      paint(t, { selected }) {
        dot.classList.toggle("hidden", !(selected && t.kind !== "auto"))
        return t.kind !== "auto"
      },
    }
  }

  /* J: press and hold to compare. The buttons name the other side: hold peeks at it, a tap applies it. */
  {
    let peek = null
    const autoBtn = h("button.peek-btn", { type: "button", "data-action": "peek-auto" }, "Auto")
    const origBtn = h("button.peek-btn", { type: "button", "data-action": "peek-original" }, "Original")
    const wrap = h("div.peek-wrap", autoBtn, origBtn)
    const targetFor = (which) => (which === "auto" ? { start: speech.autoTrim.start, end: speech.autoTrim.end } : { start: 0, end: ctx.duration })
    const begin = (which, btn) => {
      if (peek) return
      peek = { which, btn, prev: { start: store.state.start, end: store.state.end }, at: performance.now() }
      btn.classList.add("held")
      const tg = targetFor(which)
      store.setRange(tg.start, tg.end, { preview: false })
      ctx.seekPlayhead(tg.start)
    }
    const end = () => {
      if (!peek) return
      const p = peek
      peek = null
      p.btn.classList.remove("held")
      if (performance.now() - p.at > TAP_MS) {
        store.setRange(p.prev.start, p.prev.end, { preview: false })
        ctx.seekPlayhead(p.prev.start)
      }
      repaint()
    }
    for (const [btn, which] of [
      [autoBtn, "auto"],
      [origBtn, "original"],
    ]) {
      offs.push(
        on(btn, "pointerdown", (e) => {
          if (e.button !== 0) return
          e.preventDefault()
          try {
            btn.setPointerCapture(e.pointerId)
          } catch {}
          begin(which, btn)
        }),
        on(btn, "pointerup", end),
        on(btn, "pointercancel", end),
        on(btn, "keydown", (e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault()
            begin(which, btn)
          }
        }),
        on(btn, "keyup", (e) => {
          if (e.key === " " || e.key === "Enter") end()
        }),
      )
    }
    variants.j = {
      center: wrap,
      get peeking() {
        return Boolean(peek)
      },
      paint(t) {
        if (peek) return true
        autoBtn.classList.toggle("hidden", t.kind === "auto")
        origBtn.classList.toggle("hidden", t.kind === "full")
        return true
      },
    }
  }

  /* K: a suggestion chip. Filled while applied; its outline stays when off so it can come back. */
  {
    const chip = h("button.sugg-chip", { type: "button", "aria-pressed": "true", "data-action": "suggestion" }, icon("sparkles"), h("span", "Silence removed"))
    offs.push(on(chip, "click", () => (trimState().kind === "auto" ? removeTrim() : applyAuto())))
    variants.k = {
      center: chip,
      paint(t) {
        chip.setAttribute("aria-pressed", String(t.kind === "auto"))
        return true
      },
    }
  }

  /* L: A's line plus a restore arrow above each cut end. */
  {
    const lIcon = h("span.status-icon")
    const lText = h("span")
    const autoLink = quietLink("Auto", "apply-auto", applyAuto)
    const line = h("div.status-line", lIcon, lText, autoLink)
    const headArrow = h("button.restore-arrow.head", { type: "button", "aria-label": "Put the start back", "data-action": "restore-start" }, icon("chevronLeft"))
    const tailArrow = h("button.restore-arrow.tail", { type: "button", "aria-label": "Put the end back", "data-action": "restore-end" }, icon("chevronRight"))
    bandEl.append(headArrow, tailArrow)
    offs.push(on(headArrow, "click", restoreStart), on(tailArrow, "click", restoreEnd))
    variants.l = {
      center: line,
      paint(t, { selected, inTrim }) {
        const active = selected && inTrim
        const cut = t.kind !== "full"
        lIcon.classList.toggle("hidden", !cut)
        lText.classList.toggle("hidden", !cut)
        if (cut) {
          lIcon.replaceChildren(icon(t.kind === "auto" ? "sparkles" : "scissors"))
          lText.textContent = t.kind === "auto" ? "Auto-trimmed" : "Trimmed"
        }
        autoLink.classList.toggle("hidden", t.kind === "auto")
        placeAtHandle(headArrow, t.start, "head", active && t.head >= MIN_CUT)
        placeAtHandle(tailArrow, t.end, "tail", active && t.tail >= MIN_CUT)
        return true
      },
    }
  }

  /* M: the quiet default. A sparkle by the clip length at auto, "Reset" after a hand edit, the rest behind a menu. */
  {
    let prefAuto = true
    const resetLink = quietLink("Reset", "reset-auto", applyAuto)
    const clockMark = h("span.clock-auto.hidden", { "aria-label": "Auto-trimmed" }, icon("sparkles"))
    clockEl.append(clockMark)
    const moreBtn = h("button.btn.ghost.icon.sm.more-btn.hidden", { type: "button", "aria-label": "More", "aria-haspopup": "menu", "data-action": "more" }, icon("more"))
    const moreWrap = h("div.more-wrap", moreBtn)
    actionsEl.insertBefore(moreWrap, cancelBtn)
    const menu = createMenu(moreWrap, { align: "right" })
    offs.push(on(moreBtn, "click", () => menu.toggle()))
    variants.m = {
      center: resetLink,
      menu,
      paint(t, { selected, inTrim }) {
        clockMark.classList.toggle("hidden", !(selected && t.kind === "auto"))
        moreBtn.classList.toggle("hidden", !(selected && inTrim))
        const items = [{ label: "Auto-trim new recordings", checked: prefAuto, keepOpen: true, onPick: () => { prefAuto = !prefAuto; repaint() } }]
        if (t.kind !== "auto") items.push({ label: t.kind === "hand" ? "Back to auto" : "Apply auto-trim", onPick: applyAuto })
        if (t.kind !== "full") items.push({ label: "Remove trim", onPick: removeTrim })
        menu.setItems(items)
        return t.kind === "hand"
      },
    }
  }

  /* N: one mode button that names the state and advances on tap: Auto, Off, Auto; Custom goes to Auto. */
  {
    const nIcon = h("span.status-icon")
    const nText = h("span")
    const btn = h("button.mode-btn", { type: "button", "data-action": "cycle-mode" }, nIcon, nText)
    offs.push(on(btn, "click", () => (trimState().kind === "auto" ? removeTrim() : applyAuto())))
    variants.n = {
      center: btn,
      paint(t) {
        btn.dataset.state = t.kind
        nIcon.replaceChildren(t.kind === "full" ? icon("circle") : icon(t.kind === "auto" ? "sparkles" : "scissors"))
        nText.textContent = t.kind === "auto" ? "Auto" : t.kind === "hand" ? "Custom" : "Off"
        return true
      },
    }
  }

  /* O: one undo link whose label is always the inverse of the current state. */
  {
    const oText = h("span")
    const link = h("button.inverse-link", { type: "button", "data-action": "inverse" }, icon("undo"), oText)
    offs.push(on(link, "click", () => (trimState().kind === "auto" ? removeTrim() : applyAuto())))
    variants.o = {
      center: link,
      paint(t) {
        oText.textContent = t.kind === "auto" ? "Undo auto-trim" : t.kind === "full" ? "Redo auto-trim" : "Undo changes"
        link.classList.toggle("redo", t.kind === "full")
        return true
      },
    }
  }

  /* P: the research pick. A chip names the cut; its popover explains it and names both ways out. */
  {
    const pIcon = h("span.status-icon")
    const pText = h("span")
    const chip = h("button.mode-btn", { type: "button", "aria-haspopup": "dialog", "aria-expanded": "false", "data-action": "trim-chip" }, pIcon, pText)
    const note = h("p.pop-note")
    const buttons = h("div.pop-actions")
    const pop = h("div.menu.hidden.align-center.trim-pop", { role: "dialog", "aria-label": "Trim" }, note, buttons)
    const wrap = h("div.dd-wrap", chip, pop)
    const m = {
      el: pop,
      wrap,
      isOpen: () => !pop.classList.contains("hidden"),
      open: () => pop.classList.remove("hidden"),
      close: () => {
        pop.classList.add("hidden")
        chip.setAttribute("aria-expanded", "false")
      },
    }
    menus.push(m)
    offs.push(
      on(chip, "click", () => {
        if (m.isOpen()) m.close()
        else {
          m.open()
          chip.setAttribute("aria-expanded", "true")
        }
      }),
    )
    const act = (label, fn, sparkle = false) =>
      h("button.btn.ghost.pop-btn", { type: "button", onclick: () => { fn(); m.close() } }, sparkle ? icon("sparkles") : null, label)
    variants.p = {
      center: wrap,
      paint(t) {
        const auto = speech.autoTrim
        const autoHead = auto.start
        const autoTail = ctx.duration - auto.end
        pIcon.replaceChildren(t.kind === "auto" ? icon("sparkles") : t.kind === "hand" ? icon("scissors") : icon("film"))
        chip.dataset.state = t.kind
        if (t.kind === "auto") {
          pText.textContent = `Cut ${fmtSpan(t.total)}`
          note.textContent = `Cut ${fmtSpan(autoHead)} of silence before the first word and ${fmtSpan(autoTail)} after the last.`
          buttons.replaceChildren(act("Use full video", removeTrim))
        } else if (t.kind === "hand") {
          pText.textContent = `Cut ${fmtSpan(t.total)}`
          note.textContent = `You set this trim. Auto-trim would cut ${fmtSpan(autoSilence())}.`
          buttons.replaceChildren(act("Use auto-trim", applyAuto, true), act("Use full video", removeTrim))
        } else {
          pText.textContent = "Full video"
          note.textContent = `Auto-trim would cut ${fmtSpan(autoSilence())} of silence.`
          buttons.replaceChildren(act("Use auto-trim", applyAuto, true))
        }
        return true
      },
    }
  }

  return {
    variants,
    closeMenus() {
      for (const m of menus) m.close()
    },
    menuOpen: () => menus.some((m) => m.isOpen()),
    onKey(e) {
      if (e.key !== "Escape") return false
      const open = menus.find((m) => m.isOpen())
      if (!open) return false
      open.close()
      return true
    },
    destroy() {
      for (const off of offs) off()
    },
  }
}
