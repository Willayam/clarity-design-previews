import { clamp, fmtCs, h, isTypingTarget, on } from "./util.js"
import { icon } from "./icons.js"
import { loadSource } from "./source.js"
import { createTrimStore, END_PREVIEW_OFFSET } from "./trim-store.js"
import { variants } from "./variants/index.js"

const params = new URLSearchParams(location.search)
const srcKind = params.get("src") === "synthetic" ? "synthetic" : "nasa"
const durParam = Number(params.get("dur"))
const dur = Number.isFinite(durParam) && durParam > 0 ? durParam : null
const debug = params.has("debug")

const playerCard = document.getElementById("player-card")
const dock = document.getElementById("dock")
const asideSlot = document.getElementById("aside-slot")
const loadingNote = document.getElementById("loading-note")
const timecodeEl = document.getElementById("timecode")
const switcherEl = document.getElementById("switcher")
const debugEl = document.getElementById("debug")
document.getElementById("dialog-close").append(icon("x"))
document.getElementById("save-status").prepend(icon("check"))

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

async function boot() {
  let source = loadSource({ kind: srcKind, dur, onStatus: (s) => (loadingNote.textContent = s) })
  let fallbackNote = null
  try {
    await source.ready
  } catch (err) {
    console.warn("[proto] real video unavailable, using the synthetic scene", err)
    fallbackNote = "Real video unavailable here; showing the synthetic scene."
    source = loadSource({ kind: "synthetic", dur: dur ?? 360 })
    await source.ready
  }
  const player = source.player
  const store = createTrimStore({ duration: source.duration, fps: source.fps })
  const scrubber = createScrubber(player)

  player.el.setAttribute("playsinline", "")
  playerCard.prepend(player.el)
  on(player.el, "click", () => ctx.togglePlay())
  if (source.kind === "nasa") {
    let loaded = player.el.readyState >= 2
    const noteFor = () => {
      const pend = source.frames.pendingCount
      const dl = source.download
      const parts = []
      if (!loaded) parts.push("Loading video…")
      if (pend > 0) parts.push(`Filmstrip: ${pend} frames to go`)
      if (dl.total && !dl.complete) parts.push(`Thumbnail source ${(dl.done / 1048576).toFixed(0)} of ${(dl.total / 1048576).toFixed(0)} MB`)
      loadingNote.textContent = parts.join(" · ")
      loadingNote.classList.toggle("hidden", !loadingNote.textContent)
    }
    on(player.el, "loadeddata", () => {
      loaded = true
      noteFor()
    })
    source.frames.subscribe(noteFor)
    source.onProgress(noteFor)
    noteFor()
  } else {
    loadingNote.textContent = fallbackNote ?? ""
    loadingNote.classList.toggle("hidden", !fallbackNote)
  }

  source.onDuration((d) => store.setDuration(d))
  source.onFps((f) => store.setFps(f))

  // The burned-in timecode chip reads presented frames when the browser offers them.
  const tcText = timecodeEl.querySelector(".tc")
  const tcFrame = timecodeEl.querySelector(".frame")
  const paintTimecode = (t) => {
    tcText.textContent = fmtCs(t)
    tcFrame.textContent = `f ${Math.floor(t * store.state.fps + 1e-4)}`
  }
  const stopFrames = player.onFrame((t) => paintTimecode(t))
  if (!stopFrames) {
    const loop = () => {
      paintTimecode(player.currentTime)
      requestAnimationFrame(loop)
    }
    loop()
  } else {
    player.on("seeked", () => paintTimecode(player.currentTime))
    paintTimecode(0)
  }

  // Playhead follows the player; playback stops at the trim end.
  player.on("timeupdate", () => {
    const t = player.currentTime
    if (!player.paused && t >= store.state.end - 0.005) {
      player.pause()
      player.currentTime = Math.max(store.state.start, store.state.end - END_PREVIEW_OFFSET)
    }
    store.setPlayhead(player.currentTime)
  })
  player.on("seeked", () => store.setPlayhead(player.currentTime))

  // A moved handle previews its frame, as today.
  store.subscribe((state, prev, meta) => {
    if (!meta.preview) return
    if (meta.reason !== "handle" && meta.reason !== "range") return
    const which = meta.which ?? (state.start !== prev.start ? "start" : "end")
    const t = store.previewTime(which)
    scrubber.seek(t)
    store.setPlayhead(t)
  })

  const ctx = {
    store,
    source,
    frames: source.frames,
    player,
    scrubber,
    dock,
    asideSlot,
    playerCard,
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
    togglePlay() {
      if (!player.paused) {
        player.pause()
        return
      }
      const s = store.state
      if (player.currentTime < s.start || player.currentTime >= s.end - END_PREVIEW_OFFSET - 0.01) {
        player.currentTime = s.start
        store.setPlayhead(s.start)
      }
      player.play()
    },
    seekPlayhead(t) {
      const next = clamp(t, 0, store.state.duration)
      scrubber.seek(next)
      store.setPlayhead(next)
    },
  }

  /* ---------- variants ---------- */
  let active = null
  let activeIndex = 0
  const label = h("span.label")
  const count = h("span.count")
  const prev = h("button.btn.ghost.icon", { type: "button", "aria-label": "Previous variant" }, icon("chevronLeft"))
  const next = h("button.btn.ghost.icon", { type: "button", "aria-label": "Next variant" }, icon("chevronRight"))
  const otherSrc = new URLSearchParams(location.search)
  otherSrc.set("src", source.kind === "nasa" ? "synthetic" : "nasa")
  const srcLink = h("a.src-toggle", { href: `?${otherSrc.toString()}`, title: "Switch the video source" }, source.kind === "nasa" ? "synthetic scene" : "NASA footage")
  switcherEl.append(prev, label, next, count, srcLink)
  prev.addEventListener("click", () => switchBy(-1))
  next.addEventListener("click", () => switchBy(1))

  const mount = (index) => {
    active?.destroy()
    active = null
    activeIndex = index
    const v = variants[index]
    dock.replaceChildren()
    asideSlot.replaceChildren()
    store.setActive(null)
    store.setFocused(null)
    active = v.mount(ctx)
    active.variant = v
    label.replaceChildren(`${v.id}: ${v.label}`, h("small", v.subtitle))
    count.textContent = `${index + 1} / ${variants.length}`
    const p = new URLSearchParams(location.search)
    p.set("variant", v.id)
    history.replaceState(null, "", `?${p.toString()}`)
    otherSrc.set("variant", v.id)
    srcLink.href = `?${otherSrc.toString()}`
    document.title = `${v.id}: ${v.label} · Trim precision prototype`
    paintDebug()
  }
  const switchBy = (delta) => mount((activeIndex + delta + variants.length) % variants.length)

  const requested = (params.get("variant") ?? "0").toUpperCase()
  const startIndex = Math.max(0, variants.findIndex((v) => v.id === requested))
  mount(startIndex)

  document.addEventListener("keydown", (e) => {
    if (isTypingTarget(e.target)) return
    if (e.metaKey || e.ctrlKey) return
    if (active?.onKey?.(e)) {
      e.preventDefault()
      return
    }
    const onHandle = document.activeElement?.classList?.contains("handle")
    if (e.key === "ArrowLeft" && !onHandle) {
      e.preventDefault()
      switchBy(-1)
    } else if (e.key === "ArrowRight" && !onHandle) {
      e.preventDefault()
      switchBy(1)
    } else if (e.key === " ") {
      e.preventDefault()
      ctx.togglePlay()
    } else if (e.key === "Escape") {
      document.activeElement?.blur?.()
    }
  })

  function paintDebug() {
    if (!debug) return
    debugEl.classList.add("show")
    const m = active?.measure?.() ?? {}
    debugEl.textContent = JSON.stringify({ variant: variants[activeIndex].id, source: source.kind, duration: +store.state.duration.toFixed(3), fps: store.state.fps, ...m }, null, 1)
  }
  if (debug) store.subscribe(() => paintDebug())

  window.__proto = {
    ready: true,
    store,
    source,
    player,
    ctx,
    get variant() {
      return variants[activeIndex].id
    },
    get active() {
      return active
    },
    mount(id) {
      const i = variants.findIndex((v) => v.id === String(id).toUpperCase())
      if (i >= 0) mount(i)
    },
    measure() {
      return { variant: variants[activeIndex].id, source: source.kind, duration: store.state.duration, fps: store.state.fps, ...(active?.measure?.() ?? {}) }
    },
    framesPending() {
      return source.frames.pendingCount ?? 0
    },
  }
}

boot().catch((err) => {
  console.error(err)
  loadingNote.textContent = `Failed: ${err.message}`
})
