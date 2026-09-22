NOT VERIFIED for production. Staging is commit 03ba3ec6; source files are unchanged.
Chrome was used; Chromium fallback also found no camera or microphone. macOS lists only speakers.
Upload, basic playback, poster selection, title persistence, statistics, CTA and recovery worked in supplementary checks.
Biggest risks: untested real-media pipeline, one legacy video returning 403, and recording allowed without inputs.
Stop-to-playable: 25 s = blocked; 45 s = blocked; 4 min = blocked. No legitimate timings exist.
Measured: 55 KB upload playable in 40.8 s; substitute trim save 2.85 s; recovery 6.38 s.

| Flow | Result | Deciding observation and timing |
|---|---|---|
| A Login/library | Pass | Real two-step form worked; library loaded within 11.4 s, an upper bound. Three HTTP 401 console errors during sign-in/load. |
| B Camera 25 s | Blocked | Chrome and Chromium return NotFoundError. No orientation, audio or real-picture proof. App nevertheless saved a 16 s blue-background take. |
| C Screen 45 s | Blocked | Screen selection returns NotReadableError, “Could not start video source”; UI silently keeps “Record camera.” Observed after 3.03 s. |
| D Composite | Blocked | 1/3 split and Camera inset are offered; missing camera and failed screen capture prevent testing. |
| E Four minutes | Blocked | No real input available. The most important latency gate remains untested. |
| F Trim | Partial | Substitute 16 s take: 3–10 saved in 2.85 s; immediate duration 7 s; reopen retained handles/full 15.94 s timeline. Widen 1–13 saved in 3.38 s and played to 12.04 s. Restore returned 16 s. Exact requested ranges unavailable. |
| G Poster | Pass, substitute | Uploaded fixture’s selected 2 s frame matches card/public page. |
| H Metadata | Partial | Renamed upload persisted after reload. No video-description field found; description persistence unverified. |
| I Prospect | Partial | Fresh context: first observed playback 1.22 s; reached end; blue accent, four speed choices, 1.5× and fullscreen worked; no PiP button. Rendered at 1440/390 px. Seeking/mobile speed coverage incomplete. No CC after 90.35 s, but no microphone audio existed. |
| J Editor/CTA | Fail | Preview plays with different controls from public Mux player. CTA persisted, published and opened Example Domain. |
| K Statistics | Pass | Three 100% prospect views and retention curve visible; journey stats show one CTA click. |
| L Upload | Pass, slow | File picker, editor/tests/fixtures/trim/bframes.mp4, 56,396 bytes. Poster 40.24 s; playable 40.81 s. |
| M Older videos | Fail | May 21 recording, 31 s: media error 4, files.clarity.video HTTP 403. Another May recording, 48 s: plays from media-staging.clarity.video, observed at 1.64 s. Existing share pages untested. |
| N Download | Fail | Today’s recording → More → Download twice: no file; first attempt observed for 15 s. |
| O Interruption | Partial | Empty-input take closed at 15 s; recovery offered 14 s/0.8 MB and completed in 6.38 s. Real-camera recovery untested. |
| P Delete | Pass, UX defect | Deleted three videos and one journey; library returned to 241 videos. Journey link says Page not found. Recording link is blank HTTP 200, without player. |
| Q Safari | Partial | Real Safari controlled through AppleScript accessibility. Playback seek advanced from 12.6% to 80.2%. Camera recording blocked by absent hardware. |

Bugs and reproduction:

1. Open Record with no input devices → Record camera → wait → Stop. A blue-background video saves despite the missing-input error.
2. Library → May 21, 31-second Untitled Video → Play. Playback fails; its files.clarity.video asset returns 403. This may be a staging media-signing issue; this run does not establish a migration regression.
3. Today’s recording → More → Download. No download appears on either attempt.
4. Uploaded video → Share → editor preview → Play, then play public link. Controls differ; editor uses the direct MP4 player.
5. Delete a recording → reopen its direct share link. Blank HTTP 200 instead of an unavailable-page message.

UX notes: screen-capture failure needs a visible explanation. Upload preparation took about 41 seconds for a tiny file. Missing hardware prevents acceptance of speech, captions, image orientation, screen legibility and long-recording latency. Rerun those gates on a Mac with working inputs before promotion.

Gallery: https://willayam.github.io/clarity-design-previews/acceptance-mux-2026-09-23/
Screenshots: .audit/acceptance-mux/*.png, all captioned in index.html. Notes/timings: notes.json. Unrelated people, locations and desktop content are redacted.
