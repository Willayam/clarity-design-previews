const SEPARATE = [
  { when: "Live, in the tab", what: "MediaPipe selfie segmenter", detail: "Google's small portrait model on the GPU. A confidence mask, not a true alpha. Fast hands get lost.", licence: "Apache 2.0", cost: "Free, on the rep's device", here: true },
  { when: "Live, in the tab", what: "MediaPipe multiclass", detail: "Splits hair, skin and clothes. Google's tracker has an open report of scrambled classes on iPhone Safari's GPU path (mediapipe#6142).", licence: "Apache 2.0", cost: "Free, on the rep's device", here: true },
  { when: "Live, in the tab", what: "Robust Video Matting", detail: "A true alpha matte that remembers earlier frames. Best edges here, but only on the CPU today.", licence: '<span class="tag no">GPL-3.0</span>', cost: "Free, on the rep's device", here: true },
  { when: "Live, from the OS", what: "Mac Video Effects, Windows Studio Effects", detail: "Portrait blur and, on macOS 15 and later, background replacement reach the browser's camera. The page cannot switch them. Chrome's backgroundBlur setting lets a page read the blur, and switch it only where the platform allows. The Browser or OS button above tests yours.", licence: "Built in", cost: "Free", here: true },
  { when: "After the take, in the tab", what: "Refine pass before upload", detail: "Re-run a matting model on every frame with no live deadline. Measured at about 7.5× the take's length on one CPU thread.", licence: "Model's own", cost: "Free, costs the rep's wait", here: true },
  { when: "After upload, own GPU", what: "SAM 2, BiRefNet, MatAnyone 2, RVM", detail: "Heavier than any browser can run live. Cloudflare Containers have no GPU and Workers AI has no segmentation model, so this needs a separate GPU host.", licence: "SAM 2 Apache 2.0, BiRefNet MIT, MatAnyone 2 needs commercial permission, RVM GPL-3.0", cost: "GPU time plus a new host", here: false },
  { when: "After upload, own GPU", what: "CorridorKey (Corridor Digital)", detail: "A green-screen keyer. On office footage its matte beats MediaPipe's, but it turns skin orange because it rebuilds colours as if green screen were behind the person. Its matte with the camera's own colours looks right. About 8 s per 1080p frame on an M4 Mac.", licence: '<span class="tag no">CC BY-NC-SA plus terms</span><br><small>Use inside commercial software needs a written agreement</small>', cost: "GPU time, about 4 minutes per second of video on an M4 Mac", here: false },
  { when: "After upload, vendor API", what: "Bria, VEED, fal, Knockout", detail: "Send the camera track, get back alpha WebM, ProRes 4444, or a separate matte video. The footage leaves Clarity.", licence: "Commercial", cost: "About US$0.01 to 0.10 per second of video (read 30 Oct 2026)", here: false },
]

const DELIVER = [
  { what: "Bake the look into the file", detail: "What the recorder does today. Mux and every player see an ordinary video. Changing the look means a new render and a new Mux asset.", verdict: "Works today" },
  { what: "Store camera and matte side by side", detail: "One ordinary H.264 frame, which this prototype records. A server render bakes each look, or the player composites it with WebGL. Tencent's VAP player ships the same packing in production. Still owed is a check that Mux's transcode keeps the matte's edges clean.", verdict: "Prototype records it" },
  { what: "Video with a real alpha channel", detail: "Mux standardises uploads to H.264 and does not promise to keep alpha. Safari plays HEVC with alpha, Chrome plays WebM with alpha, and nothing found plays alpha in both over HLS.", verdict: "Not a path" },
]

function table(head, rows) {
  const t = document.createElement("table")
  t.innerHTML = `<thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead>`
  const body = document.createElement("tbody")
  for (const cells of rows) {
    const tr = document.createElement("tr")
    for (const c of cells) { const td = document.createElement("td"); td.innerHTML = c; tr.append(td) }
    body.append(tr)
  }
  t.append(body)
  return t
}

export function renderOptions(el) {
  const p1 = document.createElement("p")
  p1.className = "note"
  p1.innerHTML = "<b>Where the separation happens.</b>"
  const p2 = document.createElement("p")
  p2.className = "note"
  p2.style.marginTop = "16px"
  p2.innerHTML = "<b>How the separated person reaches a viewer.</b>"
  el.replaceChildren(
    p1,
    table(["When", "What", "Licence", "Cost", "Here"], SEPARATE.map((r) => [
      r.when, `<b>${r.what}</b><br><small>${r.detail}</small>`, r.licence, r.cost,
      r.here ? '<span class="tag yes">Try it above</span>' : '<span class="tag">Not built</span>',
    ])),
    p2,
    table(["Option", "", "Status"], DELIVER.map((r) => [`<b>${r.what}</b>`, `<small>${r.detail}</small>`, r.verdict])),
  )
}
