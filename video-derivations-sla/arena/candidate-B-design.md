# Video derivations with explicit latency contracts

## Problem

Clarity accepts a playable Original, then independently derives a progressive faststart MP4, Clip, poster, looping preview, and transcript. Today those derivations have five partially different state machines, one overloaded producer response, per-kind recovery gaps, and mutable node metadata that drivers try to keep in sync with durable jobs. The result can be correct bytes with a permanently “processing” video, eleven minutes of invisible capacity waiting, and light work trapped behind a full encode. The replacement must preserve lifecycle fencing, content-addressed identity, verified-before-publish output, private Worker-proxied inputs, instant owner playback/editing, and the rule that renders run only from Durable Object alarms or awaited cron sweeps. Existing D1 tables may only be extended, never rebuilt.

## Usage (caller's view)

Callers receive one `VideoDerivations` dependency. They do not choose artifact kinds, schedule drivers, interpret HTTP status codes, or read lifecycle metadata.

```ts
import type { VideoDerivations } from '@clarity/video-derivations';

// Acceptance handler: the receipt adapter has already authenticated and parsed the upload receipt.
declare const videoDerivations: VideoDerivations; // injected at the Worker composition root
const accepted = await videoDerivations.acceptOriginal({
  acceptanceId,
  acceptedAt: now,
  lifecycleGeneration,
  original,
  parentId,
  title,
  video: { nodeId, workspaceId },
});
return nodeResponse(accepted.node, accepted.video); // owner playback is the Original now
```

```ts
// Trim/edit route: this commits Edit metadata and returns; it never waits for Clip bytes.
const edited = await videoDerivations.applyEdit({
  edit: { kind: 'setTrim', range: { startSeconds, endSeconds } },
  expectedManifestRevision,
  idempotencyKey,
  requestedAt: now,
  video: { nodeId, workspaceId },
});
return {
  edit: edited.video.edit,
  ownerPlayback: edited.video.ownerPlayback,       // source + live trim range
  currentPlayback: edited.video.currentPlayback,   // prior public file until atomic swap
  readiness: edited.video.readiness,
};
```

```ts
// Public rendering and Workspace Tree both batch through the same projection.
const [video] = await videoDerivations.read({
  audience: 'viewer',
  videos: [{ nodeId, workspaceId }],
});
return renderVideo({ src: video.currentPlayback?.url, poster: video.posterUrl });

// The editor consumes the projected refresh instruction; it never inspects metadata statuses.
const pendingRefreshes = nodes.flatMap(node =>
  node.video?.readiness.refreshAfterMs == null ? [] : [node.video.readiness.refreshAfterMs]
);
const refreshAfterMs = pendingRefreshes.length ? Math.min(...pendingRefreshes) : null;
```

The caller surface is therefore three operations: `acceptOriginal`, `applyEdit`, and batched `read`. Acceptance and edit return the same `VideoProjection` that reads return. The complete public types are in `sketch/video-derivations.ts`; representative adapters are in `sketch/callers.ts`.

## Shape

### Data first: demand, slot, and projection are different records

An accepted lifecycle generation owns an immutable source set and a sequence of immutable manifest revisions. Every revision has exactly one demand row for each of the five domain kinds: `faststart`, `clip`, `poster`, `loopingPreview`, and `transcript`. A demand is either active and points to an artifact address, or is explicitly `not_applicable`; absence is never a state. Its latency contract snapshots `originalAcceptedAt`, policy version, budget, and deadline. The proposed v1 budgets are poster 15 s, looping preview 30 s, Clip 45 s, faststart 120 s, and transcript 180 s. Queueing, production, verification, and publication all count. A demand created by a later edit after its original-accept deadline records an immediate `demand_created_after_deadline` miss rather than resetting the clock.

Artifact addresses are `sha256(canonical(source identities, relevant manifest slice, recipe version))`. Source identity is the accepted object identity/checksum, never a served URL. The manifest slice is field-scoped: faststart and transcript ignore edits; Clip hashes trim/cuts/layout; poster hashes the selected frame in source coordinates plus the trim it must depict; looping preview hashes its range. This stops a Clip publication from moving poster identity. The existing `(node_id, kind, input_digest)` identity in `generated_video_outputs` remains the content-addressed slot and can be reused by later manifest revisions. Lifecycle generation and manifest revision live on demand rows, so a reusable slot is not also asked to represent “current.” This is the single source of truth per invariant.

When a new revision points at an already verified slot, that demand publishes in the edit transaction without driver work; unchanged artifacts therefore remain ready across edits.
An accepted client-captured poster may speculatively fill the same addressed slot after validation, but a metadata URL never suppresses or retires the durable demand.

The additive persistence shape is:

| Record | Owns | Dominant lookup |
| --- | --- | --- |
| `video_source_sets` / `video_manifests` | canonical Original identity and Edit metadata revisions | current lifecycle generation + current manifest revision |
| `video_derivation_demands` | five current-revision requirements and their frozen deadlines | `(node, lifecycle generation, manifest revision)` |
| `generated_video_outputs` | content-addressed production slot, attempt fence, verified receipt | `(node, kind, artifact digest)` and due work by lane |
| `video_derivation_sla_events` | exactly-once deadline misses for alerts/audit | unexported events by deadline and policy version |
| `media_operation_sets` | durable dispatch/admission identity for one staged input and one cost lane | due/running sets by lane and next observation time |

These are new tables, indexes, or `ALTER TABLE ... ADD COLUMN` changes only. No existing table is rebuilt.

`VideoProjection` is computed in Workspace Tree at its repository read seam, in a batch for lists and singly for public reads. It joins the current lifecycle generation and manifest revision to the five demands and their slots, then calls the pure projector in `sketch/readiness-projection.ts`. It reports playback availability, owner-edit availability, and derivative settlement separately. Thus an owner can be `playback: ready`, `editing: ready`, `derivatives: within_budget`; “deriving” is never a reason to disable playback. Viewer reads retain the previous published Clip during a re-trim and swap when the new current demand is published. Owner reads may use the authorized Original immediately; viewer reads never receive the private Original locator. Missing demand rows project as `degraded/configuration_gap`, not indefinite work.

### One coordinator and one policy

Acceptance and edit atomically write the node/source/manifest, all five demands, and any new slots. They then issue only a short driver kick. A lane-sharded Durable Object alarm calls `DerivationCoordinator.advanceLane`; the every-minute cron awaits the same method as the recovery sweep. Request `waitUntil` may deliver a kick but never calls `advanceLane` and never renders.

`DERIVATION_POLICIES` is the only kind switch. It owns the latency budget, recipe version, cost class, applicability rule, and deadline priority; the adjacent `CAPACITY_POLICY` supplies one retry/admission policy for all kinds. Every kind follows the same state vocabulary:

`queued → admitted → running → verified → published`, with fenced retry or terminal failure.

Capacity deferral is deliberately not a failure state and not an attempt: the slot stays queued, records `capacityDeferrals`, gets `nextAttemptAt`, and remains covered by both its lane alarm and the all-kind cron. `running` means exactly that the producer admitted this operation id; it never means “some other operation has the lock.” Earliest deadline is the ordering key inside each lane. An alarm is also scheduled for the earliest unpublished deadline. At that instant a CAS inserts one `video_derivation_sla_events` row; telemetry delivery marks its outbox acknowledgement only after success, so the cron retries a lost emission and the persisted deadline remains directly queryable.

The producer derives cost class from the recipe; callers cannot claim a cheaper class. `light` promises no full-duration video encode or full-output decode and runs on reserved light container capacity. Poster is one seek/frame, looping preview is a bounded window, and transcription is demux/audio encode plus the provider call in the Worker. `heavy` permits a full byte scan or compatibility transcode and runs on a separate heavy pool. Two independent pool bindings and a capacity broker make it structurally impossible for a faststart or Clip from the same video to occupy light capacity. When no permit exists, `ArtifactProducer.advance` returns typed `deferred`; it starts and retains nothing. All operations, including light ones, are asynchronous operation sets, so alarm invocations submit or observe and return quickly.

The module map is intentionally shallow in call depth and deep at the public seam:

```text
acceptance / edit / public page / Workspace Tree
                    │
          VideoDerivations (3 operations)
        ┌───────────┼─────────────────┐
  planner+policy  ledger+projection  coordinator alarms/cron
                                      │
                            ArtifactProducer.advance
                              ┌───────┴────────┐
                        reserved light     heavy pool
                              └── operation sets ──┘
```

The D1 repository and producer binding are internal ports with in-memory fakes; transport parsing, SQL rows, R2 keys, HTTP codes, container payloads, and provider credentials do not cross `VideoDerivations`. This interface earns its depth by hiding addressing, invalidation, atomic publication, retries, SLA observation, capacity, and fallback selection behind three calls, per interface-depth and boundary-discipline. Planner and projector are pure; adapters validate once and internal code trusts their branded identities, per encode-lessons-in-structure.

The signature-level trace is `acceptOriginal → planRevision → commitAcceptance`; alarm/cron is `advanceLane → leaseDueOperationSets → ArtifactProducer.advance → publishVerified`; readiness is `read → loadProjectionRecords → projectVideo`.

### Cheap work with proof, not hope

An operation set contains recipes of one cost class over one immutable source identity. The container receives a private Worker-proxied input handle (`enableInternet=false` remains) and an `InputWorkspace`; every recipe must use the staged or sparse-cached handle, so the same Original byte range is fetched at most once within that set. Results are observable independently, allowing a poster receipt to publish before a longer audio extraction in the same light set.

Faststart creates a reusable verified GOP/source index while remuxing. Exact Clip trimming finds the GOP containing each boundary, re-encodes only the leading and trailing boundary groups (zero groups when the cuts are already keyframe-aligned), stream-copies proven interior GOPs, and normalizes timestamps/audio at the joins. Decode verification is proportional to new encoding: decode every boundary group and a small window across each join; copied GOP packet hashes must match the already decode-verified source proof. A structural progressive-MP4/duration/codec check covers the assembled file, and the full output SHA-256 covers storage bytes. A format that cannot satisfy the proof contract takes an explicit full-transcode heavy recipe; it may miss its SLA, but it cannot weaken verification.

Final immutable keys derive from the artifact address plus output hash; attempt ids name staging work only, so a stale attempt cannot overwrite published bytes. Small outputs use one streaming PUT. Larger outputs use bounded parallel multipart upload with per-part hashes and an ordered completion manifest. The Worker independently heads the stored object and validates operation fingerprint, source proof, size, whole-output hash, and verification scheme before its adapter can construct the opaque `VerifiedArtifactReceipt`. The ledger's publication transition accepts only that branded receipt and a live attempt fence. Corrupt or stale output may occupy an unreferenced staging key, but can never become a published demand. The producer contract and Python boundary are sketched in `sketch/artifact-producer.ts` and `sketch/container_operation_set.py`.

This shape deliberately does not materialize readiness back into node metadata, let public reads drive work, expose pipeline stages as caller options, or maintain per-kind alarms. Those would recreate synchronized truth, temporal decomposition, and pass-through interfaces flagged by the architect screen.

## Synthesis decision

_Placeholder for arena synthesis._

## Tradeoffs accepted

- We accept normalized demand/source/manifest tables and a batched join in exchange for one truthful current-generation projection and queryable deadlines.
- We accept reserved light capacity that can sit idle in exchange for a hard guarantee that poster, looping preview, and audio extraction never wait behind heavy work.
- We accept a reusable source-proof format and more sophisticated Clip assembly in exchange for eliminating repeated full encodes and repeated full-decode verification.
- We accept that a user requesting a new artifact after its original-accept deadline creates a classified SLA miss in exchange for never redefining the measured interval to make the number look healthy.
- We accept node-scoped rather than global artifact deduplication in exchange for preserving the proven `(node, kind, digest)` identity during migration; the digest itself is global-ready later.
- We accept that incompatible codecs can still require a full transcode in exchange for keeping the verified-output invariant absolute.

## Alternatives considered

- **One workflow/actor per video.** It gives one apparent owner, but makes unrelated artifacts share an execution mailbox and encourages stage-ordered orchestration; capacity and retry details leak into the workflow interface, and one wedged video can again serialize its light work. It lost on seam placement and locality.
- **Independent actor and queue per artifact kind.** It maximizes local implementation freedom, but callers and reads must merge five state machines, capacity has five meanings, and current-generation publication becomes shared writable state. The public interfaces are shallow even if each actor is simple.
- **Keep metadata readiness and add a reconciler.** This is the smallest patch, but it creates another writer for the duplicated state instead of removing duplication. Every new artifact adds synchronization cases, and silence remains possible between reconcile runs.
- **A single FIFO producer queue.** It hides container admission well, but a multi-minute heavy head item necessarily blocks light work and a producer-owned wait queue can outlive the only driver that knows its SLA. Separate cost pools with caller-owned durable queueing are the only viable shape for the stated isolation guarantee.

## Open questions and risks

- Are 15 s / 30 s / 45 s / 120 s / 180 s the correct v1 alert budgets for poster / looping preview / Clip / faststart / transcript, or should any be tightened before the policy version is ratified?
- Should `demand_created_after_deadline` from a deliberate late edit be dashboard-only by default while still remaining alertable, or page the same route as an execution miss?
- What light/heavy reserved-capacity ratio should staging load evidence set before production, while preserving at least one light permit under heavy saturation?
- Which existing source formats can produce a trustworthy GOP proof, and which must be classified up front as full-transcode recipes rather than discovering that after partial work?
- How long should verified source proofs and unreferenced content-addressed outputs be retained before publication-aware garbage collection removes them?

## Next implementation step

Build PR 1, **“Current-generation derivation projection replaces `preparation_status`,”** exactly as specified in `migration.md`.
