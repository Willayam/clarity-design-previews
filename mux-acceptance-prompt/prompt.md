You are doing a rigorous, human-style acceptance test of a video product on the user's MacBook, in a visible browser, with the REAL camera and microphone. The user is watching and will not touch the mouse. Be thorough and blunt. Do not modify source files. Write notes, timings and screenshots under .audit/acceptance-mux-macbook/ in the working directory (create it). At the end, write an index.html there that embeds every screenshot with a caption and publish it with `bash scripts/publish-artifact.sh .audit/acceptance-mux-macbook acceptance-mux-macbook-2026-09-23 "Mux acceptance on the MacBook"`; put the URL in your report.

Target: https://staging.clarity.video (check /__deploy-info and record the commit). Login through the real form with the QA account from .env.e2e.local in the working directory (E2E_QA_EMAIL / E2E_QA_PASSWORD; read the file, never print the values). If that file is missing, stop and say so.

Browser: headed Google Chrome via Playwright with `channel: 'chrome'` and ONLY the flag `--use-fake-ui-for-media-stream` (auto-accepts the permission prompt; the real camera and mic are used) plus `--auto-select-desktop-capture-source="Entire screen"` for screen recording. Do NOT use --use-fake-device-for-media-stream. If Chrome cannot open the camera, say so and stop; do not fall back to fake devices. Install Playwright if needed (`npm i -D playwright` in a scratch dir is fine, or `npx playwright install chrome`). Give speech to the microphone by running macOS `say -r 170 "..."` with distinct sentences (include the words "Clarity", "Mux migration" and "twenty three") during each recording, with system volume audible.

Flows, each with pass/fail, the deciding observation, stopwatch timings (Date.now around the action) and a screenshot:

A. Login and library load.
B. Camera recording, 25 s, with speech. Stop → time until the card shows a poster and plays. Play in the app: first frame time, seek to the middle, speed 1.5x, fullscreen and back. Is it the real camera image, right orientation, audio present?
C. Screen recording, 45 s, with speech: record the screen (picker auto-selected). Same checks, plus small-text legibility.
D. Camera + screen composite ("1/3 split" or "Camera inset"), 30 s, with speech. Same checks.
E. A long recording: 4 minutes camera with speech (run `say` a few times). Stop → time to playable. Anything over 20 s to playable is a finding.
F. Trim the 45 s screen recording to 8→30 s: time the save; play the card immediately with no reload; reopen Edit → Trim: full timeline, handles at 8 and 30; widen to 5→40; Restore.
G. Share the camera recording: publish the journey page, open the link in a fresh incognito context as a prospect: brand accent colour on the player, speed menu 1/1.25/1.5/2, no picture-in-picture button; play to the end; seek; wait up to 90 s for a CC/captions button and turn captions on: do they show the words you spoke? Screenshot the captions. Repeat at 390 px width.
H. Statistics: open the camera video's stats; your prospect views must appear with watched percentage and a retention curve.
I. Download the camera recording (More → Download): a playable MP4 of ~25 s arrives.
J. Robustness: start a 30 s camera recording and close the tab at ~15 s. Reopen the app: follow the recovery prompt; report what you get.
K. Delete every video and page you created; confirm the library and the share links.
L. Safari: with macOS automation (osascript / System Events) open the share page from step G in real Safari and play it; then try one 20 s camera recording in Safari. Report honestly if Safari cannot be driven.

Report: a 6-line summary first (works / does not work, biggest risks, and stop→playable for 25 s, 45 s, 30 s composite and 4 min), then a table with one row per flow, then bugs with exact reproduction, then UX notes, then the gallery URL and screenshot paths. Under 900 words.
