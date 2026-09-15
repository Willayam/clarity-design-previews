# Migration to the derivation ledger

Every unit below is intended to merge independently. A unit first migrates all callers in its stated slice, then deletes that slice's legacy path in the same PR. Compatibility adapters may exist only while another named caller still uses them; no PR lands a second durable truth or an unused replacement. All schema work is additive: `CREATE TABLE`, `CREATE INDEX`, and `ALTER TABLE ... ADD COLUMN` only. `workspace_nodes`, `generated_video_outputs`, and `video_lifecycles` are never rebuilt.

## 1. Current-generation derivation projection replaces `preparation_status`

This is the precise first unit.

Changes:

- Add `video_source_sets`, `video_manifests`, `video_derivation_demands`, and `video_derivation_sla_events`. Add `original_accepted_at` and `current_manifest_revision` to `video_lifecycles`; add nullable recipe/verification/deadline columns to `generated_video_outputs`. Preserve its unique `(node_id, kind, input_digest)` index.
- Add the planner and pure projection. Acceptance writes the source set, manifest revision 1, and exactly five demand rows in the same batch as the node/lifecycle/faststart slot. Optional Clip or looping-preview demands are explicit `not_applicable`, never absent.
- Introduce `VideoDerivations.acceptOriginal` and batched `read`. Migrate the acceptance handler, Workspace Tree list/asset/card reads, the public-video payload, and the editor tree DTO to the projection. Playback URL resolution may adapt existing ready output aliases in this unit, but readiness comes only from current-generation demand/output rows.
- Backfill current lifecycle generations idempotently in bounded batches. Historical metadata is input to the one-time adapter only, never read after a demand set exists.

Deletes:

- Delete every write of `preparation_status` and `preparation_error` from acceptance, faststart, Clip settlement, and Reset Trim.
- Delete preparation-status audit classifications and the editor's `workspaceTreeHasPendingRender` inspection of `preparation_status`, `playback_status`, and `render_status`. The editor polls only the projected `refreshAfterMs`.
- Stop exporting preparation fields in new Workspace Tree/public DTOs. Old JSON keys may remain inert in stored metadata; no table or JSON blob is rewritten just to remove them.

Verification:

- Repository/projection fixtures cover all five rows, `not_applicable`, a missing-row `configuration_gap`, terminal failure, and prior lifecycle generations being ignored.
- Replay the incident shape: faststart published before Clip, then Clip published. Both snapshots project playable; the latter projects settled and never returns a perpetual refresh instruction.
- Acceptance replay is idempotent and atomically yields a node plus five demands. Owner projection selects the authorized Original before any derivation publishes; viewer projection never leaks its private locator.
- Migration checks prove only additive schema statements and preserve out-of-repository child-table references.

## 2. Persist and alert every SLA deadline

Changes:

- Ratify `derivation-sla-v1` in the single policy module and snapshot each budget/deadline onto demands.
- Add the deadline alarm path and the all-kind awaited cron scan. Both use the same CAS to insert one `video_derivation_sla_events` miss, emit the alertable telemetry point, and acknowledge its outbox row only after delivery.
- Expose policy version, queue time, run time, verify time, publish time, and breach reason in telemetry for the existing rows; later lane units reuse this contract unchanged.

Deletes:

- Delete the legacy stuck-render scan and its hand-maintained status/age interpretation.
- Delete kind-specific “old enough to be suspicious” alert thresholds; deadline policy is the sole threshold.

Verification:

- Fake-clock tests prove exactly-once miss recording at the deadline, recovery after a lost alarm via cron, no miss for on-time publication, and a classified immediate miss for demand created after its deadline.
- Telemetry failure leaves the D1 miss queryable and retryable; duplicate alarm/cron execution does not duplicate the event.

## 3. Poster is the first unified light-lane vertical slice

Changes:

- Add `media_operation_sets` and the dispatch-lease fields/indexes needed for queued work by `cost_class, next_attempt_at`.
- Implement the typed producer `advance` adapter, the capacity broker, a reserved light pool, asynchronous operation-set observation, single/parallel output storage, and the all-kind coordinator for the poster recipe. The coordinator orders due work by frozen deadline from its first live caller.
- Derive poster identity from Original identity plus the poster/trim manifest slice. Render directly in source coordinates; it never depends on a Clip URL.
- Migrate acceptance, thumbnail selection, source replacement, and card/public projection to the poster demand/slot.

Deletes:

- Delete `schedulePosterForVideo`, `ensurePosterForVideo`, `posterRenderIntent`, poster metadata CAS publication, and the poster branch/payload in `ClipRenderDriver`.
- Delete the synchronous producer `/v1/posters` path after its final caller moves to the operation-set adapter.

Verification:

- With heavy capacity saturated, a poster is admitted on light capacity and publishes inside its contract.
- A fully busy light pool returns typed `deferred`; the row stays queued, attempts do not increment, the lane alarm remains armed, and cron can recover it.
- A stale poster receipt fills only its content-addressed slot and cannot publish over a newer manifest revision.

## 4. Looping preview joins the light lane

Changes:

- Add the bounded looping-preview recipe and its `loopingPreview` ↔ persisted legacy `gif` storage adapter.
- Migrate preview-range edits and acceptance defaults to `VideoDerivations.applyEdit`; the planner alone decides invalidation and address.
- Publish the projected looping-preview URL from the current demand.

Deletes:

- Delete `scheduleGifForVideo`, `ensureGifForVideo`, `gifPreviewRange` orchestration, GIF metadata publication, and the GIF driver branch.
- Delete the synchronous producer `/v1/gif` path.

Verification:

- Range changes create a new address; reverting to a previous range reuses its verified slot.
- Invalid or absent ranges produce an explicit `not_applicable` demand and no driver work.
- Heavy saturation cannot delay the recipe; light-capacity deferral has the same state transition as poster.

## 5. Transcript joins the light lane as one derivation

Changes:

- Add a transcript operation-set recipe: the no-internet container extracts audio from the shared staged input, while the producer Worker invokes the configured provider and returns a schema-validated transcript receipt.
- Persist transcript payload and publish its demand in the same fenced Workspace Tree transaction. Give every transcript attempt the same dispatch/run leases as every other kind.
- Migrate transcript reads to select the current demand's receipt rather than metadata digest/status.

Deletes:

- Delete `scheduleTranscriptForVideo`, `ensureTranscriptForVideo`, `driveTranscriptJob`, `transcriptCatchUp`, transcript metadata pointer writes, and the transcript branch in `ClipRenderDriver`.
- Delete the synchronous byte-buffering `/v1/audio` caller/response contract; audio stays private and internal to the operation set.

Verification:

- Capacity deferral consumes no attempt; an infrastructure/provider failure does. A stale lease cannot cause two published provider results.
- No-audio and over-provider-limit inputs terminate explicitly and project degraded rather than poll forever.
- Poster can publish before a long audio extraction in the same light set, and neither waits for heavy capacity.

## 6. Faststart moves to heavy operation sets and creates reusable source proof

Changes:

- Implement heavy-pool admission and the faststart operation-set recipe. Stage each Original once per set, produce the progressive MP4, build/store the verified GOP/source proof, and return an independently validated receipt.
- Migrate acceptance/catch-up to the unified coordinator. Project faststart playback directly from the current demand and verified slot; Original owner playback remains available throughout.
- Record all heavy operation phase timings through the same telemetry as light work.

Deletes:

- Delete `durable-faststart.ts`, faststart ensure/catch-up/scheduling code in `generated-video-capabilities.ts`, faststart driver payload/branch, repeated source HEAD polling, and faststart metadata publication fields.
- Delete the legacy `/v1/faststart` route after the operation-set adapter is its sole caller.

Verification:

- Compatible input remuxes without video re-encode; incompatible input takes an explicit full-transcode recipe.
- Poll/observe calls perform no repeated input HEAD/download work, container death is retried idempotently, and a receipt cannot be constructed for a corrupt, mismatched, or partially uploaded object.
- The 889 MB incident fixture records an SLA miss if it crosses 120 s, with queue/run/verify/upload attribution instead of silence.

## 7. Replace Clip production with boundary-GOP rendering

Changes:

- Route the existing Clip producer call through the new heavy operation-set contract before changing its caller.
- Implement keyframe/GOP planning, boundary-only video/audio re-encode, proven interior packet copy, timestamp normalization, join-window decode, source-proof matching, progressive-index/duration/codec checks, and whole-output hashing.
- Add streaming single PUT below the safe threshold and bounded parallel multipart upload above it; independently verify the stored receipt in the Worker.

Deletes:

- Delete the durable path's unconditional full-length `encode_playback` trim branch and full-output decode verification for proof-backed copied spans.
- Delete the unreachable legacy `/v1/render` smart-concat implementation once its useful behavior is covered by the new recipe; retain no second trim algorithm.
- Delete sequential output-part upload.

Verification:

- Fixtures cover keyframe-aligned cuts (zero boundary groups), two-boundary cuts, sparse screen frames, audio joins, incompatible-codec fallback, and duration tolerance.
- Corrupt source proof, copied packet, boundary encode, join, part, manifest, or stored object is rejected before a verified receipt exists.
- Instrumented integration asserts one input staging/fetch per source per operation set and concurrent—not sequential—multipart parts.

## 8. `applyEdit` owns Clip intent and atomic Current playback publication

Changes:

- Migrate the trim/edit route and editor save flow to `VideoDerivations.applyEdit` with expected manifest revision and idempotency key. Return the owner source plus live Edit metadata immediately.
- Plan the Clip address from source set + Clip manifest slice + recipe version, drive it through the unified heavy lane, and atomically publish only when lifecycle generation, manifest revision, artifact digest, and attempt fence still match.
- Make public pages, cards, downloads, and editor playback consume the projected Current playback URL. While a current re-trim is pending they retain the preceding published Clip; Reset Trim deliberately selects the untrimmed faststart rather than the prior Clip.

Deletes:

- Delete `render-jobs.ts`, `render-job-codec.ts`, `clip-read-model.ts`, `clip-render-driver.ts` (its final remaining branch), the legacy `media-artifact-producer-client.ts`, and all `current_render_digest`, `render_status`, and stable served-URL metadata writers/readers.
- Delete the editor's 500 ms render-job polling/60 s timeout path. Saving an edit is complete when the manifest commits.
- Delete the legacy `/render/jobs`, `/render/warmup`, and `/v1/clips` compatibility routes after their callers move.

Verification:

- A trim response meets the metadata-only latency target with no producer wait. The previous viewer URL remains byte-for-byte stable until the current verified Clip publishes, then all surfaces switch in one transaction.
- Concurrent edits enforce manifest CAS; late completion for revision N can fill a reusable slot but cannot displace revision N+1.
- Read projections agree for owner, Library, public page, and download without any metadata precedence code.

## 9. Collapse the compatibility shell and prove the capacity invariant

Changes:

- Move the remaining source/materialization callers onto `acceptOriginal` or `applyEdit`; finish bounded backfill of current source/manifest/demand rows and report any `configuration_gap` rows.
- Remove legacy-kind aliases from DTOs after a clean bake window. Keep persisted `generated_video_outputs.kind='gif'` mapping inside the repository adapter until a future additive migration can retire it safely.
- Load-test deadline ordering, lane isolation, operation-set grouping, and container loss in staging. Set light/heavy pool sizes from evidence without changing kind semantics.

Deletes:

- Delete `generated-video-capabilities.ts` and the obsolete metadata field allowlists/resolver branches left after the per-kind cuts.
- Delete legacy per-kind cron sweeps and manual poster rearm tooling. One coordinator alarm path and one all-kind cron sweep remain.
- Delete backfill-only metadata adapters after their census reaches zero; do not keep dual-read “just in case” code.

Verification:

- A staging saturation run demonstrates that heavy occupancy never reduces available light permits; every capacity refusal remains queued with an alarm and is found by cron.
- A source-set operation containing multiple recipes fetches each Original byte range at most once, and every published result has a validated receipt.
- Current-generation readiness for the production-shaped incident reaches settled or a recorded terminal/deadline state—never silent processing—and no caller reads the retired metadata keys.
