# Migration: from five drivers to one derivation machine

Ten units. Each one is a PR that lands on main with its callers migrated and the legacy path deleted **in the same PR**, so there is never a window where two mechanisms both claim to schedule, publish or report the same thing (per *migrate callers then delete legacy APIs*). No unit leaves a feature flag behind. Units are ordered by measured impact on the 2026-09-15 incident first and by shape second; units 0 and 1 run in parallel.

Two repository rules shape the sequence. D1 migrations are additive only and ride along with the code deploy on a main push; a drop or rename would need its own PR after the code deploy, so no unit here renames a column. And `pnpm test` at the repository root is the gate that matters; editor vitest alone misses the workspace-tree fakes that match D1 query text.

Impact on the incident, if only the first three units ship: poster from 11 m to under 30 s, transcript from 12 m 24 s to about 90 s, the stuck "processing" node fixed and its 5-second Library polling stopped, and every remaining gap visible as a number.

---

## Unit 0, Workflows spike (throwaway, staging only)

The synthesis overrides all three candidates on the driver. This unit proves the assumptions before anything is built on them, per *prove it works* and the prototype playbook: an empirical question is answered by running it, not by asking.

**Build**

- A throwaway Workflow in `workers/workspace-tree` bound as `DERIVATIONS`, whose instance id is a content address and whose steps are: call the producer's existing poster route, sleep the returned wait, publish a receipt to a scratch D1 table.
- A script that creates 30 instances with 10 duplicate ids, kills a container mid-step, and records: create latency, duplicate-id behaviour, `step.sleep` accuracy at 2 s and 60 s, retry behaviour on a thrown step, and instance history visibility through `wrangler workflows instances describe`.

**Decide**

- Pass: duplicate ids are rejected without side effects, sleeps are accurate to a second, a thrown step retries with the configured backoff, and 30 concurrent instances run without hitting an account limit. The driver in unit 6 is `derivation-workflow.ts`.
- Fail: any of the above is a blocker. The driver in unit 6 is the supervisor Durable Object from `arena/candidate-C-design.md`, and `derivation-workflow.ts` is replaced by that sketch. Nothing in units 1 to 5 depends on the outcome.

**Deletes (same PR)**

- The spike itself. The PR that records the result deletes the scratch Workflow, binding and table; the measurement lives in this file's unit 0 section as a table of numbers.

---

## Unit 1, Lane-split admission: one typed admission contract, one box per heavy operation

The first unit, precisely: **give every heavy operation its own container instance and every video one light instance, and replace the 503-with-a-magic-string capacity protocol with a typed `Admission` union on both sides of the producer boundary.**

**Changes**

- New `packages/video-derivations/src/contracts.ts` with `Lane`, `LANE_SLOTS = { heavy: 1, light: 3 }`, and the lane assignment for each existing kind (`faststart`, `clip` → heavy; `poster`, `gif`, `audio` → light). Budgets and the rest of the contract table arrive in unit 3; this unit adds only what capacity needs.
- `workers/media-artifact-producer/src/index.ts`: `containerInstanceName(payload)` becomes `laneInstanceName(lane, operationId, videoId)` producing `derive-heavy-<operationId>` or `derive-light-<videoId>`. Every route passes its lane. `max_instances` raised in `wrangler.toml` for dev, staging and production; the cost watch threshold is reviewed in the same PR.
- Producer responses become `{ state: 'queued' | 'running' | 'complete' | 'rejected', ... }` with HTTP 200/202. `retryAfterMs` on `queued` is the remaining time of the operation holding the slot, reported by the container.
- `workers/media-artifact-producer/container/lanes.py`: a `LaneSemaphore` replaces the module-level `PROCESSOR_LOCK`. `slots` arrives in the payload and is pinned on first use. The light lane waits up to five seconds before answering `queued`.
- `workers/workspace-tree/src/media-artifact-producer-client.ts` gains `parseAdmission`, the single place a producer response becomes a domain value. The five call sites (`durable-faststart.ts`, `render-jobs.ts`, `generated-video-capabilities.ts` poster and gif, `video-transcripts.ts`) switch on `admission.state`.
- A `queued` admission renews the lease, leaves `attempts` untouched, leaves the row `rendering`, and re-arms the driver. Applied identically for all five kinds.

**Deletes (same PR)**

- `isProcessorCapacityFailure`, `PROCESSOR_CAPACITY_WAIT`, `isWaitingForProcessorCapacity` and `deferForCapacity` (including its `attempts = attempts - 1` SQL) from `generated-output-jobs.ts`.
- The `status === 'processing'` busy branch in `durable-faststart.ts:110` and `render-jobs.ts:653`, and the `429 || 503` branches beneath them.
- The container's `503 {'status': 'processing', 'error': 'Processor capacity is busy'}` bodies in `app.py:48-51` and `operations.py:59`, and `PROCESSOR_LOCK` itself.
- The "ponytail: video-local shard pool" comment and the per-video instance name it documents.

**Verification**

- Python: a lane test that one heavy operation and three light operations admit concurrently while a second heavy operation on the same instance is told `queued` with a non-zero `retryAfterMs`; a second test that two heavy operations with different ids never share an instance name.
- Workspace tree: a test that a `queued` admission leaves `status = 'rendering'`, `attempts` unchanged, and the lease renewed, with the row still visible to the driver afterwards.
- Producer worker: a test that no response body is ever string-matched by the caller (the old magic sentence is gone from the repository; grep in CI).
- Staging: record an 11-minute session, then read `clarity_render_timings_staging` through `scripts/video-telemetry.mjs` and show the poster published while the faststart is still running. That single fact is the unit's whole claim.

---

## Unit 2, Readiness as a projection

Moved ahead of the ledger because it fixes the live bug on production nodes today and is small.

**Changes**

- `readiness.ts` (`projectVideoReadiness`, `projectPlayback`, `nextPollDelayMs`), consumed by the workspace-tree read paths, the card decorator, the public payload and the editor. Until unit 5 lands, the plan it projects over is a static `expectedKindsFor(metadata)` (faststart, poster, gif, transcript, plus clip when `current_render_digest` is set).
- Node payloads carry `readiness`; `resolvePublicVideoPlayback` and `previewWorkspaceTreeNodeForCard` become adapters over it.
- `packages/served-file-policy` keeps its precedence for legacy records with no derivation rows and is fed by the projection otherwise.

**Deletes (same PR)**

- Every write of `preparation_status` and `playback_status`: `video-acceptance.ts:240`, `durable-faststart.ts:55/137/197`, `generated-video-capabilities.ts:383`, `workspace-tree-core.ts:570`.
- Every read: `workspace-tree-query.ts:160`, `HomeTreeRoute.tsx:581`, `served-file-policy`'s `preparation_status` branch, and `preparation-audit.ts` with its route.
- `workspaceTreeHasPendingRender`, replaced by `workspaceTreeRefetchInterval`.

**Verification**

- A regression test reproducing the incident: publish a faststart while a clip is still owed, publish the clip, and assert readiness moves `preparing` → `ready` with no driver writing a status. Today this node is permanently `processing`.
- A test that a video with a terminally failed poster reports `degraded`, plays, and stops the client poll.
- Production read-only before deleting the writers: count `metadata.preparation_status = 'processing' AND metadata.render_status = 'succeeded'` to size the stuck population, then confirm every one reads `ready` through the projection.

---

## Unit 3, The deadline ledger and the sweep that alerts

**Changes**

- Migration `0012_derivation_deadlines.sql`: `ALTER TABLE generated_video_outputs ADD COLUMN` for `accepted_at`, `deadline_at`, `next_due_at`, `breached_at`, `cost_class`, `manifest_digest`; partial indexes `idx_derivations_due (next_due_at)` and `idx_derivations_deadline (deadline_at)`. Additive, so it rides the code deploy. A backfill statement stamps existing active rows with `accepted_at = created_at` and a deadline from the contract table.
- `contracts.ts` gains `budgetMs`, `leaseMs`, `pollIntervalMs`, `maxAttempts`, `retryBackoffMs`, `consumerGate` for every kind, plus the test asserting exactly one gating kind. The clock for an artifact created by an edit starts at the manifest-slice change (`max(acceptedAt, sliceChangedAt) + budget`).
- New `sla-telemetry.ts` with `published`, `sla_breach`, `recipe_escalated`, `capacity_wait`, `failed`, `orphaned` events on the existing Analytics Engine binding.
- One cron handler: `sweep({ limit, now })` stamps `breached_at` (conditional on `IS NULL`) on unpublished records past their deadline and emits the alert. Until unit 6 replaces the drivers, it also kicks the existing drivers for due records, ordered by `deadline_at`; unit 6 deletes that leg.
- The producer emits a timing point for every lane, including the durable operations path.

**Deletes (same PR)**

- `clipRenderCatchUp`, `faststartCatchUp`, `transcriptCatchUp` and their batch-size constants and env overrides.
- `scanAndAlertStuckRenderJobs` and the `alert_failed_unrecoverable` / `alert_stuck_rendering` event types it emitted, replaced by `sla_breach`.
- The `_workspace-tree-rearm-failed-posters` and `_workspace-tree-rearm-failed-faststarts` recipes in `justfile` and their `scripts/cloudflare-ops.sh` branches. A manual re-arm is the symptom this unit removes.
- `claimAttemptLimit`'s 1_000_000_000 special case and `retryCutoffsByAttempt`'s clip/faststart branch, replaced by the uniform contract.

**Verification**

- A test that a record past `deadline_at` is stamped once and emits once, however many times the sweep runs.
- A test that the sweep drives a `poster` record, the kind that has no sweep today.
- Production read-only: count rows where `status = 'failed_recoverable' AND error = 'Waiting for processor capacity'` before and after, and confirm the new sweep drains them.
- A recorded p50/p75/p95 per kind from the new `published` events, published as the baseline the budgets are tuned against. The first two weeks are observe-only; paging is switched on with numbers.

---

## Unit 4, The edit manifest, and trim as a metadata write

**Changes**

- `packages/video-derivations/src/manifest.ts`: `EditManifest`, `applyEditIntent`, `canonicalManifest`, `manifestDigest`, `toSourceTime`.
- New node metadata field `edit_manifest` (JSON), server-owned, written only under compare-and-swap on its digest. A one-time read-through adapter builds a manifest from the legacy fields for records that lack one.
- `POST /tree/media/videos/:assetId/edit` and `.../edit/reset`, migrating the editor's `video-edit-session.ts` off `POST /render/jobs` and off its 500 ms poll.

**Deletes (same PR)**

- `POST /render/jobs`, `GET /render/jobs/:id`, `handleCreateRenderJob`, `handleGetRenderJobStatus`, `renderJobApiStatus`, and `editor/src/lib/render-job-client.ts`.
- `RenderJobTimeoutError` and the 60 s timeout in `editor/src/lib/video-edit-session.ts`. A 648 s render currently shows the owner an error while the render succeeds minutes later.
- The `reset_trim` server command branch in `workspace-tree-core.ts:570`, now the same verb with an empty edit.
- Client writes of `source_trim_start` / `source_trim_end` / `thumbnail_time` / `gif_start` / `gif_end`; these move into the manifest and join `SERVER_OWNED_ACCEPTED_VIDEO_METADATA_FIELDS`.

**Verification**

- A test that two concurrent edits with the same expected digest produce one winner and one 409.
- Editor test: applying a trim resolves in one round trip and the player keeps serving the previous Clip.
- Staging: measure trim-apply latency at the route. The vision's row is under 100 ms perceived; the write itself should be a single D1 batch.

---

## Unit 5, Content-addressed keys, the plan, and reconciliation

**Changes**

- `keys.ts` (`derivationKey`, `artifactObjectKey`, `toStoredKind`) and `plan.ts` (`planDerivations`, `reconcilePlan`, `deadlineFor`). The plan is total: every kind is planned or explicitly `not_applicable`.
- Every scheduling path computes its key from `(recipeVersion, kind, sources(key + etag), manifestSlice)` instead of hashing a URL. Recipe versions are pinned at their current behaviour so no in-flight artifact is invalidated by the switch; old rows are marked `superseded` once the new key publishes.
- The poster derives from the Original with its time mapped through the manifest, so it no longer waits for a Clip.
- `reconcilePlan` runs at the top of every drive.
- `audio` becomes a first-class stored artifact; the transcript reads it from R2.

**Deletes (same PR)**

- `posterRenderIntent`'s URL hashing and `resolveClipOrOriginalUrl` as a poster source.
- The `await schedulePosterForVideo(...)` calls in `render-jobs.ts:596` and `:690`; the clip's completion is no longer what revives the poster.
- The poster fields nulled by `clipSucceededMetadataPatch` in `clip-read-model.ts:96-103`.
- `headContentLength` / `media-source-probe.ts`: the signed HEAD of the source on every poll, roughly 32 round trips per faststart.
- The attempt id in output object keys.
- The transcript's in-Worker FLAC buffering and `/v1/audio`'s body-return path.

**Verification**

- A property test: the same inputs produce the same key across processes, and no URL, node id or timestamp changes it.
- A test that a poster planned before a trim and re-planned after it resolves to the same key, so the pre-clip row is never orphaned.
- Production read-only: confirm no `poster` rows remain `failed_recoverable` with `attempts = 0` after a bake window.

---

## Unit 6, One facade, one driver

**Changes**

- `workers/workspace-tree/src/derivations/`: `video-derivations.ts`, `derivation-ledger.ts`, `derivation-workflow.ts` (or the supervisor, per unit 0's result), `producer-client.ts`, `publication.ts`.
- `DERIVATIONS` Workflow binding; instance id is the operation set's content address; the four callers migrate to the facade verbs.
- The sweep loses its driving leg and keeps breach stamping plus the `orphaned` alert.

**Deletes (same PR)**

- `generated-video-capabilities.ts`, `durable-faststart.ts`, `clip-render-driver.ts`, the drive half of `video-transcripts.ts`, and the job half of `render-jobs.ts`.
- The `ClipRenderDriver` Durable Object binding and its migration entry, after the old instances drain.
- `scheduleGeneratedVideoCapabilities` and every `schedule*`/`ensure*` pair.
- `publishFaststartMetadata`, `publishPoster`, `clipSucceededMetadataPatch` as separate publishers, replaced by `publishArtifact`.
- The sweep's driver kick from unit 3.

**Verification**

- A test that tracing acceptance to publication reads through three files, enforced as a review checklist item.
- The full workspace-tree suite against the facade, with the existing publication-recovery and lifecycle-fence tests unchanged in intent.
- Staging: a full record → trim → share cycle with the old modules deleted from the bundle, and a killed container mid-step recovering through the platform's retry with no sweep involvement.
- Staging: an `orphaned` alert fires when a record is inserted with no instance, and never fires in the normal cycle.

---

## Unit 7, Operation sets: one fetch, many receipts

**Changes**

- `POST /v1/operations` takes an operation set; `derive.py` fetches the source once and writes one receipt per artifact as each object becomes durable. The playback recipe also stores its per-GOP proof beside the artifact.
- Resumable source fetch by `Range` after a short read.
- Upload becomes a single PUT below the multipart threshold and bounded-concurrency multipart above it.

**Deletes (same PR)**

- `/v1/clips`, `/v1/faststart`, `/v1/posters`, `/v1/gif`, `/v1/audio` and their `renderAndStoreArtifact` branches.
- `/v1/render`, `render_clip_file`, `render_faststart_source`, and the sequential `store_verified_output` loop.

**Verification**

- A container test counting source fetches per operation set: exactly one for `[playback, clip]`.
- A fault test that kills the process after the first receipt and shows the second artifact re-running while the first is recovered from R2.
- Staging: re-run the exact 889 MB / 699 s case and compare bytes read from R2 against the three full reads it costs today.

---

## Unit 8, Boundary-encode trim and proportional verification

**Changes**

- `recipes.py`: `plan_recipe`, `boundary_trim`, `verify_proportional`, and the `derived-v2` proof recorded in R2 `customMetadata`, checked against the GOP proof stored in unit 7.
- The Worker's independent verification accepts `derived-v2` by checking the ancestor digest and the copied-span digests.
- `recipe_escalated` fires when a trim falls back to `full-encode`.
- Before the recipe is pinned: measure the keyframe cadence of real recorder output on staging, because it sets the boundary-GOP cost and the clip budget.

**Deletes (same PR)**

- The `not trimmed` gate on stream-copy in `playback.py:153`.
- `try_smart_concat`, `run_full_reencode` and `probe_video_keyframes` as dead legacy-route code, replaced by the live boundary path.

**Verification**

- A Python test that a trim on keyframe boundaries re-encodes zero interior seconds and that the output decodes end to end.
- A test that a corrupted copied span fails verification and is never published; the publication invariant stated as a test rather than as a decode pass.
- Staging: trim an 11-minute recording and record the clip's wall time against the 2 m 6 s budget.

---

## Unit 9, Speculative client fill of the poster slot

**Changes**

- `PUT /v1/fill/<outputKey>` with verify-then-accept; `derivations.fill` on the facade.
- The recorder uploads its captured JPEG into the poster's content-addressed key instead of PATCHing `poster_url`.

**Deletes (same PR)**

- The `poster_url || thumbnail_url` stand-down guard in `ensurePosterForVideo`, the reason the first server poster attempt raced the recorder's PATCH, lost, and stranded its row.
- `poster_url` and `thumbnail_url` as client-writable metadata fields.

**Verification**

- A test that an unverifiable fill leaves the slot owed and the server recipe runs.
- A test that a verified fill publishes with `producedBy: 'client'` and that the server never starts a duplicate operation.
- Staging: record a session and show the poster live within the 20 s budget with no container operation at all.

---

## Guards that make "never again" structural

Each of these lands with the unit named, as a test, a lint or a type, not as prose.

- Unit 1: a CI grep that fails if any caller string-matches a producer response body.
- Unit 2: no writer of `preparation_status` exists; readiness is a pure function with a regression test shaped like the incident.
- Unit 3: `consumerGate` has exactly one gating kind, asserted by a unit test; every kind has a budget in the contract table, so a kind without a budget does not compile.
- Unit 6: a test that every record has a live instance or an `orphaned` alert; no `schedule*`/`ensure*` pair exists.
- Unit 8: a container test pins the clip's cost class to `boundary-encode` on a long fixture, so a recipe change that re-encodes the whole file fails the test rather than a customer.
