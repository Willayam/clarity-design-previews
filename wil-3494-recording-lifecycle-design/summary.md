# WIL-3494 design: the server owns every recording

Linear: [WIL-3494](https://linear.app/cocco/issue/WIL-3494/server-owned-recording-lifecycle-and-a-typed-videos-table). Status: **waiting for your sign-off**. No migration or code PR starts until you approve it.

## The decision

Today the browser tab runs the recording's transaction. The server only learns a take exists when the tab claims it after Stop, so every closed tab, dropped request or race leaves a stranded take or an error on screen.

This design flips that around:
- **The server creates the video when you press Record.** The video, its Library entry and its share page are created in one database transaction. A take therefore always has its link, or nothing exists at all.
- **Facts get their own table.** What Mux and the server know (upload, asset, readiness, duration, poster, clip, timestamps) moves from a 169-key JSON blob into a typed `videos` table that no browser request can write. The JSON keeps only what the rep edits.
- **One module owns the lifecycle.** A module with five methods (grant, finish, observe, settle, discard) decides every state change through one tested state table. The webhook, read-time settling and a nightly Mux inventory all feed that same table.
- **The recorder becomes thin.** It keeps a take's bytes on disk until the server says the video is ready. The only message it can still show is "Couldn't upload your recording", and only when Mux rejected the content, with no dead-end Try again. Everything else retries quietly, and the browser's own "Leave site?" prompt is the only warning, shown only while closing would lose work.

## What reps notice

Nothing new on screen. The share-link, save and size errors are already gone (shipped today: [#900](https://github.com/Clarity-Video-HQ/clarity/pull/900), [#901](https://github.com/Clarity-Video-HQ/clarity/pull/901), [#903](https://github.com/Clarity-Video-HQ/clarity/pull/903), [#902](https://github.com/Clarity-Video-HQ/clarity/pull/902); see the [states page](https://willayam.github.io/clarity-design-previews/record-video-states/)). After this program, a closed tab, a lost connection or Mux being slow no longer strands a take. The upload error appears only for content Mux cannot use.

## What you are approving

- **A schema change to the videos data.**
  - A new `videos` table and a rebuilt `jobs` table, so clips and Mux deletions become retried jobs.
  - A backfill of 7,515 production videos, gated on zero differences.
  - A final shrink of the old JSON. Every row's original JSON is archived first, and the shrink is blocked if any of the 169 keys is unmapped.
- **Nine stacked PRs, expand then flip,** each proven on staging. Effort is about 33 to 51 engineer-days. Old tabs keep working for their 7 days, and old recovery journals keep working indefinitely.
- **A nightly Mux inventory** that reports only, until you have seen a week of its reports. After that it deletes orphaned Mux objects tagged with its own environment.

## Questions only you can answer

1. Should a take still being recorded show in the Library? The default is yes, as "processing".
2. When Mux rejects a take, should the recorder drop the stale detail line ("It's still safe in this tab. Check your connection...") and the Try again button? That removes copy, it doesn't add any.
3. How long should an upload stay open? This needs a probe of Mux's timeout before PR 5. A 12-hour take needs about 13 hours.
4. When should never-finished takes be swept? The default is 14 days.
5. When should the inventory delete, and what happens to preview environments? The default is after two completed scans plus 48 hours, and never for untagged objects.
6. Should the poster be the browser's frame grab or Mux's still? The black-poster history argues for Mux.
7. Where should a failed trim clip show outside the recorder, using existing copy?
8. Analytics: count a video as added when it is finished (this design), or at Record?
9. Should a 403 count as a terminal rejection or a pause?

## How the design was made

1. An investigation mapped today's flow, the 12 ways a take strands, the data and the open tickets (section links below).
2. Three models designed it independently: Fable, GPT-6 Astra and Opus.
3. A cross-judge scored them. I based the synthesis on the smallest sound design (Opus) and grafted in Astra's correctness fixes.
4. Three models then reviewed the result adversarially. They agreed on five real defects, and the revision fixes all of them (see "Interrogate review" below).
5. A recheck confirmed 17 of 23 items fixed and none missed. It found one new defect in the order the grant checks for retries, which is now fixed, along with five partial items.

The full design follows. The type sketch is at the bottom.
