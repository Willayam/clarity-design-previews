# Video derivations: latency contracts and module boundaries

Status: candidate design (architect arena, Phase B)
Date: 2026-09-15
Sketch: [`sketch/`](sketch/) — start at [`sketch/call-sites/`](sketch/call-sites/), then [`sketch/domain/types.ts`](sketch/domain/types.ts)
Migration: [`migration.md`](migration.md)

## Problem

An 11-minute recording accepted at 20:36:23 on 2026-09-15 had no poster until 20:47:20, no transcript until 20:48:48, and is still marked `processing` today. None of that is one bug. Four artifacts for one video are pinned to one container instance behind one `threading.Lock`, so they serialize by construction and sharding cannot help. The container's "busy" reply is one response that two call sites read two different ways: the clip and faststart drivers treat `status: 'processing'` as still rendering and renew the lease, while the poster, preview and transcript drivers run the same body through a four-level string unwrap and park the row as `failed_recoverable` with `attempts - 1` — a state no sweep queries, no alert scans, and no dead-letter can ever reach. Terminal readiness is a hand-written metadata string with exactly one `ready` writer (`durable-faststart.ts:197`) that runs before the clip it is describing exists and never runs again. Job identity is a hash of a URL that changes when a clip publishes, so the poster attempt that started at 20:36 and the one that succeeded at 20:47 are different rows and the first is orphaned. The durable operations path emits no telemetry at all, so the two jobs that consumed 654 of the 751 seconds left no trace outside D1.

The constraints the design has to honour are not negotiable and several of them are scar tissue. Renders never run inside `waitUntil` (three 2026-07 incidents); kicks may. The container has `enableInternet=false`, so every input byte is proxied through a Worker. D1 tables may gain columns and must never be rebuilt, because out-of-repo child tables exist. A corrupt output can never be published, which today means a full decode of every artifact. The Original of an accepted video stays private, so the public share link genuinely waits on one derived artifact. And ADR-0004 and ADR-0005 are ratified: one progressive MP4, and a video is sources plus a manifest plus a recipe with every artifact a content-addressed pure function of those.

## Usage (caller's view)

Callers import one module and call one of four verbs. Nothing below this line knows there is a D1 table, a container, a lane, a lease, or an HTTP status.

```ts
import { createVideoDerivations } from './derivations/video-derivations';

const derivations = createVideoDerivations(env);

const { view } = await derivations.acceptOriginal({ ctx, manifest, receipt });
await derivations.applyEdit({ ctx, edit: { kind: 'set-trim', span }, expectedManifestDigest, video });
const one = await derivations.read(video);
const many = await derivations.readMany(videos);
```

Every one of them returns a `VideoView`: the manifest, the Current playback URL, the artifacts that exist, and `readiness`. `readiness` is projected from the derivation records, never stored, so it cannot be stale and cannot be forgotten.

**The acceptance handler** ([`sketch/call-sites/accept-original-route.ts`](sketch/call-sites/accept-original-route.ts)) stops naming artifact kinds. Today it runs a four-statement batch that hand-writes `preparation_status: 'processing'` and pre-enqueues one faststart row, then fires four unordered fire-and-forget kicks. After:

```ts
const accepted = await derivations.acceptOriginal({
  ctx,
  manifest: initialManifest({ trim: receipt.requestedTrim }),
  receipt,
});
return Response.json({ playback: accepted.view.playback, readiness: accepted.view.readiness },
  { status: accepted.created ? 201 : 200 });
```

**The trim route** ([`sketch/call-sites/apply-edit-route.ts`](sketch/call-sites/apply-edit-route.ts)) replaces `POST /render/jobs`. It returns as soon as D1 acknowledges a compare-and-swap on the manifest digest. There is no job id in the response, because there is nothing to poll by hand:

```ts
const applied = await derivations.applyEdit({ ctx, edit, expectedManifestDigest, video });
return Response.json({ manifestDigest: applied.view.manifest.digest, readiness: applied.view.readiness }, { status: 202 });
```

**The public page renderer** ([`sketch/call-sites/public-page-renderer.ts`](sketch/call-sites/public-page-renderer.ts)) asks one boolean instead of reading eleven field aliases and a status string:

```ts
if (!view.readiness.shareLinkLive) {
  return view.readiness.state === 'recovery_required'
    ? { kind: 'unavailable' }
    : { kind: 'processing', retryAfterMs: view.readiness.retryAfterMs };
}
return { kind: 'direct', posterUrl, source: view.playback.tier === 'clip' ? 'clip' : 'asset', url };
```

**The editor's readiness query** ([`sketch/call-sites/editor-readiness-query.ts`](sketch/call-sites/editor-readiness-query.ts)) stops inventing a polling rule. Today `workspaceTreeHasPendingRender` polls the whole tree every 5 s while any node says `preparation_status === 'processing'`, which for the incident node is forever. After, the server dictates the cadence and says when to stop:

```ts
refetchInterval: workspaceTreeRefetchInterval(nodes, now)   // min(nextPollDelayMs) or false
```

Two system entry points are not caller-facing and exist only so a reader can trace the whole flow: `drive({ video, now })`, called by the supervisor alarm, and `sweep({ limit, now })`, called by the one-minute cron.

## Shape

### The data structure the design turns on

A **derivation record** is one slot in the render graph, and it carries two clocks that are never confused:

- `deadlineAt` — the latency contract. Fixed at plan time as `acceptedAt + budgetMs(kind, sourceSize)`. Never moved by a retry, a capacity wait, a redeploy or a stale claim. A contract the system can quietly extend is not a contract.
- `nextDueAt` — when this record wants attention. Moved freely by backoff and capacity waits.

Every other property follows from having both. The sweep filters on `nextDueAt` and orders by `deadlineAt`, so the work closest to breaching its promise runs first, across every video and every kind. The same pass stamps `breachedAt` on anything past its deadline and emits the alert. **The query that alerts is the query that drives**, which is the structural reason an artifact can never be both late and unattended — the failure mode that produced a manual `just _workspace-tree-rearm-failed-posters` recipe as a recovery procedure.

Storage is the existing `generated_video_outputs` table plus six additive columns and two partial indexes (`accepted_at`, `deadline_at`, `next_due_at`, `breached_at`, `cost_class`, `manifest_digest`). No table is rebuilt and there is no dual-write window. The legacy status vocabulary stays in the column and is translated at the ledger boundary; `ready_unpublished` never leaves [`derivation-ledger.ts`](sketch/workspace-tree/derivation-ledger.ts).

### What is owed is planned, not implied

`planDerivations(sources, manifest, video, acceptedAt)` is pure and total: given canonical truth it returns the complete owed set with every deadline already computed ([`sketch/domain/plan.ts`](sketch/domain/plan.ts)). Today the owed set is implied by which rows happen to exist, and rows appear as a side effect of whichever `ensure*` ran first, so no function can answer "is this video finished" without knowing the process history.

Every drive begins with `reconcilePlan`. Records whose key the plan no longer owes become `superseded` instead of rotting; records the plan owes and that do not exist are inserted. That is the structural fix for the orphaned poster: a stale key cannot survive a single pass, because the plan is recomputed from the manifest every time.

Keys are content addresses over inputs, not URLs ([`sketch/domain/keys.ts`](sketch/domain/keys.ts)): `sha256(recipeVersion, kind, sources(key + etag + bytes), manifestSlice)`. The node id, the workspace id, the generation, every URL and every timestamp are deliberately excluded. Two consequences matter. A signed-URL rotation no longer forks identity. And the poster's key stops moving when a clip publishes, because the poster hashes `{posterTimeSeconds, trim}` — the manifest slice — rather than whichever URL happened to be current. Field-scoped slices are ADR-0005's efficiency made literal: `playback`, `audio` and `transcript` hash the empty slice, so a trim is free for three of six artifacts.

The attempt id leaves the object key. Today an artifact lands at `clips/<asset>/source-<digest16>.<attemptId>.mp4`, so a retry writes a second object and the content address stops being an address. Attempt fencing moves to the record, where it already works.

### Readiness is a projection

`projectVideoReadiness({ plan, records, now })` is pure and lives in the shared package that the worker, the public renderer and the editor all import ([`sketch/domain/readiness.ts`](sketch/domain/readiness.ts)). The states are `ready`, `preparing`, `degraded` and `recovery_required`; the last is reachable only when the gating artifact fails permanently. `preparation_status` is not written by this design and the last migration unit deletes its readers. The bug where the node is permanently `processing` is not expressible: nothing reports a terminal state, and both "a clip is still owed" and "everything owed has published" are computed from one set, at read time, by one function (per *single source of truth per invariant: derive instead of sync*).

Computation happens server-side in the read path. `readMany` is one indexed query for a whole Library page, which is the dominant access pattern; there is no cache to invalidate because nothing is stored to go stale.

### One capacity policy, expressed as lanes

Capacity is the producer's knowledge, so the producer returns a decision, not a status code. `Admission` is a closed union ([`sketch/workspace-tree/producer-client.ts`](sketch/workspace-tree/producer-client.ts)):

```ts
type Admission =
  | { state: 'running'; costClass; operationId; receipts; retryAfterMs }
  | { state: 'queued'; lane; retryAfterMs }
  | { state: 'complete'; receipts }
  | { state: 'rejected'; reason: RejectionReason; detail };
```

`queued` has exactly one meaning for every kind: the record stays `running`, the lease is renewed, `awaitingCapacitySince` is stamped once, `nextDueAt` moves to `now + retryAfterMs`, and `attempts` is untouched. It is not a failure and it never parks a row. `isProcessorCapacityFailure`, `PROCESSOR_CAPACITY_WAIT`, `isWaitingForProcessorCapacity`, `deferForCapacity` and the `status === 'processing'` branch in both heavy drivers all delete together. A record waiting for capacity always has a driver, because `nextDueAt` is durable and the sweep is kind-agnostic.

`retryAfterMs` is the remaining time of the operation actually holding the lane, not a fixed backoff. That is what turns 21 refusals at 31.5 s intervals into one wait.

The lane is the container instance identity: `derive-heavy-<shard>` and `derive-light-<shard>` are different Durable Objects with different processes and different locks. Heavy admits one (it downloads to a 20 GB disk and saturates 4 vCPU); light admits three (it range-reads through the Worker and never touches disk). Light work therefore cannot queue behind heavy work for the same video — the contention the current design creates by passing the same `videoId` to `containerInstanceName` from all four kinds. `LANE_SLOTS` lives once in [`sketch/domain/contracts.ts`](sketch/domain/contracts.ts) and rides the payload into the container, which enforces it with a semaphore; the Worker names lanes and never decides admission, because only the container knows what it is already running (per *separate before serializing shared state*).

### The contract table is the policy

[`sketch/domain/contracts.ts`](sketch/domain/contracts.ts) holds budget, lane, cost class, executor, lease, attempt budget, poll interval, recipe version and consumer gate for all six kinds. Everything it replaces was a scattered constant: `GENERATED_OUTPUT_POLICIES`, the driver's 5 s/30 s branch, `ATTEMPT_LEASE_MS`, `claimAttemptLimit`'s 1_000_000_000 for clip and faststart, `retryCutoffsByAttempt`'s special case, three catch-up batch sizes.

`consumerGate` encodes requirement 1's second sentence as a type. Exactly one kind — `playback` — may carry `publishes-share-link`, asserted by a unit test. Everything else is `upgrades-experience` and no resolver, route or component may block on it. The owner's trim is a manifest write and the owner plays the Original directly under their own authorization, so neither ever waits on a render (ADR-0005's two consumers). For a brand-new video the share link genuinely waits on the playback artifact, because an accepted Original stays private; the path to the vision's sub-two-second bar is filling that slot from the recorder (I8), not making the server faster, and `clientFillable: true` plus `derivations.fill` is the seam for it.

Budgets, checked against the incident:

| kind | lane | expected cost | budget from accept | measured 2026-09-15 |
| --- | --- | --- | --- | --- |
| poster | light | stream | 20 s | 10 m 57 s |
| preview | light | stream | 60 s | not produced |
| transcript | light | stream + provider | 90 s + 0.10 × duration (2 m 30 s) | 12 m 24 s |
| playback | heavy | copy | 45 s + bytes ÷ 25 MiB/s (1 m 21 s) | 2 m 44 s |
| clip | heavy | boundary-encode | 60 s + bytes ÷ 25 MiB/s (2 m 6 s) | 10 m 48 s |

### Cost classes are a promise the producer makes

`stream` (no download, bounded CPU), `copy` (every byte moves, nothing decoded frame by frame), `boundary-encode` (interior stream-copied, at most two boundary GOPs re-encoded), `full-encode` (the whole duration decoded and re-encoded). The producer plans the recipe before running it and reports the class it will run; a class more expensive than the plan expected emits `recipe_escalated` and recomputes the deadline once. A trim that cannot be keyframe-aligned is then a visible signal rather than a p95 outlier, which is the difference between 105 s and 648 s.

Three changes make the heavy recipes cheap while keeping the publication invariant ([`sketch/producer/container/recipes.py`](sketch/producer/container/recipes.py)):

1. **Boundary trim.** Cut at keyframes, re-encode only the head and tail groups, stream-copy the body. The head still decodes from the preceding keyframe with the trim applied as a filter, which preserves the held-frame behaviour `playback_test.py:97-121` pins — that property is why the current code refuses an input seek for the entire file, and here it costs one GOP instead of eleven minutes. The keyframe-aware machinery already exists in `app.py` and is unreachable in production; this revives it on the live path rather than inventing it (per *subtract before you add*).
2. **Proportional verification.** `verified: 'derived-v2'` records that copied byte spans are digest-identical to spans of a `full-decode-v1` ancestor and that only the re-encoded spans plus each concat seam were decoded. The invariant becomes inductive: every leaf of a proof tree is a full decode, so no byte reaches a viewer that was not decoded either in this operation or in the verified operation that produced the file it was copied from. Structural checks (`compatible`, duration tolerance, `progressive_index`) still run over the whole output every time, because they are cheap and they are what catches a bad container as opposed to a bad frame.
3. **One fetch per operation set, parallel upload.** The heavy lane's set is `[playback, clip]`: fetch the Original once, remux and verify and upload the playback artifact, then cut the clip from that verified file already on disk. Receipts are emitted per artifact the moment each object is durable, so the share link goes live while the clip is still encoding. Upload is a single PUT below the multipart threshold and bounded-concurrency multipart above it; part numbers were always independent, so ordering was never required.

### The supervisor

One Durable Object per `(node, generation)` ([`sketch/workspace-tree/derivation-supervisor.ts`](sketch/workspace-tree/derivation-supervisor.ts)) replaces `ClipRenderDriver`'s five naming schemes, five kick shapes and five independent alarm chains. Its alarm is four lines: call `drive`, arm at the returned `nextDueAt`, or clear state when nothing is owed. No per-kind branch, no `pollAgain` boolean whose falsy values mean four different things. Kicks ride `waitUntil`; renders never do. The generation is in the DO name so a replaced Original cannot inherit an old alarm.

### Interface depth

The public surface is six verbs, four of them for callers, over `VideoRef`, `EditManifest` and `VideoView`. Behind it: D1 and its status vocabulary, the producer binding and its wire shapes, container lanes and admission, the lifecycle fence, attempt leases, capacity waits, the SLA clock, content addressing, publication compare-and-swap, and the two-phase verify-then-publish settle. It replaces roughly 3,000 lines across `generated-video-capabilities.ts`, `video-transcripts.ts`, `render-jobs.ts`, `durable-faststart.ts` and `clip-render-driver.ts`, which are a temporal decomposition — schedule, ensure, drive, settle, publish, sweep — each stage re-deriving the same source URL and digest, and each a place a caller could learn the wrong thing. Tracing acceptance to publication reads through three files: the facade, the ledger, the producer client (per *minimize reader load*).

The one thing deliberately left exposed is `VideoView.artifacts`, a map of what exists. Surfaces legitimately need the poster URL and the transcript's presence, and hiding them behind accessors would be a pass-through layer.

## Synthesis decision

*Filled in by arena. Records which candidate became the base and why, what was adapted from each of the others, and what was rejected and why.*

## Tradeoffs accepted

- We accept an inductive verification proof in exchange for removing a full decode of the output from every clip. This is the riskiest tradeoff in the design. The mitigation is that copied spans are checked by digest against a verified ancestor, seams are decoded, and the structural checks are unchanged, so the failure mode would have to be a copy that is byte-identical to verified bytes yet undecodable.
- We accept two container instances per active video (one per lane) in exchange for light artifacts never queueing behind heavy ones. Light instances do no disk work and sleep after two minutes.
- We accept batching `[playback, clip]` into one operation in exchange for one fetch instead of two. Their failures stay independent: each artifact has its own receipt, its own record, and its own R2 recovery, so a crash after the first receipt re-runs only the second.
- We accept keeping `generated_video_outputs` and its legacy status strings, translated at one boundary, in exchange for zero rebuild risk and no dual-write window.
- We accept alert noise during the first bake. Budgets are asserted targets, not measurements of the current system, and the first weeks will tune them with recorded numbers rather than argument.
- We accept that the share link still waits on one server artifact. Making it truly instant is client-side capture (I4/I8); this design provides the slot and the verification gate rather than pretending the wait away.
- We accept writing the legacy metadata pointer fields during migration even though readiness no longer reads them, because `packages/served-file-policy` and legacy records still do until the final unit.

## Alternatives considered

- **Point-fix the current shape**: add a poster sweep, make the clip settle also write `preparation_status`, shard the container by `(videoId, kind)`. Smallest diff and it would have shortened the incident. Rejected on interface depth: callers still coordinate four `schedule*`/`ensure*` pairs to complete one operation, readiness stays a written field with more writers than before, identity still moves with URLs, and the two readings of "busy" survive. It fixes the incident without removing the conditions that produced it.
- **A per-kind worker fan-out over Cloudflare Queues.** Real decoupling and free retry, but the visibility timeout duplicates the lease, per-video ordering has to be rebuilt, deadline ordering needs a second index the queue cannot provide, and the D1 ledger remains the truth regardless — two sources for one invariant. Rejected on *single source of truth*, and because a new infrastructure dependency is a poor trade for a scheduler that is one indexed query.
- **Move scheduling entirely into the producer** as a job broker with its own queue DOs. It puts capacity knowledge where it belongs, but publication needs node metadata, lifecycle generations and compare-and-swap against the workspace tree's D1, so the producer would need all three: textbook information leakage across a service boundary. Adapted rather than adopted — the producer owns *admission*, the workspace tree owns *scheduling and publication*.
- **Keep one artifact per operation and add a shared scratch cache in the container** to avoid re-downloading. Rejected: a cache across instances needs coherency and eviction policy, and the operation set gets the same saving with no cache at all.
- **Derive the poster and preview from the published Clip** (today's behaviour, formalized). Rejected: it makes every light artifact wait on the heaviest one, which is the incident. Mapping poster time through the manifest gives the same frame from the Original in seconds.
- **A new `video_derivations` table instead of additive columns.** Cleaner vocabulary, but it requires a dual-write window across two tables that both claim to be scheduling truth. Rejected for the same reason the design refuses shared writers elsewhere.

## Open questions and risks

- How far may a trim point move to land on a keyframe? Zero tolerance means the boundary GOP always re-encodes (still cheap, always correct). A tolerance of a frame or two would let some trims stream-copy end to end, at the cost of the cut not being exactly where the owner dragged it. Should the editor snap visibly to keyframes, or should the cut stay exact?
- Is the poster time the owner picks expressed in clip coordinates or source coordinates? The design assumes clip coordinates mapped through the manifest, so the frame stays the same one the owner saw after a trim. Is that the intended product behaviour?
- Should an `sla_breach` on the gating kind page, or only alert? The table proposes paging on one gating breach in fifteen minutes, which is deliberately aggressive.
- Should `audio` artifacts be retained in R2 after the transcript publishes, or deleted on a TTL? Retention makes provider retries and future re-transcription free; deletion saves roughly 2 MB per minute of video.
- Is speculative client fill of the poster acceptable to product? The recorder's client JPEG is currently authoritative and visible immediately; under verify-then-accept it becomes a cache fill that the server can reject, which could change what an owner sees in the first seconds.
- The 889 MB source is `compatible()` by a hair at 10.17 Mbps against a 12 Mbps ceiling. Should the playback recipe's compatibility test be widened, given that a source just over the line jumps from `copy` to `full-encode` and from a 81 s budget to a 14 minute one?
- Risk: the lane split doubles container instances per video, and `max_instances` is 25 in production. Does the fleet need a higher cap before the light lane exists, or is `sleepAfter='2m'` enough?

## Next implementation step

Build migration unit 1 from [`migration.md`](migration.md): the lane split and the typed admission contract, deleting `isProcessorCapacityFailure`, `deferForCapacity` and the `status === 'processing'` busy branch in the same PR.
