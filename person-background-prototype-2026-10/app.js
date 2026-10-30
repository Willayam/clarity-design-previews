import { FilesetResolver, ImageSegmenter } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/vision_bundle.mjs"

const MP_WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/wasm"
const MP_MODELS = {
  "mp-fast": "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
  "mp-multi": "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite",
}
const ORT_URL = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/ort.webgpu.min.mjs"
const ORT_DIST = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/"
// Byte-identical to PeterL1n/RobustVideoMatting v1.0.0 (sha256 88d45312…2828),
// loaded from a CORS-enabled mirror so this repo does not redistribute GPL weights.
const RVM_MODEL = "https://huggingface.co/eafish/web-onnx/resolve/main/rvm_mobilenetv3_fp32.onnx"
const ENGINE_NAMES = { off: "Off", "mp-fast": "MediaPipe selfie", "mp-multi": "MediaPipe multiclass", rvm: "Robust Video Matting", native: "Browser or OS effect" }
const LOOKS = { original: 0, matte: 1, blur: 2, backdrop: 3, overlay: 4 }
const MAX_TAKE_MS = 20_000
const REFINED_LONG_EDGE = 480

const $ = (sel) => document.querySelector(sel)
const params = new URLSearchParams(location.search)

// ---------- WebGL compositor ----------

const VS = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main() { vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5); gl_Position = vec4(aPos, 0.0, 1.0); }`

const FS_COMMON = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uCam; uniform vec4 uCamRect;
uniform sampler2D uMask; uniform vec4 uMaskRect;
uniform vec2 uEdge;
vec3 cam(vec2 uv) { return texture(uCam, uCamRect.xy + uv * uCamRect.zw).rgb; }
float matte(vec2 uv) { return smoothstep(uEdge.x, uEdge.y, texture(uMask, uMaskRect.xy + uv * uMaskRect.zw).r); }
`

// Blur only what is behind the person: premultiply by the background's share,
// mip it down, then divide the share back out. The person's colour never bleeds
// into the blurred wall as a halo.
const FS_PREBLUR = FS_COMMON + `
void main() { float a = 1.0 - matte(vUv); o = vec4(cam(vUv) * a, a); }`

const FS_MAIN = FS_COMMON + `
uniform sampler2D uBlur; uniform float uLod;
uniform sampler2D uBg; uniform vec4 uBgRect;
uniform int uLook; uniform vec4 uPerson;
vec3 blurred(vec2 uv) {
  vec2 t = vec2(uv.x, 1.0 - uv.y);
  vec2 px = exp2(uLod) / vec2(textureSize(uBlur, 0));
  vec4 acc = vec4(0.0);
  for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) acc += textureLod(uBlur, t + vec2(i, j) * px * 0.9, uLod);
  if (acc.a < 0.05) acc = textureLod(uBlur, t, uLod + 2.5);
  return acc.rgb / max(acc.a, 1e-4);
}
vec3 bg(vec2 uv) { return texture(uBg, uBgRect.xy + uv * uBgRect.zw).rgb; }
void main() {
  if (uLook == 0) { o = vec4(cam(vUv), 1.0); return; }
  if (uLook == 1) { o = vec4(vec3(matte(vUv)), 1.0); return; }
  if (uLook == 4) {
    vec3 col = bg(vUv);
    vec2 p = (vUv - uPerson.xy) / uPerson.zw;
    if (p.x >= 0.0 && p.x <= 1.0 && p.y >= 0.0 && p.y <= 1.0) col = mix(col, cam(p), matte(p));
    o = vec4(col, 1.0); return;
  }
  vec3 back = uLook == 2 ? blurred(vUv) : bg(vUv);
  o = vec4(mix(back, cam(vUv), matte(vUv)), 1.0);
}`

class Compositor {
  constructor(canvas) {
    this.canvas = canvas
    const gl = canvas.getContext("webgl2", { premultipliedAlpha: false, antialias: false })
    if (!gl) throw new Error("WebGL2 is not available in this browser")
    this.gl = gl
    this.main = this.program(FS_MAIN)
    this.preblur = this.program(FS_PREBLUR)
    this.buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    this.cam = this.texture()
    this.mask = this.texture()
    this.bg = this.texture()
    this.blur = this.texture(true)
    this.fbo = gl.createFramebuffer()
    this.uploadMask(1, 1, new Uint8Array([255]))
    this.blurSize = [0, 0]
  }

  program(fs) {
    const gl = this.gl
    const compile = (type, src) => {
      const s = gl.createShader(type)
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s))
      return s
    }
    const p = gl.createProgram()
    gl.attachShader(p, compile(gl.VERTEX_SHADER, VS))
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs))
    gl.bindAttribLocation(p, 0, "aPos")
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p))
    const u = {}
    for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i++) {
      const name = gl.getActiveUniform(p, i).name
      u[name] = gl.getUniformLocation(p, name)
    }
    return { p, u }
  }

  texture(mipmapped = false) {
    const gl = this.gl
    const t = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipmapped ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]))
    return t
  }

  resize(w, h) {
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h }
    const bw = Math.max(16, Math.round(w / 4)), bh = Math.max(16, Math.round(h / 4))
    if (this.blurSize[0] === bw && this.blurSize[1] === bh) return
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, this.blur)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, bw, bh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.blur, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    this.blurSize = [bw, bh]
  }

  uploadImage(tex, source) {
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
  }

  uploadCam(source) { this.uploadImage(this.cam, source) }
  uploadBg(source) { this.uploadImage(this.bg, source) }

  uploadMask(w, h, u8) {
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, this.mask)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, w, h, 0, gl.RED, gl.UNSIGNED_BYTE, u8)
  }

  bindCommon(prog, s) {
    const gl = this.gl
    const maskTex = s.maskFromCam ? this.cam : this.mask
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.cam)
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, maskTex)
    gl.uniform1i(prog.u.uCam, 0)
    gl.uniform1i(prog.u.uMask, 1)
    gl.uniform4fv(prog.u.uCamRect, s.camRect)
    gl.uniform4fv(prog.u.uMaskRect, s.maskRect)
    gl.uniform2fv(prog.u.uEdge, s.edge)
  }

  render(s) {
    const gl = this.gl
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    if (s.look === LOOKS.blur) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo)
      gl.viewport(0, 0, this.blurSize[0], this.blurSize[1])
      gl.useProgram(this.preblur.p)
      this.bindCommon(this.preblur, s)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      gl.bindTexture(gl.TEXTURE_2D, this.blur)
      gl.generateMipmap(gl.TEXTURE_2D)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    const m = this.main
    gl.useProgram(m.p)
    this.bindCommon(m, s)
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.blur)
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, this.bg)
    gl.uniform1i(m.u.uBlur, 2)
    gl.uniform1i(m.u.uBg, 3)
    gl.uniform1f(m.u.uLod, 2.0)
    gl.uniform4fv(m.u.uBgRect, s.bgRect)
    gl.uniform1i(m.u.uLook, s.look)
    gl.uniform4fv(m.u.uPerson, s.person)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
}

function coverRect(srcW, srcH, outW, outH) {
  const sa = srcW / srcH, oa = outW / outH
  if (sa > oa) { const f = oa / sa; return [(1 - f) / 2, 0, f, 1] }
  const f = sa / oa
  return [0, (1 - f) / 2, 1, f]
}

function personRect(camAspect, outW, outH) {
  const oa = outW / outH
  const h = oa >= 1 ? 0.8 : 0.5
  const w = h * camAspect / oa
  return [1 - w * 0.86, 1 - h, w, h]
}

function edgeRange(crisp) {
  const half = 0.5 * (1 - crisp) * 0.98 + 0.01
  return [0.5 - half, 0.5 + half]
}

// ---------- backgrounds ----------

function brandBackdrop() {
  const c = document.createElement("canvas")
  c.width = 1600; c.height = 900
  const g = c.getContext("2d")
  const lin = g.createLinearGradient(0, 0, 1600, 900)
  lin.addColorStop(0, "#0d1b3d"); lin.addColorStop(1, "#06281f")
  g.fillStyle = lin; g.fillRect(0, 0, 1600, 900)
  for (const [x, y, r, col] of [[300, 220, 520, "rgba(91,140,255,.35)"], [1350, 760, 620, "rgba(62,207,142,.25)"], [1150, 140, 360, "rgba(255,255,255,.06)"]]) {
    const rad = g.createRadialGradient(x, y, 0, x, y, r)
    rad.addColorStop(0, col); rad.addColorStop(1, "rgba(0,0,0,0)")
    g.fillStyle = rad; g.fillRect(0, 0, 1600, 900)
  }
  g.fillStyle = "rgba(255,255,255,.85)"
  g.font = "600 46px -apple-system, Inter, sans-serif"
  g.fillText("acme", 92, 132)
  g.fillStyle = "rgba(255,255,255,.4)"
  g.font = "28px -apple-system, Inter, sans-serif"
  g.fillText("Q4 pricing walkthrough", 92, 180)
  return c
}

function sampleSlide() {
  const c = document.createElement("canvas")
  c.width = 1600; c.height = 900
  const g = c.getContext("2d")
  g.fillStyle = "#f6f7fb"; g.fillRect(0, 0, 1600, 900)
  g.fillStyle = "#11182a"; g.font = "700 58px -apple-system, Inter, sans-serif"
  g.fillText("Rollout plan for your team", 90, 140)
  g.fillStyle = "#5b6475"; g.font = "30px -apple-system, Inter, sans-serif"
  ;["Week 1 · connect your CRM", "Week 2 · first 20 reps recording", "Week 4 · reply rate review"].forEach((t, i) => g.fillText(t, 90, 250 + i * 64))
  const bars = [180, 260, 340, 470]
  bars.forEach((h, i) => { g.fillStyle = i === 3 ? "#5b8cff" : "#c9d3e8"; g.fillRect(110 + i * 120, 820 - h, 80, h) })
  g.fillStyle = "#5b6475"; g.font = "24px -apple-system, Inter, sans-serif"
  g.fillText("Replies per 100 sends", 110, 860)
  return c
}

// ---------- engines ----------

let mpFileset = null

async function createMediaPipe(id) {
  mpFileset ??= await FilesetResolver.forVisionTasks(MP_WASM)
  let seg = null, backend = "GPU (WebGL)"
  const opts = (delegate) => ({ baseOptions: { modelAssetPath: MP_MODELS[id], delegate }, runningMode: "VIDEO", outputConfidenceMasks: true, outputCategoryMask: false })
  try { seg = await ImageSegmenter.createFromOptions(mpFileset, opts("GPU")) }
  catch (e) { console.warn("MediaPipe GPU delegate failed, using CPU", e); backend = "CPU (WASM)"; seg = await ImageSegmenter.createFromOptions(mpFileset, opts("CPU")) }
  const labels = seg.getLabels()
  const bgIndex = Math.max(0, labels.findIndex((l) => /background/i.test(l)))
  const input = document.createElement("canvas")
  const ctx = input.getContext("2d")
  let lastTs = 0
  return {
    id, backend, labels,
    run(source, sw, sh) {
      const scale = 512 / Math.max(sw, sh)
      const w = Math.round(sw * scale), h = Math.round(sh * scale)
      if (input.width !== w || input.height !== h) { input.width = w; input.height = h }
      ctx.drawImage(source, 0, 0, w, h)
      lastTs = Math.max(lastTs + 1, performance.now())
      let out = null
      seg.segmentForVideo(input, lastTs, (result) => {
        const masks = result.confidenceMasks
        const m = masks[masks.length === 1 ? 0 : bgIndex]
        const f = m.getAsFloat32Array()
        const alpha = new Float32Array(f.length)
        if (masks.length === 1) alpha.set(f)
        else for (let i = 0; i < f.length; i++) alpha[i] = 1 - f[i]
        out = { w: m.width, h: m.height, alpha }
      })
      return out
    },
    reset() {},
  }
}

let ortModule = null

async function createRvm({ longEdge, ratio }) {
  ortModule ??= await import(ORT_URL)
  const ort = ortModule
  ort.env.wasm.wasmPaths = ORT_DIST
  ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 2) : 1
  ort.env.wasm.proxy = params.get("proxy") !== "0"
  // onnxruntime-web's WebGPU backend runs this model about 4x faster but returns
  // a wrong matte (1.31.1 and 1.32 dev, measured 2026-10-30: 26-68% of pixels
  // off by more than 0.25 against WASM). ?ep=webgpu opts in to check again.
  const wanted = [params.get("ep") ?? "wasm"]
  let session = null, backend = ""
  for (const ep of wanted) {
    try {
      session = await ort.InferenceSession.create(RVM_MODEL, { executionProviders: [ep], graphOptimizationLevel: "all" })
      backend = ep === "webgpu" ? "WebGPU" : "CPU (WASM)"
      break
    } catch (e) { console.warn("RVM", ep, "failed", e) }
  }
  if (!session) throw new Error("Could not start Robust Video Matting on WebGPU or WASM")
  const zero = () => new ort.Tensor("float32", new Float32Array([0]), [1, 1, 1, 1])
  let rec = [zero(), zero(), zero(), zero()]
  const input = document.createElement("canvas")
  const ctx = input.getContext("2d", { willReadFrequently: true })
  return {
    id: "rvm", backend,
    async run(source, sw, sh, crop) {
      const scale = longEdge / Math.max(sw, sh)
      const w = Math.round(sw * scale), h = Math.round(sh * scale)
      if (input.width !== w || input.height !== h) { input.width = w; input.height = h }
      // The proxy worker takes ownership of the buffer, so each frame gets its own.
      const src = new Float32Array(3 * w * h)
      if (crop) ctx.drawImage(source, crop[0], crop[1], crop[2], crop[3], 0, 0, w, h)
      else ctx.drawImage(source, 0, 0, w, h)
      const px = ctx.getImageData(0, 0, w, h).data
      const n = w * h
      for (let i = 0; i < n; i++) { src[i] = px[i * 4] / 255; src[i + n] = px[i * 4 + 1] / 255; src[i + 2 * n] = px[i * 4 + 2] / 255 }
      const out = await session.run({ src: new ort.Tensor("float32", src, [1, 3, h, w]), r1i: rec[0], r2i: rec[1], r3i: rec[2], r4i: rec[3], downsample_ratio: new ort.Tensor("float32", new Float32Array([ratio]), [1]) })
      rec = [out.r1o, out.r2o, out.r3o, out.r4o]
      return { w, h, alpha: out.pha.data }
    },
    reset() { rec = [zero(), zero(), zero(), zero()] },
  }
}

// ---------- live ----------

const live = {
  engine: params.get("engine") ?? "mp-fast",
  look: params.get("look") ?? "blur",
  recordMode: params.get("record") ?? "matte",
  edge: 0.35,
  steady: true,
  stream: null, track: null,
  video: document.createElement("video"),
  screenVideo: null,
  comp: null,
  engines: {}, loading: {},
  busy: false,
  mask: { w: 0, h: 0, f32: null, u8: null },
  stats: { model: [], modelTimes: [], frames: [] },
  bgSource: brandBackdrop(),
  slide: sampleSlide(),
  recorder: null, recStart: 0, chunks: [],
  pack: null,
}
live.video.muted = true
live.video.playsInline = true

function setPressed(seg, value) {
  for (const b of seg.querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.value === value))
}

function bindSeg(seg, get, set) {
  setPressed(seg, get())
  seg.addEventListener("click", (e) => {
    const b = e.target.closest("button")
    if (!b || b.disabled) return
    set(b.dataset.value)
    setPressed(seg, get())
  })
}

function status(el, text, kind = "") {
  el.textContent = text
  el.className = "status" + (kind ? " " + kind : "")
}

async function ensureEngine(id) {
  if (id === "off" || id === "native" || live.engines[id]) return
  if (live.loading[id]) return live.loading[id]
  status($("#liveStatus"), `Loading ${ENGINE_NAMES[id]}…`)
  live.loading[id] = (id === "rvm" ? createRvm({ longEdge: 512, ratio: 0.5 }) : createMediaPipe(id))
    .then((eng) => {
      live.engines[id] = eng
      if (live.engine === id) status($("#liveStatus"), `${ENGINE_NAMES[id]} is running on ${eng.backend}.`)
    })
    .catch((e) => { console.error(e); status($("#liveStatus"), `${ENGINE_NAMES[id]} failed to start: ${e.message ?? e}`, "bad") })
    .finally(() => { delete live.loading[id] })
  return live.loading[id]
}

function selectEngine(id) {
  live.engine = id
  live.mask = { w: 0, h: 0, f32: null, u8: null }
  live.stats.model = []; live.stats.modelTimes = []
  live.comp?.uploadMask(1, 1, new Uint8Array([255]))
  live.engines[id]?.reset()
  if (id === "native") describeNative()
  else if (id === "off") status($("#liveStatus"), "Raw camera. Pick an engine to separate the person.")
  else if (live.engines[id]) status($("#liveStatus"), `${ENGINE_NAMES[id]} is running on ${live.engines[id].backend}.`)
  if (live.stream) ensureEngine(id)
}

function describeNative() {
  const el = $("#liveStatus")
  el.replaceChildren()
  el.className = "status"
  const track = live.track
  if (!track) { el.textContent = "Start the camera first."; return }
  const caps = track.getCapabilities?.() ?? {}
  const settings = track.getSettings?.() ?? {}
  const keys = Object.keys(caps).filter((k) => /blur|segment|background|face|eye|light|portrait|framing/i.test(k))
  const p = document.createElement("span")
  if (!keys.length) {
    p.textContent = "This browser exposes no camera effects to the page. On a Mac, Control Center > Video Effects (Portrait, Background) still applies to this camera, and the page cannot see or change it."
    el.append(p)
    return
  }
  p.textContent = `The camera reports: ${keys.map((k) => `${k} ${JSON.stringify(caps[k])} (now ${JSON.stringify(settings[k])})`).join(", ")}. `
  el.append(p)
  if (Array.isArray(caps.backgroundBlur) && caps.backgroundBlur.includes(true) && caps.backgroundBlur.includes(false)) {
    const b = document.createElement("button")
    b.className = "btn"
    b.textContent = settings.backgroundBlur ? "Turn the platform blur off" : "Turn the platform blur on"
    b.onclick = async () => {
      try { await track.applyConstraints({ advanced: [{ backgroundBlur: !track.getSettings().backgroundBlur }] }) }
      catch (e) { status(el, `applyConstraints failed: ${e.message}`, "bad"); return }
      describeNative()
    }
    el.append(b)
  } else if ("backgroundBlur" in caps) {
    const s = document.createElement("span")
    s.textContent = "The page can read the platform blur but not switch it. The rep switches it in the OS."
    el.append(s)
  }
}

function applyMask(res) {
  const m = live.mask
  const n = res.w * res.h
  if (m.w !== res.w || m.h !== res.h) {
    live.mask = { w: res.w, h: res.h, f32: Float32Array.from(res.alpha), u8: new Uint8Array(n) }
  } else if (live.steady) {
    for (let i = 0; i < n; i++) m.f32[i] = m.f32[i] * 0.5 + res.alpha[i] * 0.5
  } else {
    m.f32.set(res.alpha)
  }
  const { f32, u8 } = live.mask
  for (let i = 0; i < n; i++) u8[i] = f32[i] * 255
  live.comp.uploadMask(res.w, res.h, u8)
}

function maskless() { return live.engine === "off" || live.engine === "native" }

function outputSize(vw, vh) {
  const s = 1280 / Math.max(vw, vh)
  return [Math.round(vw * s), Math.round(vh * s)]
}

function liveFrame(now) {
  requestAnimationFrame(liveFrame)
  const v = live.video
  if (v.readyState < 2 || !v.videoWidth) return
  const [ow, oh] = outputSize(v.videoWidth, v.videoHeight)
  live.comp.resize(ow, oh)
  live.comp.uploadCam(v)

  const eng = live.engines[live.engine]
  if (eng && !live.busy && !maskless()) {
    live.busy = true
    const t0 = performance.now()
    const engineAtStart = live.engine
    Promise.resolve(eng.run(v, v.videoWidth, v.videoHeight))
      .then((res) => {
        if (!res || live.engine !== engineAtStart) return
        const t1 = performance.now()
        live.stats.model.push(t1 - t0); if (live.stats.model.length > 30) live.stats.model.shift()
        live.stats.modelTimes.push(t1); if (live.stats.modelTimes.length > 30) live.stats.modelTimes.shift()
        applyMask(res)
      })
      .catch((e) => { console.error(e); status($("#liveStatus"), `Engine error: ${e.message ?? e}`, "bad") })
      .finally(() => { live.busy = false })
  }

  const screen = live.screenVideo && live.screenVideo.readyState >= 2 ? live.screenVideo : null
  const look = maskless() ? "original" : live.look
  let bgW = 1, bgH = 1
  if (look === "overlay") {
    const src = screen ?? live.slide
    live.comp.uploadBg(src)
    bgW = screen ? screen.videoWidth : src.width; bgH = screen ? screen.videoHeight : src.height
  } else if (look === "backdrop") {
    live.comp.uploadBg(live.bgSource)
    bgW = live.bgSource.naturalWidth || live.bgSource.width; bgH = live.bgSource.naturalHeight || live.bgSource.height
  }
  live.comp.render({
    look: LOOKS[look],
    edge: edgeRange(live.edge),
    camRect: [0, 0, 1, 1], maskRect: [0, 0, 1, 1], maskFromCam: false,
    bgRect: coverRect(bgW, bgH, ow, oh),
    person: personRect(v.videoWidth / v.videoHeight, ow, oh),
  })

  if (live.recorder && live.recordMode === "matte") drawPack(v)
  if (live.recorder) {
    const ms = performance.now() - live.recStart
    $("#recDot").textContent = `REC ${(ms / 1000).toFixed(1)} s`
    if (ms >= MAX_TAKE_MS) stopRecording()
  }

  live.stats.frames.push(now); while (live.stats.frames.length && now - live.stats.frames[0] > 1000) live.stats.frames.shift()
  const ms = live.stats.model
  const avg = ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : 0
  const times = live.stats.modelTimes
  const rate = times.length > 1 ? (times.length - 1) / ((times[times.length - 1] - times[0]) / 1000) : 0
  const lines = [
    `engine ${ENGINE_NAMES[live.engine]}${eng ? " · " + eng.backend : ""}`,
    maskless() ? "model  none" : `model  ${avg.toFixed(1)} ms · ${rate.toFixed(0)} masks/s`,
    `view   ${live.stats.frames.length} fps · ${ow}×${oh}`,
    maskless() ? "" : `mask   ${live.mask.w}×${live.mask.h}`,
  ].filter(Boolean)
  $("#liveHud").textContent = lines.join("\n")
}

// Camera on the left, matte on the right. One ordinary H.264 or VP9 frame, so
// any encoder, Mux and every player carry it unchanged.
function drawPack(v) {
  const p = live.pack
  const { ctx, cw, ch } = p
  ctx.drawImage(v, 0, 0, cw, ch)
  const m = live.mask
  if (maskless() || !m.u8) { ctx.fillStyle = "#fff"; ctx.fillRect(cw, 0, cw, ch); return }
  if (p.maskCanvas.width !== m.w || p.maskCanvas.height !== m.h) {
    p.maskCanvas.width = m.w; p.maskCanvas.height = m.h
    p.maskImage = p.maskCtx.createImageData(m.w, m.h)
  }
  const d = p.maskImage.data
  for (let i = 0, j = 0; i < m.u8.length; i++, j += 4) { const a = m.u8[i]; d[j] = a; d[j + 1] = a; d[j + 2] = a; d[j + 3] = 255 }
  p.maskCtx.putImageData(p.maskImage, 0, 0)
  ctx.drawImage(p.maskCanvas, cw, 0, cw, ch)
}

function pickMime() {
  for (const t of ["video/mp4;codecs=avc1.640028", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"]) {
    if (window.MediaRecorder?.isTypeSupported(t)) return t
  }
  return ""
}

function startRecording() {
  const v = live.video
  const mode = live.recordMode
  let source = live.comp.canvas
  if (mode === "matte") {
    const s = 960 / Math.max(v.videoWidth, v.videoHeight)
    const cw = Math.round(v.videoWidth * s / 2) * 2, ch = Math.round(v.videoHeight * s / 2) * 2
    const canvas = document.createElement("canvas")
    canvas.width = cw * 2; canvas.height = ch
    const maskCanvas = document.createElement("canvas")
    live.pack = { canvas, ctx: canvas.getContext("2d"), cw, ch, maskCanvas, maskCtx: maskCanvas.getContext("2d"), maskImage: null }
    drawPack(v)
    source = canvas
  }
  const mime = pickMime()
  const stream = source.captureStream(30)
  const bitrate = mode === "matte" ? 2_500_000 : 2_000_000
  const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: bitrate })
  live.chunks = []
  rec.ondataavailable = (e) => { if (e.data.size) live.chunks.push(e.data) }
  rec.onstop = () => {
    const durationSec = (performance.now() - live.recStart) / 1000
    const blob = new Blob(live.chunks, { type: rec.mimeType || mime || "video/webm" })
    showTake({
      mode, blob, url: URL.createObjectURL(blob), mime: blob.type, durationSec, size: blob.size, bitrate,
      cw: live.pack?.cw, ch: live.pack?.ch, engine: live.engine, look: live.look,
    })
    stream.getTracks().forEach((t) => t.stop())
    live.pack = null
  }
  live.recorder = rec
  live.recStart = performance.now()
  rec.start(1000)
  $("#recDot").classList.add("on")
  const btn = $("#recordBtn")
  btn.textContent = "Stop"; btn.className = "btn danger"
  for (const b of $("#recordSeg").querySelectorAll("button")) b.disabled = true
}

function stopRecording() {
  const rec = live.recorder
  if (!rec) return
  live.recorder = null
  rec.stop()
  $("#recDot").classList.remove("on")
  const btn = $("#recordBtn")
  btn.textContent = "Record"; btn.className = "btn primary"
  for (const b of $("#recordSeg").querySelectorAll("button")) b.disabled = false
}

async function startCamera() {
  try {
    live.comp = new Compositor($("#liveCanvas"))
  } catch (e) { status($("#liveStatus"), e.message, "bad"); return }
  try {
    live.stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 }, facingMode: "user" }, audio: false })
  } catch (e) { status($("#liveStatus"), `Camera blocked: ${e.message}`, "bad"); return }
  live.track = live.stream.getVideoTracks()[0]
  live.video.srcObject = live.stream
  await live.video.play()
  $("#liveEmpty").hidden = true
  $("#liveHud").hidden = false
  $("#recordBtn").disabled = false
  requestAnimationFrame(liveFrame)
  selectEngine(live.engine)
}

$("#startCam").onclick = startCamera
bindSeg($("#engineSeg"), () => live.engine, selectEngine)
bindSeg($("#lookSeg"), () => live.look, (v) => { live.look = v })
bindSeg($("#recordSeg"), () => live.recordMode, (v) => { live.recordMode = v })
$("#edge").oninput = (e) => { live.edge = Number(e.target.value) }
$("#steady").onchange = (e) => { live.steady = e.target.checked }
$("#recordBtn").onclick = () => (live.recorder ? stopRecording() : startRecording())
$("#shareScreen").onclick = async () => {
  try {
    const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
    const v = document.createElement("video")
    v.muted = true; v.playsInline = true; v.srcObject = s
    await v.play()
    live.screenVideo = v
    s.getVideoTracks()[0].onended = () => { live.screenVideo = null }
    live.look = "overlay"; setPressed($("#lookSeg"), "overlay")
  } catch (e) { status($("#liveStatus"), `Screen share unavailable: ${e.message}`, "warn") }
}
$("#bgFile").onchange = (e) => {
  const f = e.target.files?.[0]
  if (!f) return
  const img = new Image()
  img.onload = () => {
    live.bgSource = img
    after.bgSource = img
    live.look = "backdrop"; setPressed($("#lookSeg"), "backdrop")
  }
  img.src = URL.createObjectURL(f)
}

// ---------- after recording ----------

const after = {
  take: null, comp: null, look: "backdrop", matteSrc: "live",
  refined: null, refining: false, lastRefined: null,
  bgSource: live.bgSource, slide: live.slide,
}
const afterVideo = $("#afterVideo")

function showTake(take) {
  if (after.take) URL.revokeObjectURL(after.take.url)
  after.take = take
  after.refined = null
  after.matteSrc = "live"
  setPressed($("#matteSrcSeg"), "live")
  $("#matteSrcSeg").querySelector('[data-value="refined"]').disabled = true
  $("#refineBar").style.width = "0"
  $("#refineNote").textContent = ""
  after.comp ??= new Compositor($("#afterCanvas"))
  afterVideo.src = take.url
  afterVideo.loop = true
  afterVideo.play().catch(() => {})
  $("#afterEmpty").hidden = true
  $("#afterHud").hidden = false
  const matte = take.mode === "matte"
  $("#refineBtn").disabled = !matte
  for (const b of $("#afterLookSeg").querySelectorAll("button")) b.disabled = !matte
  $("#afterIntro").textContent = matte
    ? "This take kept its matte. Change the look while it plays. Nothing is re-recorded."
    : "This take baked its look in. To change the background you would record again."
  const mbps = (take.size * 8 / take.durationSec / 1e6).toFixed(2)
  $("#takeKv").innerHTML = ""
  const rows = [
    ["Stored as", matte ? "Camera + matte, side by side" : "Final look, baked in"],
    ["Engine", ENGINE_NAMES[take.engine]],
    ["Length", `${take.durationSec.toFixed(1)} s`],
    ["File", `${(take.size / 1e6).toFixed(2)} MB · ${mbps} Mbps (asked ${(take.bitrate / 1e6).toFixed(1)})`],
    ["Format", take.mime || "unknown"],
  ]
  for (const [k, v] of rows) { const dt = document.createElement("dt"); dt.textContent = k; const dd = document.createElement("dd"); dd.textContent = v; $("#takeKv").append(dt, dd) }
  const dl = $("#downloadTake")
  dl.hidden = false
  dl.href = take.url
  dl.download = `take-${take.mode}.${take.mime.includes("mp4") ? "mp4" : "webm"}`
  status($("#afterStatus"), "")
  scheduleAfterFrame()
}

function nearestRefined(t) {
  const r = after.refined
  if (!r?.length) return null
  let lo = 0, hi = r.length - 1
  while (lo < hi) { const mid = (lo + hi) >> 1; if (r[mid].t < t) lo = mid + 1; else hi = mid }
  if (lo > 0 && Math.abs(r[lo - 1].t - t) < Math.abs(r[lo].t - t)) lo -= 1
  return r[lo]
}

let afterScheduled = false
function scheduleAfterFrame() {
  if (afterScheduled) return
  afterScheduled = true
  if ("requestVideoFrameCallback" in HTMLVideoElement.prototype) afterVideo.requestVideoFrameCallback(afterFrame)
  else requestAnimationFrame(() => afterFrame(performance.now(), { mediaTime: afterVideo.currentTime }))
}

function afterFrame(now, meta) {
  afterScheduled = false
  scheduleAfterFrame()
  renderAfter(meta.mediaTime)
}

function renderAfter(mediaTime) {
  const take = after.take
  const v = afterVideo
  if (!take || v.readyState < 2 || !v.videoWidth) return
  const comp = after.comp
  const matte = take.mode === "matte"
  const camW = matte ? v.videoWidth / 2 : v.videoWidth, camH = v.videoHeight
  const [ow, oh] = outputSize(camW, camH)
  comp.resize(ow, oh)
  comp.uploadCam(v)
  let maskFromCam = matte, maskRect = [0.5, 0, 0.5, 1]
  let look = matte ? after.look : "original"
  let source = "from recording"
  const refinedFrame = after.refining ? after.lastRefined : (after.matteSrc === "refined" ? nearestRefined(mediaTime) : null)
  if (refinedFrame) {
    comp.uploadMask(refinedFrame.w, refinedFrame.h, refinedFrame.data)
    maskFromCam = false; maskRect = [0, 0, 1, 1]; source = "refined"
  }
  if (after.refining) look = "matte"
  let bgW = 1, bgH = 1
  if (look === "overlay") { comp.uploadBg(after.slide); bgW = after.slide.width; bgH = after.slide.height }
  if (look === "backdrop") { comp.uploadBg(after.bgSource); bgW = after.bgSource.naturalWidth || after.bgSource.width; bgH = after.bgSource.naturalHeight || after.bgSource.height }
  comp.render({
    look: LOOKS[look],
    edge: edgeRange(live.edge),
    camRect: matte ? [0, 0, 0.5, 1] : [0, 0, 1, 1],
    maskRect, maskFromCam,
    bgRect: coverRect(bgW, bgH, ow, oh),
    person: personRect(camW / camH, ow, oh),
  })
  $("#afterHud").textContent = [
    `t      ${mediaTime.toFixed(2)} s`,
    matte ? `matte  ${source}` : "matte  none (baked)",
    `look   ${look}`,
  ].join("\n")
}

async function refineTake() {
  const take = after.take
  if (!take || take.mode !== "matte" || after.refining) return
  const btn = $("#refineBtn")
  btn.disabled = true
  status($("#afterStatus"), "Loading the matting model for the refine pass…")
  let eng
  try { eng = await createRvm({ longEdge: Math.max(take.cw, take.ch), ratio: 0.5 }) }
  catch (e) { status($("#afterStatus"), `Refine failed to start: ${e.message ?? e}`, "bad"); btn.disabled = false; return }
  const v = afterVideo
  after.refining = true
  after.refined = []
  v.pause()
  v.loop = false
  v.currentTime = 0
  await new Promise((r) => v.addEventListener("seeked", r, { once: true }))
  const started = performance.now()
  let modelMs = 0
  status($("#afterStatus"), `Refining every frame with Robust Video Matting on ${eng.backend}, at ${take.cw}×${take.ch}…`)
  await new Promise((resolve) => {
    let done = false
    const finish = () => { if (!done) { done = true; resolve() } }
    v.addEventListener("ended", finish, { once: true })
    const onFrame = async (_now, meta) => {
      if (done) return
      v.pause()
      const t0 = performance.now()
      const res = await eng.run(v, v.videoWidth / 2, v.videoHeight, [0, 0, v.videoWidth / 2, v.videoHeight])
      modelMs += performance.now() - t0
      const stored = downsample(res, REFINED_LONG_EDGE)
      after.refined.push({ t: meta.mediaTime, ...stored })
      after.lastRefined = after.refined[after.refined.length - 1]
      renderAfter(meta.mediaTime)
      const frac = Math.min(1, meta.mediaTime / take.durationSec)
      $("#refineBar").style.width = `${(frac * 100).toFixed(1)}%`
      $("#refineNote").textContent = `${after.refined.length} frames`
      if (v.ended) return finish()
      v.requestVideoFrameCallback(onFrame)
      v.play().catch(finish)
    }
    v.requestVideoFrameCallback(onFrame)
    v.play().catch(finish)
  })
  const wall = (performance.now() - started) / 1000
  after.refining = false
  after.lastRefined = null
  const frames = after.refined.length
  after.result = { frames, wall, perFrame: modelMs / frames, backend: eng.backend }
  $("#refineBar").style.width = "100%"
  $("#refineNote").textContent = `${frames} frames in ${wall.toFixed(1)} s · ${(modelMs / frames).toFixed(0)} ms each`
  status($("#afterStatus"), `Refined ${frames} frames in ${wall.toFixed(1)} s on ${eng.backend}. That is ${(wall / take.durationSec).toFixed(1)}× the take's length.`)
  $("#matteSrcSeg").querySelector('[data-value="refined"]').disabled = false
  after.matteSrc = "refined"
  setPressed($("#matteSrcSeg"), "refined")
  v.loop = true
  v.currentTime = 0
  v.play().catch(() => {})
  btn.disabled = false
}

function downsample(res, longEdge) {
  const f = Math.max(1, Math.round(Math.max(res.w, res.h) / longEdge))
  const w = Math.floor(res.w / f), h = Math.floor(res.h / f)
  const data = new Uint8Array(w * h)
  const a = res.alpha
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0
    for (let dy = 0; dy < f; dy++) for (let dx = 0; dx < f; dx++) s += a[(y * f + dy) * res.w + x * f + dx]
    data[y * w + x] = (s / (f * f)) * 255
  }
  return { w, h, data }
}

bindSeg($("#afterLookSeg"), () => after.look, (v) => { after.look = v; if (afterVideo.paused) renderAfter(afterVideo.currentTime) })
bindSeg($("#matteSrcSeg"), () => after.matteSrc, (v) => { after.matteSrc = v })
$("#refineBtn").onclick = refineTake
$("#showPacked").onchange = (e) => { $("#packedWrap").classList.toggle("on", e.target.checked) }

// ---------- options table ----------

import("./options.js").then(({ renderOptions }) => renderOptions($("#optionsTable"))).catch(() => {})

window.__proto = { live, after, startRecording, stopRecording, refineTake, selectEngine, ensureEngine, renderAfter }
