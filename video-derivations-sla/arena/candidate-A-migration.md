# Migration: today's pipeline to the derivations module

Ordered PR-sized units. Each lands on main with its callers migrated and its legacy path deleted in the same unit (migrate-callers-then-delete); each ends in a state a reviewer can verify with the named check. D1 changes are additive only (columns and new tables; never a rebuild). Deploy note per repo rule: main-push stack deploy applies D1 migrations before the router upload, so additive migrations ride their code PR.

## Unit 1 — Derive video readiness from derivation records; delete `preparation_status`

The first unit, precisely: introduce `projection.ts` (pure fold + `DerivationsSummary`) and `readDerivationsSummary`/`derivationsPending` in `served-file-policy`, refresh the stored summary inside the four existing settle paths, migrate all readiness readers to it, and delete every `preparation_status` writer and reader.

- **Changes:** `projection.ts` with a staging `expectedKindsFor(metadata)` (static kind set: faststart + poster + gif + transcript, + clip when `current_render_digest` is set) standing in for `plan.ts` until unit 4; a `refreshDerivationsSummary(db, node)` helper called from `publishFaststartMetadata`, the clip settle (`completeRenderJobWithProducer`), the poster/gif publish, and the transcript settle — inside their existing D1 batches; editor `workspaceTreeHasPendingRender` → `derivationsPending`; `HomeTreeRoute` chip and the public page chip → summary phase; `preparation-audit.ts` reclassified over the fold. One-off backfill: a bounded sweep pass stamping summaries for all existing video nodes.
- **Deletes:** the four `preparation_status` writers (`video-acceptance.ts:240` birth write, `durable-faststart.ts:183-197` conditional, both `recovery_required` writers' status field (kept as a summary-visible failure instead), the `reset_trim` branch write); `preparation_status` from `SERVER_OWNED_ACCEPTED_VIDEO_METADATA_FIELDS`; every reader of the field (editor query, card chip, audit).
- **Verify:** the explorer's count query (`preparation_status='processing' AND render_status='succeeded'`) drops to zero after backfill and cannot repopulate (grep proves no writer remains); a staging recorder upload + immediate trim reaches `phase: ready` when the clip publishes; the Library tab stops re-polling on a settled node (editor test on `derivationsPending`); root `pnpm test`.

## Unit 2 — SLA ledger and the one kind-blind sweep

- **Changes:** additive migration `derivation_sla_events` + `budget_ms` column; `sla.ts` with per-kind budget constants (observe-only alert query for the first bake window); publish/terminal-failure events written in the settle batches; `sweep.ts` replaces the three per-kind catch-ups with one records-wide eligibility query on the existing crons (every-minute liveness leg, every-5-minute audit leg with breach backstop and summary re-fold/compare); AE dataset `clarity_derivation_sla`.
- **Deletes:** `clipRenderCatchUp`, `faststartCatchUp`, `transcriptCatchUp` and their scheduled-handler wiring; the `just _workspace-tree-rearm-failed-posters` manual recovery recipe; the "no cron sweep covers posters" comment and the condition it documented.
- **Verify:** staging fault drill — hold the container busy (long synthetic operation) past the poster budget: exactly one breach row + AE point appears within one sweep period, and the poster still publishes afterwards; a parked `failed_recoverable` poster row from before the PR is revived or terminally recorded by the sweep; publish events carry sane elapsed values for a fresh upload.

## Unit 3 — Typed admission and lanes: one capacity meaning

- **Changes:** container `lanes.py` (1 bulk, 2 bounded, 4 interactive; typed `Refusal(retry_after_s)`) replacing `PROCESSOR_LOCK` at every route; producer responses become the admission envelope (`admitted: false` + `retryAfterMs`; the human-readable error string stays as a field, so a mixed-version deploy window still parses); TS callers parse `AdmissionDecision` in one place and respond with wait-plus-alarm uniformly.
- **Deletes:** `isProcessorCapacityFailure` string matching; `deferForCapacity` and its attempts-refund SQL; the clip/faststart `status === 'processing'`-means-busy overload and their 429/503 `markFailed(recoverable)` branches; the flat 10-minute capacity lockout this caused.
- **Verify:** staging 11-minute recorder upload with immediate trim — poster publishes < 30 s and transcript audio is admitted while the faststart bulk op runs (AE timings show interleaving); no job row ever shows `failed_recoverable`/`attempts=0` with the capacity string after the deploy (D1 query); Python lane tests: interactive never refused, bulk refusal carries an honest hint.

## Unit 4 — Plan + supervisor drive the background kinds

- **Changes:** `plan.ts` (identities, budgets, manifest slices; replaces unit 1's `expectedKindsFor`), `records.ts` (additive `generation` column; claim-after-admission), `producer-client.ts`, `supervisor.ts` DO (new wrangler DO migration tag) driving poster, preview, audio, transcript; acceptance handler and outbox redelivery call `ensureCurrent`; client-captured poster becomes `manifest.posterOverride` (plan desires no poster) instead of a metadata guard; `audio` becomes a persisted content-addressed artifact; the transcript provider call moves to the supervisor alarm, gated on audio published.
- **Deletes:** `schedulePosterForVideo`/`ensurePosterForVideo`/`posterRenderIntent` (the moving served-URL digest dies with it), `scheduleGifForVideo`/`ensureGifForVideo`, `scheduleTranscriptForVideo`/`driveTranscriptJob`, their kick shapes in `ClipRenderDriver`, the `poster_url` stand-down guard, and re-extraction of audio on transcript retry.
- **Verify:** staging recorder flow — poster/preview/transcript publish inside budget with zero orphaned rows (`generated_video_outputs` shows one row per planned identity, all settled); killing the supervisor DO mid-run (eviction) recovers via the sweep within one period; grep proves the deleted ensure chain is gone; identity unit tests pin that a clip publish does not re-identify the poster.

## Unit 5 — Supervisor owns clip + faststart; one driver total

- **Changes:** faststart and clip become supervisor-driven operations (`durable-faststart.ts` ensure and `render-jobs.ts` completion logic fold into reconcile + producer client); the trim route becomes `applyEdit` (manifest write; `POST /render/jobs` answers from `readReadiness` during the same PR's editor migration to readiness polling, then the route is deleted); uniform leases for every kind.
- **Deletes:** `ClipRenderDriver` (wrangler DO class deletion migration), `durable-faststart.ts`, the clip enqueue-then-kick path and `clip-render-driver`'s per-kind delay table, `render-job-client`'s 60 s poll timeout path, the per-poll signed HEAD probe of the source.
- **Verify:** full accept → trim → publish staging run driven end to end by one DO (logs show a single driver); renders occur only in container operations reached from alarms (grep: no producer call outside supervisor/sweep); the 2026-07 incident constraint re-checked (no render in `waitUntil`); root `pnpm test` plus workers tests.

## Unit 6 — Operation sets, source cache, parallel upload, closed telemetry hole

- **Changes:** producer `/v2/operations` set protocol (`producer-worker-operations.ts`), container `source_cache.py` with single-flight download and intermediate registration, parallel multipart (concurrency 8) / single-shot upload in `handleVideoOutputUpload` + `operation_storage.py`, per-phase timing emission for every operation, `releaseSet` on generation settle.
- **Deletes:** per-operation `TemporaryDirectory` re-download of the same source; the strictly sequential part loop; the `/v1/{faststart,clips,posters,gif,audio}` per-format routes once the supervisor speaks `/v2` (same PR).
- **Verify:** staging 889 MB fixture — worker logs/AE count exactly one R2 source GET across faststart + clip + audio for one generation; faststart wall time drops to the ~90 s target band with the upload phase visibly parallel in timings; re-running a settled operation answers `complete` from R2 without container start.

## Unit 7 — Keyframe-cut trim and composed verification

- **Changes:** `trim.py` (`read_keyframe_table`, `plan_keyframe_cut`, `render_trim_composed`, `verify_composed`), clip recipe bumped to `clip-composed-v2` (content-addressed cache bust by construction), worker verification accepts the `composed-v2` stamp, clip cost class becomes `bounded`, clip budget tightens to its flat value.
- **Deletes:** the `not trimmed`-gated always-re-encode branch for clips; the unreachable legacy `/v1/render` smart-concat/keyframe code (`app.py` clip paths) — superseded, not resurrected; the held-frame regression test moves to the boundary-decode invariant.
- **Verify:** parity harness on real recorder fixtures — cut frames compared at joins (held-frame case included), duration within tolerance, playback in Chromium/Firefox/WebKit; measured: an 11-minute trim publishes ≤ 60 s after faststart readiness and `verify` time scales with `reencoded_seconds` (timings emitted per phase); full-decode spot-check job on a sample of composed outputs during the bake window.

## Unit 8 — Client poster as speculative slot fill

- **Changes:** the recorder's client-captured poster uploads as a speculative fill of the planned poster identity (verify-then-accept, vision I8 seed): verified → the slot publishes it; absent/invalid → the server recipe runs. `posterOverride` remains for explicit user thumbnail choice.
- **Deletes:** client-writable `poster_url`/`thumbnail_url` (become server-owned aliases); the last client/server dual-writer race on video metadata.
- **Verify:** recorder save on staging shows a poster within perception threshold (client fill) and the record settles verified; a tampered client poster is rejected and the server poster publishes inside budget; PATCH surface tests prove the fields are server-owned.

## Sequencing rationale

Observation first (units 1–2) so every later unit's effect is a number on an existing dashboard; capacity next (unit 3) because it is the largest measured latency term with the smallest blast radius; then the driver consolidation (4–5) that makes the liveness invariants structural; then the producer-side cost work (6–7) whose wins the SLA ledger can now prove; the speculative fill (8) last because it rides the verified-slot machinery. Deliberately not done: outbox fast-path delivery (redelivery is a harmless idempotent `ensureCurrent` replay; its 5-minute cadence stops mattering once acceptance is not the only kick), and any change to `resolvePlayback` precedence.
