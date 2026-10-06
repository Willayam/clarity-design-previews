import { clamp, fmtCs } from "./util.js"
import { nasaTranscript } from "./transcript-nasa.js"
import { crew9Transcript } from "./transcript-crew9.js"

const nasaUrl = (id, rendition) => `https://images-assets.nasa.gov/video/${id}/${id}~${rendition}.mp4`

/**
 * Public-domain NASA footage from images-assets.nasa.gov, which serves ranged
 * GETs with access-control-allow-origin: *. The "medium" rendition plays; the
 * smallest rendition feeds the thumbnail extractor and is prefetched whole
 * when it is under prefetchMB. Frame rates were read from presented-frame
 * deltas in Chromium (120 samples each), not from the metadata.
 */
export const SOURCES = [
  {
    id: "long",
    label: "28 min",
    kind: "nasa",
    title: "Crew-9 Crew News Conference",
    credit: "NASA, 2024, public domain. 27:32, four astronauts at a table, music and slate before the first words.",
    nasaId: "jsc2024m000139_Crew-9_Crew_News_Conference",
    player: "medium",
    thumbs: "mobile",
    duration: 1651.6,
    fps: 30,
    // The 66 MB prefetch runs only while no seeks are pending, so after a
    // minute or two every zoomed window fills instantly.
    prefetchMB: 80,
    transcript: crew9Transcript,
  },
  {
    id: "short",
    label: "3 min",
    kind: "nasa",
    title: "Space Station Astronauts Offer Holiday Greetings",
    credit: "NASA, 2025, public domain. 3:28, people talking to camera with a slate at the head and b-roll at the tail.",
    nasaId: "jsc2025m000043_Space_Station_Astronauts_Offer_Holiday_Greetings_251222",
    player: "medium",
    thumbs: "small",
    duration: 207.63,
    fps: 30,
    prefetchMB: 80,
    transcript: nasaTranscript,
  },
  {
    id: "synthetic",
    label: "60 min synthetic",
    kind: "synthetic",
    title: "Synthetic recording",
    credit: "A canvas scene with a burned-in timecode, drawn on demand.",
    duration: 3600,
    fps: 30,
  },
]

export const TILE_W = 192
export const TILE_H = 108
const CACHE_CAP = 1400

const keyOf = (t) => Math.round(t * 100)

/**
 * Frames by time on a centisecond grid. `want` replaces a lane's wish list,
 * so stale requests from a window that scrolled away never run.
 */
class FrameCache {
  constructor({ extract, gate }) {
    this.map = new Map()
    this.keys = []
    this.lanes = new Map()
    this.subs = new Set()
    this.failed = new Set()
    this.retried = new Set()
    this.inflight = null
    this.extract = extract
    this.gate = gate ?? Promise.resolve()
    this.running = false
    this.laneCursor = 0
    this.done = 0
    this.pendingCount = 0
    this.notifyId = null
  }
  get(t) {
    return this.map.get(keyOf(t)) ?? null
  }
  has(t) {
    return this.map.has(keyOf(t))
  }
  nearest(t, maxDt = Infinity) {
    const keys = this.keys
    if (!keys.length) return null
    const k = keyOf(t)
    let lo = 0
    let hi = keys.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (keys[mid] < k) lo = mid + 1
      else hi = mid
    }
    let best = keys[lo]
    if (lo > 0 && Math.abs(keys[lo - 1] - k) < Math.abs(best - k)) best = keys[lo - 1]
    const dt = Math.abs(best - k) / 100
    if (dt > maxDt) return null
    return { frame: this.map.get(best), t: best / 100, dt }
  }
  insert(t, frame) {
    const k = keyOf(t)
    if (this.map.has(k)) {
      this.map.set(k, frame)
      return
    }
    this.map.set(k, frame)
    const keys = this.keys
    let lo = 0
    let hi = keys.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (keys[mid] < k) lo = mid + 1
      else hi = mid
    }
    keys.splice(lo, 0, k)
    if (this.map.size > CACHE_CAP) this.trim()
  }
  trim() {
    const drop = Math.floor(this.map.size / 2)
    let i = 0
    for (const k of this.map.keys()) {
      if (i++ >= drop) break
      this.map.delete(k)
    }
    this.keys = [...this.map.keys()].sort((a, b) => a - b)
  }
  want(times, focus, lane = "default") {
    if (!this.extract) return
    const list = []
    const seen = new Set()
    for (const t of times) {
      const k = keyOf(t)
      if (seen.has(k) || this.map.has(k) || this.failed.has(k) || this.inflight === k) continue
      seen.add(k)
      list.push(k / 100)
    }
    // Sparse first: every 8th tile, then 4th, 2nd, then the rest, so a long
    // strip shows its shape after a few seeks and refines in place.
    const ranked = list.map((t, i) => ({ t, rank: i % 8 === 0 ? 0 : i % 4 === 0 ? 1 : i % 2 === 0 ? 2 : 3, i }))
    ranked.sort((a, b) => a.rank - b.rank || a.i - b.i)
    this.lanes.set(lane, { times: ranked.map((r) => r.t), focus })
    this.recount()
    this.kick()
  }
  recount() {
    this.pendingCount = [...this.lanes.values()].reduce((n, l) => n + l.times.length, 0)
  }
  subscribe(cb) {
    this.subs.add(cb)
    return () => this.subs.delete(cb)
  }
  notify() {
    if (this.notifyId !== null) return
    this.notifyId = requestAnimationFrame(() => {
      this.notifyId = null
      for (const cb of this.subs) cb(this)
    })
  }
  next() {
    const lanes = [...this.lanes.entries()].filter(([, l]) => l.times.length)
    if (!lanes.length) {
      this.pendingCount = 0
      return null
    }
    const [name, lane] = lanes[this.laneCursor++ % lanes.length]
    const t = lane.times.shift()
    this.recount()
    if (this.map.has(keyOf(t))) return this.next()
    this.inflight = keyOf(t)
    return { t, lane: name }
  }
  async kick() {
    if (this.running) return
    this.running = true
    try {
      await this.gate
      let item
      while ((item = this.next())) {
        try {
          const frame = await this.extract(item.t)
          if (frame) {
            this.insert(item.t, frame)
            this.done += 1
          } else {
            this.failed.add(keyOf(item.t))
          }
        } catch (err) {
          const k = keyOf(item.t)
          if (!this.retried.has(k)) {
            this.retried.add(k)
            const lane = this.lanes.get(item.lane)
            if (lane) lane.times.push(item.t)
          } else {
            console.warn("[frames] extract failed twice at", item.t, err)
            this.failed.add(k)
          }
        }
        this.inflight = null
        this.recount()
        this.notify()
      }
    } finally {
      this.running = false
      this.inflight = null
      this.recount()
      this.notify()
    }
  }
}

/** Synthetic frames draw on demand; nothing is ever pending. */
class SyntheticFrameCache extends FrameCache {
  constructor(draw) {
    super({ extract: null })
    this.draw = draw
  }
  get(t) {
    let f = super.get(t)
    if (!f) {
      f = document.createElement("canvas")
      f.width = TILE_W
      f.height = TILE_H
      this.draw(f.getContext("2d"), keyOf(t) / 100, TILE_W, TILE_H)
      this.insert(t, f)
    }
    return f
  }
  has() {
    return true
  }
  nearest(t) {
    return { frame: this.get(t), t: keyOf(t) / 100, dt: 0 }
  }
  want() {}
}

function seekTo(video, t) {
  return new Promise((resolve, reject) => {
    if (Math.abs(video.currentTime - t) < 0.0005 && video.readyState >= 2) {
      resolve()
      return
    }
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error("seek timeout"))
    }, 8000)
    const onSeeked = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error("video error"))
    }
    const cleanup = () => {
      clearTimeout(timer)
      video.removeEventListener("seeked", onSeeked)
      video.removeEventListener("error", onError)
    }
    video.addEventListener("seeked", onSeeked)
    video.addEventListener("error", onError)
    video.currentTime = t
  })
}

function drawCover(ctx, img, sw, sh, dx, dy, dw, dh) {
  const scale = Math.max(dw / sw, dh / sh)
  const cw = dw / scale
  const ch = dh / scale
  const sx = (sw - cw) / 2
  const sy = (sh - ch) / 2
  ctx.drawImage(img, sx, sy, cw, ch, dx, dy, dw, dh)
}

function wrapVideo(video, getDuration) {
  return {
    kind: "video",
    el: video,
    get currentTime() {
      return video.currentTime
    },
    set currentTime(t) {
      video.currentTime = t
    },
    get duration() {
      return getDuration()
    },
    get paused() {
      return video.paused
    },
    play() {
      return video.play().catch((err) => console.warn("[player] play failed", err))
    },
    pause() {
      video.pause()
    },
    on(ev, cb) {
      video.addEventListener(ev, cb)
      return () => video.removeEventListener(ev, cb)
    },
    onFrame(cb) {
      if (!("requestVideoFrameCallback" in video)) return null
      let id = 0
      const loop = (_now, meta) => {
        cb(meta.mediaTime)
        id = video.requestVideoFrameCallback(loop)
      }
      id = video.requestVideoFrameCallback(loop)
      return () => video.cancelVideoFrameCallback(id)
    },
  }
}

function createNasaSource(cfg, { dur, onStatus }) {
  const playerUrl = nasaUrl(cfg.nasaId, cfg.player)
  const thumbUrl = nasaUrl(cfg.nasaId, cfg.thumbs)
  // Metadata only, as the real modal: a 478 MB file on preload="auto" would
  // stream ahead and starve the thumbnail extractor. One seek shows a frame.
  const video = document.createElement("video")
  video.crossOrigin = "anonymous"
  video.preload = "metadata"
  video.playsInline = true
  video.src = playerUrl
  video.addEventListener("loadedmetadata", () => { if (video.currentTime === 0) video.currentTime = 0.05 }, { once: true })

  // Metadata only: "auto" would stream ahead of every seek and compete with
  // the seeks themselves (and with the prefetch) for bandwidth.
  const hidden = document.createElement("video")
  hidden.crossOrigin = "anonymous"
  hidden.preload = "metadata"
  hidden.muted = true
  hidden.playsInline = true
  hidden.src = thumbUrl

  let resolveGate
  const gate = new Promise((r) => (resolveGate = r))
  const durationSubs = new Set()
  const fpsSubs = new Set()
  const progressSubs = new Set()
  // The thumbnail rendition is fetched whole in the background; once it is in
  // memory the hidden video re-points at the blob and every seek is local.
  let blobUrl = null
  let swapped = false
  const swapToBlob = () =>
    new Promise((resolve) => {
      hidden.addEventListener("loadedmetadata", () => resolve(), { once: true })
      hidden.src = blobUrl
    })

  const src = {
    kind: "nasa",
    id: cfg.id,
    label: cfg.label,
    title: cfg.title,
    credit: cfg.credit,
    playerUrl,
    thumbUrl,
    duration: dur ? Math.min(dur, cfg.duration) : cfg.duration,
    fps: cfg.fps,
    fpsMeasured: true,
    transcript: cfg.transcript,
    player: wrapVideo(video, () => src.duration),
    frames: null,
    download: { done: 0, total: 0, complete: false },
    onDuration(cb) {
      durationSubs.add(cb)
      return () => durationSubs.delete(cb)
    },
    onFps(cb) {
      fpsSubs.add(cb)
      return () => fpsSubs.delete(cb)
    },
    onProgress(cb) {
      progressSubs.add(cb)
      return () => progressSubs.delete(cb)
    },
    ready: null,
  }

  src.frames = new FrameCache({
    gate,
    extract: async (t) => {
      if (blobUrl && !swapped) {
        swapped = true
        await swapToBlob()
      }
      await seekTo(hidden, t)
      if (hidden.readyState < 2) return null
      const c = document.createElement("canvas")
      c.width = TILE_W
      c.height = TILE_H
      drawCover(c.getContext("2d"), hidden, hidden.videoWidth || 640, hidden.videoHeight || 360, 0, 0, TILE_W, TILE_H)
      return c
    },
  })

  src.ready = new Promise((resolve, reject) => {
    const onMeta = () => {
      const d = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : cfg.duration
      src.duration = dur ? Math.min(dur, d) : d
      for (const cb of durationSubs) cb(src.duration)
      resolve(src)
    }
    video.addEventListener("loadedmetadata", onMeta, { once: true })
    video.addEventListener("error", () => reject(new Error("player video failed")), { once: true })
    setTimeout(() => reject(new Error("player metadata timeout")), 25000)
  })

  hidden.addEventListener("loadedmetadata", () => resolveGate(), { once: true })
  hidden.addEventListener("error", () => {
    onStatus?.("thumbnail video failed")
    resolveGate()
  })

  const notifyProgress = () => {
    for (const cb of progressSubs) cb(src.download)
  }
  // The prefetch starts once the player has metadata and the first coarse
  // frames have had a few seconds of bandwidth to themselves.
  ;(async () => {
    try {
      await src.ready.catch(() => {})
      await new Promise((r) => setTimeout(r, 3500))
      const res = await fetch(thumbUrl, { priority: "low" })
      if (!res.ok || !res.body) return
      src.download.total = Number(res.headers.get("content-length")) || 0
      if (src.download.total > (cfg.prefetchMB ?? 80) * 1048576) {
        src.download.total = 0
        await res.body.cancel()
        return
      }
      const reader = res.body.getReader()
      const chunks = []
      let lastNotify = 0
      while (true) {
        // Yield to the extractor: while strips wait for frames, stop reading
        // so the seeks get the bandwidth (the socket's own buffer then fills).
        while (src.frames.pendingCount > 0 || src.frames.running) {
          await new Promise((r) => setTimeout(r, 100))
        }
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        src.download.done += value.byteLength
        if (performance.now() - lastNotify > 250) {
          lastNotify = performance.now()
          notifyProgress()
        }
      }
      blobUrl = URL.createObjectURL(new Blob(chunks, { type: "video/mp4" }))
      src.download.complete = true
      notifyProgress()
    } catch (err) {
      console.warn("[frames] thumbnail prefetch failed, seeking over the network instead", err)
    }
  })()

  return src
}

/* ---------------- synthetic video ---------------- */

const PITCH = [
  ["Hi Sarah, it's Will from Clarity.", "I just got off our call and wanted to follow up on the rollout plan for your team."],
  ["So the three things we talked about were onboarding your reps, the template for the follow-up page, and the reporting your manager asked for.", "I put all of that into the page below."],
  ["The first part is onboarding.", "Every rep records one video, we build the page around it, and it goes out the same day.", "No design work on your side."],
  ["Second is the template.", "I kept your brand colors and the pricing block you liked, and I moved the calendar link above the fold."],
  ["Third, reporting.", "You'll see who opened the page, how much of the video they watched, and when they clicked the booking link."],
  ["There's a short walkthrough further down, and the pricing is exactly what we discussed, nothing new."],
  ["One more thing on timing.", "If the team starts next Monday, the first pages go out Tuesday afternoon, and you'll have a week of data before the review."],
  ["If this looks right, just reply here or grab a slot on the calendar and we'll get your team set up this week.", "Thanks Sarah, talk soon."],
]

function buildSyntheticTranscript(duration) {
  const words = []
  let t = 7.1
  let para = 0
  const push = (w, len) => {
    const d = 0.16 + 0.038 * w.replace(/[^a-z]/gi, "").length + (len ?? 0)
    words.push({ w, s: +t.toFixed(3), e: +(t + d).toFixed(3), p: para })
    t += d + 0.07
  }
  // The fumble before the pitch.
  push("Uh,")
  t += 0.5
  push("okay.")
  t += 0.9
  for (const w of "Is it recording?".split(" ")) push(w)
  t += 0.7
  push("Right.")
  t += 0.9
  para++
  const endOfSpeech = duration - 9.4
  let cycle = 0
  outer: while (true) {
    for (const paragraph of PITCH) {
      for (const sentence of paragraph) {
        const ws = sentence.split(" ")
        for (const w of ws) {
          if (t > endOfSpeech - 0.6) break outer
          push(w)
        }
        t += 0.45
      }
      t += 0.9
      para++
    }
    cycle++
    if (cycle > 400) break
  }
  return { title: "Synthetic recording", words }
}

function hash01(n) {
  let x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function makeSceneDrawer({ duration, fps, words }) {
  const firstSpeech = words[0].s
  const lastSpeech = words[words.length - 1].e
  const isSpeaking = (t) => {
    let lo = 0
    let hi = words.length - 1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      const w = words[mid]
      if (t < w.s) hi = mid - 1
      else if (t > w.e) lo = mid + 1
      else return true
    }
    return false
  }
  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
    ctx.fill()
  }
  return function drawScene(ctx, t, w, h) {
    const S = h / 720
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, "#e4e9f1")
    g.addColorStop(1, "#b8c3d2")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    // window with sky
    const sky = ctx.createLinearGradient(0, 0.1 * h, 0, 0.62 * h)
    sky.addColorStop(0, "#8ec5f0")
    sky.addColorStop(1, "#d7ecfb")
    ctx.fillStyle = "#f3f6fa"
    roundRect(ctx, 0.05 * w, 0.1 * h, 0.27 * w, 0.52 * h, 6 * S)
    ctx.fillStyle = sky
    ctx.fillRect(0.065 * w, 0.125 * h, 0.24 * w, 0.47 * h)
    ctx.fillStyle = "#f3f6fa"
    ctx.fillRect(0.183 * w, 0.125 * h, 0.006 * w, 0.47 * h)
    ctx.fillRect(0.065 * w, 0.355 * h, 0.24 * w, 0.008 * h)
    // shelf with books
    ctx.fillStyle = "#6b5141"
    roundRect(ctx, 0.7 * w, 0.17 * h, 0.26 * w, 0.46 * h, 4 * S)
    const colors = ["#2563eb", "#f59e0b", "#0ea5e9", "#dc2626", "#059669", "#64748b", "#a855f7"]
    for (let i = 0; i < 11; i++) {
      ctx.fillStyle = colors[i % colors.length]
      const bw = 0.018 * w
      ctx.fillRect(0.715 * w + i * (bw + 0.004 * w), 0.21 * h + (i % 3) * 0.01 * h, bw, 0.16 * h - (i % 3) * 0.01 * h)
      ctx.fillRect(0.715 * w + i * (bw + 0.004 * w), 0.44 * h + ((i + 1) % 3) * 0.01 * h, bw, 0.16 * h - ((i + 1) % 3) * 0.01 * h)
    }
    // wall clock: a sweeping second hand makes sub-second time visible
    const ccx = 0.47 * w
    const ccy = 0.14 * h
    const cr = 0.075 * h
    ctx.fillStyle = "#fff"
    ctx.beginPath()
    ctx.arc(ccx, ccy, cr, 0, Math.PI * 2)
    ctx.fill()
    ctx.lineWidth = 3 * S
    ctx.strokeStyle = "#334155"
    ctx.stroke()
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(ccx + Math.cos(a) * cr * 0.82, ccy + Math.sin(a) * cr * 0.82)
      ctx.lineTo(ccx + Math.cos(a) * cr * 0.92, ccy + Math.sin(a) * cr * 0.92)
      ctx.lineWidth = 2 * S
      ctx.stroke()
    }
    const minA = ((t / 60) % 60) / 60 * Math.PI * 2 - Math.PI / 2
    const secA = (t % 60) / 60 * Math.PI * 2 - Math.PI / 2
    ctx.strokeStyle = "#0f172a"
    ctx.lineWidth = 4 * S
    ctx.beginPath()
    ctx.moveTo(ccx, ccy)
    ctx.lineTo(ccx + Math.cos(minA) * cr * 0.55, ccy + Math.sin(minA) * cr * 0.55)
    ctx.stroke()
    ctx.strokeStyle = "#dc2626"
    ctx.lineWidth = 2 * S
    ctx.beginPath()
    ctx.moveTo(ccx - Math.cos(secA) * cr * 0.15, ccy - Math.sin(secA) * cr * 0.15)
    ctx.lineTo(ccx + Math.cos(secA) * cr * 0.85, ccy + Math.sin(secA) * cr * 0.85)
    ctx.stroke()
    // desk
    ctx.fillStyle = "#8b6b4a"
    ctx.fillRect(0, 0.86 * h, w, 0.14 * h)
    // person
    const phase = t < firstSpeech - 0.4 ? "lead" : t > lastSpeech + 0.5 ? "tail" : "talk"
    const speaking = isSpeaking(t)
    const bob = Math.sin(t * Math.PI * 2 * 0.35) * 4 * S
    const cx = 0.5 * w
    const cy = 0.5 * h + bob
    ctx.fillStyle = "#2f4a6b"
    roundRect(ctx, cx - 0.17 * w, cy + 0.14 * h, 0.34 * w, 0.4 * h, 46 * S)
    ctx.fillStyle = "#e8c39e"
    ctx.fillRect(cx - 0.03 * w, cy + 0.08 * h, 0.06 * w, 0.09 * h)
    const tilt = phase === "lead" ? 0.16 : phase === "tail" ? -0.14 : Math.sin(t * 0.9) * 0.03
    ctx.save()
    ctx.translate(cx, cy - 0.02 * h)
    ctx.rotate(tilt)
    ctx.fillStyle = "#e8c39e"
    ctx.beginPath()
    ctx.ellipse(0, 0, 0.082 * w, 0.135 * h, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#3b2a1e"
    ctx.beginPath()
    ctx.ellipse(0, -0.07 * h, 0.085 * w, 0.085 * h, 0, Math.PI, Math.PI * 2)
    ctx.fill()
    const eyeDy = phase === "lead" ? 0.012 * h : 0
    const blink = (t * 1000) % 3400 < 110
    ctx.fillStyle = "#1e293b"
    for (const sx of [-1, 1]) {
      if (blink) {
        ctx.fillRect(sx * 0.03 * w - 6 * S, -0.02 * h + eyeDy, 12 * S, 2 * S)
      } else {
        ctx.beginPath()
        ctx.arc(sx * 0.03 * w, -0.02 * h + eyeDy, 5 * S, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    const open = speaking ? 3 + 10 * hash01(Math.floor(t / 0.09)) : 2
    ctx.fillStyle = "#7a2e2e"
    ctx.beginPath()
    ctx.ellipse(0, 0.065 * h, 0.026 * w, open * S, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    // the arm reaching for the stop button at the head and the tail
    let reach = 0
    if (phase === "lead" && t < 1.8) reach = 1 - t / 1.8
    if (phase === "tail") reach = clamp((t - (lastSpeech + 0.5)) / 2.4, 0, 1)
    if (reach > 0) {
      ctx.fillStyle = "#e8c39e"
      const ax = cx + 0.22 * w - reach * 0.1 * w
      const ay = h - reach * 0.55 * h
      ctx.beginPath()
      ctx.moveTo(cx + 0.14 * w, h)
      ctx.lineTo(cx + 0.26 * w, h)
      ctx.lineTo(ax + 0.04 * w, ay)
      ctx.lineTo(ax - 0.04 * w, ay)
      ctx.closePath()
      ctx.fill()
      ctx.beginPath()
      ctx.arc(ax, ay, (0.045 + reach * 0.03) * w, 0, Math.PI * 2)
      ctx.fill()
    }
    // frame ticker: one tick per frame, so a single frame step is visible
    const frame = Math.floor(t * fps + 1e-6)
    ctx.fillStyle = "rgba(15,23,42,0.65)"
    ctx.fillRect(w - 0.035 * w, 0.68 * h, 0.035 * w, 0.18 * h)
    ctx.fillStyle = "#f8fafc"
    for (let i = -2; i < 12; i++) {
      const y = 0.68 * h + ((i * 12 - (frame % 12)) * (0.18 * h)) / 12 + 0.09 * h
      if (y < 0.68 * h || y > 0.86 * h) continue
      ctx.fillRect(w - 0.03 * w, y, i % 3 === 0 ? 0.025 * w : 0.012 * w, 2 * S)
    }
    // burned-in timecode
    const label = phase === "lead" ? "LEAD-IN" : phase === "tail" ? "TAIL" : speaking ? "SPEAKING" : "PAUSE"
    ctx.fillStyle = "rgba(2,6,23,0.78)"
    roundRect(ctx, 0.03 * w, 0.72 * h, 0.4 * w, 0.17 * h, 8 * S)
    ctx.fillStyle = "#f8fafc"
    ctx.font = `700 ${Math.round(50 * S)}px "JetBrains Mono", ui-monospace, Menlo, monospace`
    ctx.textBaseline = "alphabetic"
    ctx.fillText(fmtCs(t), 0.05 * w, 0.8 * h)
    ctx.font = `600 ${Math.round(22 * S)}px "JetBrains Mono", ui-monospace, Menlo, monospace`
    ctx.fillStyle = "#cbd5e1"
    ctx.fillText(`f ${frame}`, 0.05 * w, 0.855 * h)
    ctx.fillStyle = label === "SPEAKING" ? "#86efac" : label === "PAUSE" ? "#fde68a" : "#fca5a5"
    ctx.fillText(label, 0.17 * w, 0.855 * h)
  }
}

function createSyntheticSource({ duration = 360, fps = 30 }) {
  const transcript = buildSyntheticTranscript(duration)
  const drawScene = makeSceneDrawer({ duration, fps, words: transcript.words })
  const canvas = document.createElement("canvas")
  canvas.className = "player"
  canvas.width = 1280
  canvas.height = 720
  const ctx = canvas.getContext("2d")
  const target = new EventTarget()
  const emit = (name) => target.dispatchEvent(new Event(name))
  let time = 0
  let playing = false
  let startedAt = 0
  let startT = 0
  let rafId = 0
  const draw = () => drawScene(ctx, time, canvas.width, canvas.height)
  const loop = () => {
    if (!playing) return
    time = startT + (performance.now() - startedAt) / 1000
    if (time >= duration) {
      time = duration
      playing = false
      draw()
      emit("timeupdate")
      emit("pause")
      emit("ended")
      return
    }
    draw()
    emit("timeupdate")
    rafId = requestAnimationFrame(loop)
  }
  draw()
  const player = {
    kind: "synthetic",
    el: canvas,
    get currentTime() {
      return time
    },
    set currentTime(t) {
      time = clamp(t, 0, duration)
      if (playing) {
        startT = time
        startedAt = performance.now()
      }
      emit("seeking")
      draw()
      emit("timeupdate")
      emit("seeked")
    },
    get duration() {
      return duration
    },
    get paused() {
      return !playing
    },
    play() {
      if (playing) return Promise.resolve()
      if (time >= duration) time = 0
      playing = true
      startT = time
      startedAt = performance.now()
      emit("play")
      rafId = requestAnimationFrame(loop)
      return Promise.resolve()
    },
    pause() {
      if (!playing) return
      playing = false
      cancelAnimationFrame(rafId)
      emit("pause")
    },
    on(ev, cb) {
      target.addEventListener(ev, cb)
      return () => target.removeEventListener(ev, cb)
    },
    onFrame() {
      return null
    },
  }
  const src = {
    kind: "synthetic",
    id: "synthetic",
    label: "synthetic",
    title: transcript.title,
    credit: "Synthetic scene drawn on a canvas",
    duration,
    fps,
    fpsMeasured: true,
    transcript,
    player,
    frames: new SyntheticFrameCache(drawScene),
    onDuration() {
      return () => {}
    },
    onFps() {
      return () => {}
    },
    onProgress() {
      return () => {}
    },
    download: { done: 0, total: 0, complete: true },
    ready: Promise.resolve(null),
  }
  src.ready = Promise.resolve(src)
  return src
}

export function loadSource({ id, dur, onStatus }) {
  const alias = id === "nasa" ? "short" : id
  const cfg = SOURCES.find((s) => s.id === alias) ?? SOURCES[0]
  if (cfg.kind === "synthetic") return createSyntheticSource({ duration: dur ?? cfg.duration, fps: cfg.fps })
  return createNasaSource(cfg, { dur, onStatus })
}

export { drawCover }
