import { clampPreview, defaultPreview, previewsEqual } from "./preview.js"

const COMMIT_MS = 1100

/**
 * What the modal has saved and what it is still holding. The committed trim is
 * what the Mux clip serves today; the draft is the handles. A commit is one
 * clip render, so it happens on an explicit action (Done, or the grace timer
 * in the save-as-you-go variant), never on every drag. The preview is cheap
 * metadata and rides in the same save.
 */
export function createSession({ store, duration, autoTrim }) {
  const subs = new Set()
  const state = {
    committed: { trim: { ...autoTrim }, preview: defaultPreview(autoTrim) },
    preview: defaultPreview(autoTrim),
    save: "idle", // idle | saving | saved | error
    savedAt: 0,
    history: [],
  }
  const emit = () => {
    for (const cb of subs) cb(state)
  }
  const trimDraft = () => ({ start: store.state.start, end: store.state.end })
  const same = (a, b) => Math.abs(a.start - b.start) < 0.0005 && Math.abs(a.end - b.end) < 0.0005
  const bounds = () => trimDraft()

  const api = {
    state,
    subscribe(cb) {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    trimDraft,
    bounds,
    trimDirty: () => !same(trimDraft(), state.committed.trim),
    previewDirty: () => !previewsEqual(state.preview, state.committed.preview),
    dirty: () => api.trimDirty() || api.previewDirty(),
    isFull: () => store.state.start < 0.0005 && store.state.end > duration - 0.0005,
    autoTrimApplied: () => same(state.committed.trim, autoTrim),
    /** Seconds the committed trim removed: the head cut plus the tail cut. */
    silenceRemoved: () => state.committed.trim.start + (duration - state.committed.trim.end),
    draftSilence: () => store.state.start + (duration - store.state.end),
    setPreview(p) {
      state.preview = clampPreview(p, bounds())
      emit()
    },
    /** Keeps the preview inside the trim as the handles move. */
    keepPreviewInBounds() {
      const next = clampPreview(state.preview, bounds())
      if (!previewsEqual(next, state.preview)) {
        state.preview = next
        emit()
      }
    },
    /** Saves the draft trim and preview as one write. Resolves when the save lands. */
    async commit({ ms = COMMIT_MS } = {}) {
      if (state.save === "saving") return
      const draft = trimDraft()
      const previous = { trim: { ...state.committed.trim }, preview: { ...state.committed.preview } }
      state.save = "saving"
      emit()
      await new Promise((r) => setTimeout(r, ms))
      state.history.push(previous)
      state.committed = { trim: draft, preview: clampPreview(state.preview, draft) }
      state.preview = state.committed.preview
      state.save = "saved"
      state.savedAt = performance.now()
      emit()
    },
    /** Drops the draft: handles and preview back to the committed values. */
    discard() {
      store.setRange(state.committed.trim.start, state.committed.trim.end, { preview: false })
      state.preview = { ...state.committed.preview }
      emit()
    },
    /** The previous committed state, as a draft, for Undo. */
    undoToPrevious() {
      const prev = state.history.pop()
      if (!prev) return false
      store.setRange(prev.trim.start, prev.trim.end, { preview: false })
      state.preview = { ...prev.preview }
      emit()
      return true
    },
    canUndo: () => state.history.length > 0,
    /** The auto-trim's Undo: the whole video, as a draft. */
    restoreFull() {
      store.setRange(0, duration, { preview: false })
      emit()
    },
    reapplyAuto() {
      store.setRange(autoTrim.start, autoTrim.end, { preview: false })
      emit()
    },
  }
  store.subscribe((s, prev, meta) => {
    if (meta.reason === "handle" || meta.reason === "range") {
      api.keepPreviewInBounds()
      emit()
    }
  })
  return api
}
