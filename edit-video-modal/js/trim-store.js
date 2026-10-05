import { clamp, round3 } from "./util.js"

export const MIN_CLIP_SECONDS = 0.2
export const END_PREVIEW_OFFSET = 0.03

/**
 * The trim range in source seconds, plus the playhead and which handle is
 * active or focused. Emits { state, prev, meta } synchronously on change.
 */
export function createTrimStore({ duration, fps }) {
  const state = {
    duration,
    fps,
    start: 0,
    end: duration,
    playhead: 0,
    active: null,
    focused: null,
    dragging: false,
  }
  const subs = new Set()

  const emit = (prev, meta = {}) => {
    for (const cb of subs) cb(state, prev, meta)
  }
  const snapshot = () => ({ ...state })

  const api = {
    state,
    subscribe(cb) {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    setDuration(d) {
      if (!(d > 0) || Math.abs(d - state.duration) < 0.001) return
      const prev = snapshot()
      const wasFull = Math.abs(state.end - state.duration) < 0.002
      state.duration = d
      if (wasFull || state.end > d) state.end = d
      state.start = clamp(state.start, 0, Math.max(0, d - MIN_CLIP_SECONDS))
      emit(prev, { reason: "duration" })
    },
    setFps(f) {
      if (!(f > 0) || f === state.fps) return
      const prev = snapshot()
      state.fps = f
      emit(prev, { reason: "fps" })
    },
    setStart(t, meta) {
      api.setHandle("start", t, meta)
    },
    setEnd(t, meta) {
      api.setHandle("end", t, meta)
    },
    setHandle(which, t, meta = {}) {
      const prev = snapshot()
      if (which === "start") {
        state.start = round3(clamp(t, 0, state.end - MIN_CLIP_SECONDS))
      } else {
        state.end = round3(clamp(t, state.start + MIN_CLIP_SECONDS, state.duration))
      }
      if (state.start === prev.start && state.end === prev.end) return
      emit(prev, { reason: "handle", which, preview: meta.preview !== false, ...meta })
    },
    setRange(start, end, meta = {}) {
      const prev = snapshot()
      const s = round3(clamp(start, 0, state.duration - MIN_CLIP_SECONDS))
      state.start = s
      state.end = round3(clamp(end, s + MIN_CLIP_SECONDS, state.duration))
      if (state.start === prev.start && state.end === prev.end) return
      emit(prev, { reason: "range", preview: meta.preview !== false, which: meta.which ?? null, ...meta })
    },
    setPlayhead(t, meta = {}) {
      const prev = snapshot()
      const next = clamp(t, 0, state.duration)
      if (next === state.playhead) return
      state.playhead = next
      emit(prev, { reason: "playhead", ...meta })
    },
    setActive(which, dragging = which !== null) {
      if (state.active === which && state.dragging === dragging) return
      const prev = snapshot()
      state.active = which
      state.dragging = dragging
      emit(prev, { reason: "active" })
    },
    setFocused(which) {
      if (state.focused === which) return
      const prev = snapshot()
      state.focused = which
      emit(prev, { reason: "focused" })
    },
    previewTime(which) {
      return which === "start"
        ? state.start
        : clamp(state.end - END_PREVIEW_OFFSET, state.start, state.duration)
    },
    clipLength() {
      return state.end - state.start
    },
  }
  return api
}
