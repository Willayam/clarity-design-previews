# Video derivations: latency contracts and module boundaries

## Problem

An accepted Original must fan out into derived artifacts (faststart playback MP4, trimmed Clip, poster, looping preview, transcript) without the consumer ever waiting, and the system must know — not guess — whether that fan-out is on time. Today five independent driver chains each own one kind: kicks that can die with no sweep behind them (poster, gif), a terminal `preparation_status` written once by the faststart path before the clip it reports on has finished, one container lock that serializes a 3-second poster behind a 648-second full re-encode of a trim, and two contradictory readings of the same capacity 503. The measured result for `ur36ry`: poster 11 minutes late, transcript 12, readiness stuck at "processing" forever, the Library re-polling every 5 seconds indefinitely. Constraints the design must honor: renders never run inside `waitUntil` (three 2026-07 incidents; kicks may, renders live in DO alarms and cron sweeps); the container has `enableInternet=false`, so every input byte proxies through the Worker; D1 tables gain columns but are never rebuilt; the Original is playable at accept and `resolvePlayback` (Clip → ready faststart → Original) stays the one playback owner; content-addressed job identity `(node, kind, input digest)` is kept and improved; ADR-0005's model (video = sources + manifest + recipe; artifacts are content-addressed pure functions; owner trim is instant metadata, viewers get the lazily rendered Clip swapped atomically) is the domain being encoded, not a constraint being worked around.

## Usage (caller's view)

One module, `workers/workspace-tree/src/derivations/`, is the only thing the four callers see. Transport, D1 rows, DO names, container routes, and producer wire shapes never cross it.

```ts
// 1. Acceptance handler (video-acceptance.ts) — after the accept batch commits.
import { videoDerivations } from './derivations';

const derivations = videoDerivations(env);
// Idempotent: plans the generation's artifact set from (sources, manifest,
// recipe), upserts the desired records with their budgets, kicks the
// supervisor DO. The kick is a notification; no render runs here.
await derivations.ensureCurrent(nodeRef, { cause: 'accept' });
```

```ts
// 2. Trim / edit route — replaces POST /render/jobs + applyClipPointerMetadata.
const receipt = await derivations.applyEdit(nodeRef, {
  trim: { startSeconds: 3.079, endSeconds: 697.672 },
});
// The manifest write IS the trim; it is already applied when this returns.
// The physical Clip is a planned artifact with a deadline; the previous
// playback URL keeps serving until the new Clip publishes and swaps.
return json(200, { appliedAt: receipt.appliedAt, clip: receipt.readiness.artifacts.clip });
```

```ts
// 3. Public page renderer — playback unchanged, honesty added.
const playback = resolvePlayback(metadata);              // Clip → faststart → Original
const summary = readDerivationsSummary(metadata);        // shared parse, served-file-policy
const showProcessingChip = summary !== null && !summary.settled && playback.tier !== 'clip';
```

```ts
// 4. Editor readiness query (workspace-tree-query.ts) — poll while pending, and
// pending is now a derived, self-correcting fact, so "polls forever" cannot exist.
refetchInterval: nodes.some((n) => n.nodeType === 'video' && derivationsPending(n.metadata))
  ? 5_000 : false,
```

## Shape

**Data structures first.** Three structures carry the whole design; everything else is a function over them.

1. **`DerivationPlan`** (`plan.ts`, pure): the deterministic answer to "what should exist for this video's current lifecycle generation right now." `planDerivations({generation, source, manifest, recipes})` returns one `DesiredArtifact` per kind: a content-addressed `ArtifactIdentity = hash(source digest + the artifact's own manifest slice + recipe version)`, a `costClass` (`interactive` | `bounded` | `bulk`), a `budgetMs` latency contract, and `dependsOn` edges (clip ← faststart; transcript ← audio). This improves the existing `(node, kind, input_digest)` identity: the digest hashes *logical* inputs, never a served URL, so a poster's identity no longer moves when the Clip publishes and pre-clip rows stop being orphaned (per ADR-0005 field-scoped derivation). The plan is also where a client-captured thumbnail lives honestly: it is a manifest field (`posterOverride`), so the plan simply does not desire a poster — no silent guard racing a PATCH.

2. **`DerivationRecord`** (`records.ts`): the existing `generated_video_outputs` table with added columns (`generation`, `budget_ms`; never rebuilt), wrapped in a store whose verbs are `ensureDesired(plan)`, `claim → {renew, verified, publish, failed}`, `supersede`. Two invariants are structural: *capacity never touches a record* (`deferForCapacity` is deleted; waiting is supervisor state, so `failed_recoverable attempts=0` stops being a fake failure signature), and *every transition batch re-folds the readiness summary and writes the SLA event in the same D1 batch*. Records are the single source of truth; node metadata holds only published result aliases (as today) plus the derived summary.

3. **`VideoReadiness`** (`projection.ts`, pure): `projectVideoReadiness(plan, records, now)` folds the current generation's records into `{phase: ready | deriving | degraded | failed, settled, artifacts, breaches}`. **Where computed:** (a) inside every record transition, stored as one versioned `derivations` metadata alias in the same batch — a cached fold with exactly one writer, the record store; (b) re-computed by the sweep, which alerts if stored ≠ folded (divergence is a detected bug, never drift); (c) parsed client-side by `readDerivationsSummary` in `served-file-policy`. No driver ever writes a status field; `preparation_status` and its four writers are deleted. A stuck "processing" is impossible by construction because there is no writer whose absence can strand it.

**Flow.** Accept → `ensureCurrent` → plan → desired records (budgets stamped at `created_at`) → one **`DerivationSupervisor` DO per video** (`derivations:<ws>:<node>`) reconciles in its alarm: for each unmet artifact with met dependencies, ask the producer `ensureOperation(set, op)`; the typed `AdmissionDecision` either attaches to a running/finished operation or refuses with `retryAfterMs`. The alarm re-arms at `min(next poll, next budget deadline)` and, by invariant, *stays armed while anything is unsettled* — a busy producer can refuse forever and the job still has a driver. On deadline: write an idempotent breach event + Analytics Engine point + mark the summary; work continues. The single cron sweep (`sweep.ts`, replacing three per-kind catch-ups and the two missing ones) is the second liveness leg: re-kick dead supervisors, backstop breach events, re-fold stragglers — one query over all kinds, so "no sweep covers posters" cannot recur.

**Capacity: one meaning, one place.** The producer's interface defines it (`AdmissionDecision`), the supervisor responds to it in one branch, the container enforces it in `lanes.py`: one `bulk` slot, a small `bounded` pool, and `interactive` operations that are *never* refused for capacity — replacing the single `PROCESSOR_LOCK`. Per-video container affinity is kept deliberately, inverted from disease to cure: the same instance holds a per-set, content-addressed **source cache**, so one Original download serves faststart, clip, poster, and audio in one operation set (per separate-before-serializing: the cache has one writer, the set supervisor thread).

**Cost classes are promises, stated on the interface:** `interactive` (poster, preview frame): admitted concurrently, seconds, never capacity-refused. `bounded` (audio extraction, boundary re-encode, composed verification): proportional to a bounded slice, ≤ ~60 s, small pool. `bulk` (faststart, transcode fallback): proportional to source length, one per instance, refusable with `retryAfterMs`. The trim moves classes: keyframe-cut trim (`trim.py`) stream-copies whole GOPs and re-encodes only boundary groups (decoding from the preceding keyframe, which preserves the held-frame semantics the no-input-seek code protected), so a Clip is `bounded`, not `bulk`. Verification becomes compositional: the faststart keeps `full-decode-v1` (the trust root — each source byte is fully decoded exactly once per generation), and composed outputs get `composed-v2`: full decode of the re-encoded boundaries plus structural index/continuity checks on copied bytes, cost proportional to what was re-encoded. Corrupt output still cannot publish; the verify just stops re-proving bytes that a verified input already proved. Uploads are parallel multipart or single-shot small outputs.

**Interface depth.** The public surface is four methods (`ensureCurrent`, `applyEdit`, `readReadiness`, `cancelGeneration`) plus two pure exports (`projectVideoReadiness`, `readDerivationsSummary`). Behind it: planning, identity hashing, budgets, records, the supervisor loop, admission, SLA, the sweep, the producer protocol. Callers coordinate nothing (no shallow-module sign of "call schedule then ensure then patch"); the trace accept → publish → readiness reads through `index.ts → plan.ts → supervisor.ts → producer-client.ts` and back through `records.ts → projection.ts` (per minimize-reader-load, ≤3 files per question). What the module deliberately does not do: decide playback (that stays `resolvePlayback`'s), run renders in request context, or expose any wire/D1 type (per boundary-discipline).

## Synthesis decision

*Placeholder — filled in by arena synthesis.*

## Tradeoffs accepted

- We accept a materialized readiness summary (a cached fold that could theoretically drift) in exchange for cheap hot reads on tree lists and public pages; drift is converted from silent risk to an alerted invariant by the sweep's re-fold comparison.
- We accept one supervisor DO per video (a new serialization point for *driving*) in exchange for deleting five independently dying chains; renders still run in the container, so the DO only sequences polls, and per-video driving order was already the domain's shape.
- We accept keeping per-video container affinity (an intra-video bulk queue of depth 1) in exchange for the source cache's download-once guarantee; the artifacts that suffered from it (poster, audio) leave the queue entirely via lanes.
- We accept `composed-v2` verification trusting stream-copied bytes from an already-verified faststart in exchange for verification proportional to re-encoded duration; the invariant "corrupt output never publishes" is preserved by construction (verified input + checksummed copy + decoded boundaries), not weakened.
- We accept budgets as recorded-and-alerted contracts, not hard kill switches, in exchange for never trading completion for punctuality; breach handling is a paging decision, not a scheduler behavior.
- We accept adding an `audio` artifact kind (persisted FLAC slot) in exchange for transcript retries that never re-extract and a provider call that is a cheap, separately retryable step.

## Alternatives considered

- **Queue-centric pipeline (Cloudflare Queues per cost class, stateless consumers).** Lost on constraints and depth: renders may not run in consumer `waitUntil`-style contexts per the 2026-07 incidents, the ratified drive mechanisms are DO alarms + cron, and queues still leave readiness and SLA with no home — the caller-facing surface would grow (enqueue + status + readiness) while hiding less.
- **Producer-owned orchestration (workspace-tree writes desired state; the producer polls it and drives).** Lost: it moves scheduling truth across a service boundary that "the job database is scheduling truth" (reliable-video-lifecycle) deliberately keeps on one side, gives the producer worker a cron it doesn't have, and makes readiness a cross-worker join. Exposes distributed-state complexity to every debugging session; hides only a service binding.
- **Harden the status quo (five chains, add poster/gif sweeps, patch `preparation_status` at clip settle, special-case the lock).** Lost as temporal decomposition: each fix closes one instance of a class (dead chain, stale writer, second capacity meaning) while the class stays open; the readiness fold and the SLA clock still have no owner. This is the shape the incident already falsified.
- **Read-time-only projection (no stored summary).** Viable and simpler truth-wise; lost on interface depth for hot paths — every tree page pays a per-node records join, and the Worker-rendered public page would need a records read it doesn't have. Kept as the sweep's checking mode instead.

## Open questions and risks

- Budget constants: are `poster 30 s, preview 60 s, audio 120 s, transcript audio+60 s, faststart 60 s + 250 ms/MB, clip 120 s (+ faststart remainder when unpublished at request)` the contract William wants to page on, or should the first weeks run observe-only before alerting?
- The `bounded` lane admits two concurrent operations next to a `bulk` encode on 4 vCPU. Do we pin the bulk encoder to fewer threads while the lane is occupied, or accept a measured slowdown? Needs one staging measurement.
- Keyframe-cut trims of *transcoded* faststarts (WebM originals) copy re-encoded GOPs, which is correct; trims of stream-copied faststarts inherit MediaRecorder's keyframe cadence — if real recordings show sparse keyframes (> 10 s GOPs), boundary segments grow and the clip budget may need a size-banded term. Verify cadence on real recorder files before fixing the budget.
- Is `cancelGeneration` on delete sufficient, or does the supervisor also need an explicit abort surface for in-flight container operations (today they run to completion holding the slot)?
- The transcript provider call runs in a supervisor alarm after the audio artifact publishes (bounded seconds). If provider latency grows past tens of seconds, does it become a producer-side operation instead?

## Next implementation step

Implement migration unit 1 (`projection.ts` + `readDerivationsSummary` + summary refresh in the four existing settle paths, deleting every `preparation_status` writer and reader) against this sketch — it is caller-visible, fixes the live stuck-forever bug, and gives every later unit its measurement surface.
