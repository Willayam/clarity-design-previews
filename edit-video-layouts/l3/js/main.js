import { clamp, fmtSpan, fmtWhole, h, isTypingTarget, on } from "./util.js"
import { icon } from "./icons.js"
import { loadSource } from "./source.js"
import { createTrimStore, END_PREVIEW_OFFSET } from "./trim-store.js"
import { createSpeech } from "./speech.js"
import { createSession } from "./session.js"
import { variants } from "./variants/index.js"

const params = new URLSearchParams(location.search)
const srcId = params.get("src") === "long" ? "long" : "short"
const theme = params.get("theme") === "light" ? "light" : "dark"

const root = document.getElementById("modal-root")
const shellEl = document.getElementById("shell")
const switcherEl = document.getElementById("switcher")
const noteEl = document.getElementById("loading-note")

function createScrubber(player) {
  let pending = null
  let inflight = false
  let timer = null
  const apply = () => {
    if (pending == null) return
    const t = pending
    pending = null
    inflight = true
    clearTimeout(timer)
    timer = setTimeout(() => {
      inflight = false
      apply()
    }, 900)
    player.currentTime = t
  }
  player.on("seeked", () => {
    inflight = false
    clearTimeout(timer)
    apply()
  })
  return {
    seek(t) {
      pending = t
      if (!inflight) apply()
    },
    cancel() {
      pending = null
    },
  }
}

/** The Library page behind the modal: the card for this video carries the save state after Done. */
function renderShell(source, frames) {
  const thumb = h("canvas.card-thumb", { width: 320, height: 180 })
  const status = h("span.card-status.hidden")
  const card = h(
    "div.shell-card.this",
    h("div.card-media", thumb, h("span.card-length", fmtWhole(source.duration)), status),
    h("div.card-body", h("b", source.title), h("small", "Recorded today · 1 view")),
  )
  const others = Array.from({ length: 7 }, (_, i) => h("div.shell-card", h("div.card-media"), h("div.card-body", h("b.ph", { style: { width: `${44 + ((i * 37) % 40)}%` } }), h("small.ph", { style: { width: "38%" } }))))
  shellEl.replaceChildren(
    h("aside.shell-side", h("div.shell-logo", h("i"), "Clarity"), h("div.shell-nav", icon("home"), "Home"), h("div.shell-nav.on", icon("video"), "Videos"), h("div.shell-nav", icon("layout"), "Pages")),
    h("main.shell-main", h("header.shell-head", h("h1", "Videos"), h("span.btn.primary.sm.inert", "Record a video")), h("div.shell-grid", card, ...others)),
  )
  let painted = false
  const paint = () => {
    if (painted) return
    const near = frames.nearest(source.autoStart + 1.2, 4)
    if (!near) return
    painted = true
    thumb.getContext("2d").drawImage(near.frame, 0, 0, 320, 180)
  }
  frames.subscribe(paint)
  return {
    setStatus(text, tone) {
      status.textContent = text ?? ""
      status.className = `card-status${text ? "" : " hidden"}${tone ? " " + tone : ""}`
    },
  }
}

async function boot() {
  let source = loadSource({ id: srcId, onStatus: (s) => (noteEl.textContent = s) })
  try {
    await source.ready
  } catch (err) {
    console.warn("[proto] real video unavailable, using the synthetic scene", err)
    source = loadSource({ id: "synthetic", dur: 240 })
    await source.ready
  }
  const player = source.player
  const store = createTrimStore({ duration: source.duration, fps: source.fps })
  const scrubber = createScrubber(player)
  const speech = createSpeech({ words: source.transcript.words, duration: source.duration })
  source.autoStart = speech.autoTrim.start
  const session = createSession({ store, duration: source.duration, autoTrim: speech.autoTrim })
  const shell = renderShell(source, source.frames)
  store.setRange(speech.autoTrim.start, speech.autoTrim.end, { preview: false })
  player.el.setAttribute("playsinline", "")
  player.el.classList.add("video")
  const seekInitial = () => {
    player.currentTime = speech.autoTrim.start
    store.setPlayhead(speech.autoTrim.start)
  }
  if (player.el.readyState >= 1) seekInitial()
  else player.el.addEventListener("loadedmetadata", seekInitial, { once: true })

  if (source.kind === "nasa") {
    let loaded = player.el.readyState >= 2
    const noteFor = () => {
      noteEl.textContent = loaded ? "" : "Loading video…"
      noteEl.classList.toggle("hidden", !noteEl.textContent)
    }
    on(player.el, "loadeddata", () => {
      loaded = true
      noteFor()
    })
    source.frames.subscribe(noteFor)
    noteFor()
  } else {
    noteEl.textContent = "Real video unavailable here; showing the synthetic scene."
    noteEl.classList.remove("hidden")
  }
  source.onDuration((d) => store.setDuration(d))

  // Playback stops at the trim end, unless a preview range is playing.
  let windowPlay = null
  player.on("timeupdate", () => {
    const t = player.currentTime
    if (windowPlay) {
      if (!player.paused && t >= windowPlay.e - 0.005) {
        if (windowPlay.loop) player.currentTime = windowPlay.s
        else {
          player.pause()
          windowPlay = null
        }
      }
    } else if (!player.paused && t >= store.state.end - 0.005) {
      player.pause()
      player.currentTime = Math.max(store.state.start, store.state.end - END_PREVIEW_OFFSET)
    }
    store.setPlayhead(player.currentTime)
  })
  player.on("seeked", () => store.setPlayhead(player.currentTime))
  player.on("pause", () => {
    if (windowPlay && !windowPlay.loop) windowPlay = null
  })
  // A moved handle previews its frame, as the trimmer does today.
  store.subscribe((state, prev, meta) => {
    if (!meta.preview) return
    if (meta.reason !== "handle" && meta.reason !== "range") return
    const which = meta.which ?? (state.start !== prev.start ? "start" : "end")
    const t = store.previewTime(which)
    scrubber.seek(t)
    store.setPlayhead(t)
  })

  let active = null
  let activeIndex = 0
  let open = false
  const ctx = {
    store,
    source,
    frames: source.frames,
    player,
    scrubber,
    speech,
    session,
    theme,
    get duration() {
      return store.state.duration
    },
    get fps() {
      return store.state.fps
    },
    onDuration(cb) {
      return store.subscribe((s, p, meta) => {
        if (meta.reason === "duration") cb(s.duration)
      })
    },
    placeVideo(slot) {
      slot.append(player.el)
    },
    togglePlay() {
      if (!player.paused) {
        player.pause()
        windowPlay = null
        return
      }
      windowPlay = null
      const s = store.state
      if (player.currentTime < s.start || player.currentTime >= s.end - END_PREVIEW_OFFSET - 0.01) {
        player.currentTime = s.start
        store.setPlayhead(s.start)
      }
      player.play()
    },
    /** Plays s..e, looping or once, outside the trim-end rule. */
    playRange(s, e, { loop = false } = {}) {
      if (windowPlay && !player.paused && Math.abs(windowPlay.s - s) < 0.01 && Math.abs(windowPlay.e - e) < 0.01) {
        player.pause()
        windowPlay = null
        return
      }
      const token = { s, e, loop }
      windowPlay = token
      player.pause()
      player.currentTime = s
      store.setPlayhead(s)
      const onSeeked = () => {
        player.el.removeEventListener("seeked", onSeeked)
        if (windowPlay === token) player.play()
      }
      player.el.addEventListener("seeked", onSeeked)
    },
    isPlayingRange(s, e) {
      return Boolean(windowPlay && !player.paused && Math.abs(windowPlay.s - s) < 0.01 && Math.abs(windowPlay.e - e) < 0.01)
    },
    seekPlayhead(t) {
      const next = clamp(t, 0, store.state.duration)
      scrubber.seek(next)
      store.setPlayhead(next)
    },
    /** Closes the modal. `result` says what the variant did: { reason: "done" | "cancel", trimChanged, previewChanged }. */
    close(result) {
      player.pause()
      windowPlay = null
      open = false
      root.classList.add("closed")
      switcherEl.classList.remove("hidden")
      const c = session.state.committed.trim
      const trimmed = c.start > 0.0005 || c.end < store.state.duration - 0.0005
      clearTimeout(liveTimer)
      if (result.reason === "done" && result.trimChanged) {
        shell.setStatus("Preparing clip…", "busy")
        liveTimer = setTimeout(() => shell.setStatus(trimmed ? `Trimmed ${fmtSpan(session.silenceRemoved())} · live for viewers` : "Whole video · live for viewers", "live"), 3500)
      } else if (trimmed) shell.setStatus(`Trimmed ${fmtSpan(session.silenceRemoved())}${result.reason === "done" && result.previewChanged ? " · preview saved" : ""}`, "live")
      else shell.setStatus("", "")
      lastClose = result
    },
  }
  let liveTimer = null
  let lastClose = null

  /* ---------- reopen pill (shown only while the modal is closed) ---------- */
  const reopenBtn = h("button.btn.outline.sm", { type: "button", "data-action": "reopen" }, icon("film"), "Open Edit Video again")
  switcherEl.append(reopenBtn)
  switcherEl.classList.add("hidden")
  reopenBtn.addEventListener("click", () => mount(activeIndex))

  const mount = (index) => {
    active?.destroy()
    active = null
    root.replaceChildren()
    activeIndex = index
    const v = variants[index]
    session.discard()
    clearTimeout(liveTimer)
    shell.setStatus("", "")
    active = v.mount(ctx)
    active.variant = v
    root.append(active.el)
    root.classList.remove("closed")
    switcherEl.classList.add("hidden")
    open = true
    const p = new URLSearchParams(location.search)
    p.set("variant", v.slug)
    history.replaceState(null, "", `?${p.toString()}`)
  }

  const requested = (params.get("variant") ?? "a").toLowerCase()
  const startIndex = Math.max(0, variants.findIndex((v) => v.slug === requested || v.id.toLowerCase() === requested))
  mount(startIndex)

  document.addEventListener("keydown", (e) => {
    if (isTypingTarget(e.target)) return
    if (e.metaKey || e.ctrlKey) return
    if (open && active?.onKey?.(e)) {
      e.preventDefault()
      return
    }
    if (e.key === " " && open) {
      e.preventDefault()
      ctx.togglePlay()
    } else if (e.key === "Enter" && !open) {
      mount(activeIndex)
    }
  })

  const waitFrames = (timeout = 8000, fraction = 1) =>
    new Promise((resolve) => {
      const started = performance.now()
      let initial = null
      const tick = () => {
        const f = source.frames
        const elapsed = performance.now() - started
        if (elapsed > 700 && initial === null && f.pendingCount > 0) initial = f.pendingCount
        const settled = elapsed > 700 && f.pendingCount === 0 && f.running === false
        const enough = initial !== null && f.pendingCount <= initial * (1 - fraction)
        if (settled || enough || elapsed > timeout) resolve()
        else setTimeout(tick, 100)
      }
      tick()
    })

  window.__proto = {
    ready: true,
    store,
    session,
    source,
    player,
    ctx,
    speech,
    get variant() {
      return variants[activeIndex].id
    },
    get open() {
      return open
    },
    get lastClose() {
      return lastClose
    },
    get active() {
      return active
    },
    mount(id) {
      const i = variants.findIndex((v) => v.id === String(id).toUpperCase() || v.slug === String(id).toLowerCase())
      if (i >= 0) mount(i)
    },
    measure() {
      return {
        variant: variants[activeIndex].id,
        duration: store.state.duration,
        start: store.state.start,
        end: store.state.end,
        committed: session.state.committed,
        preview: session.state.preview,
        save: session.state.save,
        dirty: session.dirty(),
        open,
        ...(active?.measure?.() ?? {}),
      }
    },
    framesPending() {
      return source.frames.pendingCount ?? 0
    },
    waitFrames,
  }
}

boot().catch((err) => {
  console.error(err)
  noteEl.textContent = `Failed: ${err.message}`
  noteEl.classList.remove("hidden")
})
