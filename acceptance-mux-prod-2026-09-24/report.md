Production commit 3ab17550: core recording and Mux playback work, with acceptance gaps.
Stop → playable: 25 s camera 11.67 s; 45 s screen 9.67 s; 30 s composite 10.54 s; 4 min camera 13.22 s.
Without reload: all four became ready and played Mux-backed video, verifying production delivery end to end.
Biggest risks: intermittent capture startup, premature Open page, and missing mobile speed controls.
Trim, captions, statistics, download and recovery worked; Safari recording was permission-blocked.
Cleanup: eight videos and eight pages removed; six share URLs return 404, two persistently return 503.

| Flow | Result and deciding observation | Timing | Screenshot |
|---|---|---|---|
| A | Pass. Real form login and existing library loaded. | Login 0.63 s; library observed within 12.37 s afterward. | A-library.png |
| B | Pass. Real, correctly oriented playback; seek, 1.5×, fullscreen/back. AAC and spoken captions confirm audio. | Repeat stop→play 11.67 s; first frame 1.81 s. | B-repeat-card.png |
| C | Video checks pass. Screen, seek, speed, fullscreen and small text work. Audio not independently listened to. | Stop→play 9.67 s; first frame 1.33 s. | C-legibility.png |
| D | Video checks pass. Real camera and desktop occupy the split layout; controls work. Audio not independently listened to. | Stop→play 10.54 s; first frame 1.17 s. | D-fullscreen.png |
| E | Pass on repeat. Verified 240.05 s duration and actual Mux playback. | Stop→play 13.22 s; poster 10.91 s; first frame 2.31 s. | E-repeat-card.png |
| F | Pass. 8→30 plays immediately; reopening retains full 45 s timeline and handles. 5→40 persists; Restore works. | Save 3.45 s; widen 4.39 s; restore 0.86 s. | F-reopen.png, F-widen.png, F-restored.png |
| G | Partial. Fresh prospect context plays through, seeks, matches blue #2563eb, offers desktop speeds 1/1.25/1.5/2, and has no PiP. Captions show Clarity, Mux migration and 23. Speed control absent at 390 px. | Captions already available when checked; generation latency not measured. | G-marker.png, G-mobile-controls.png |
| H | Pass. Three generated views show 100%, 100%, 96% and a retention curve. | Stats opened in 1.27 s. | H-statistics.png |
| I | Pass. Downloaded MP4 plays locally and fully decodes: H.264/AAC, 24.987 s. | Download 2.52 s. | I-download.png |
| J | Pass. Closing only the tab preserves a recoverable 14 s clip. Recovery prompt appears in the recorder. | Closed at 15.23 s; recovery preview 0.05 s. | J-recovery-prompt.png, J-recovered.png |
| K | Partial. My items are gone. All eight links deny access; two return 503 rather than 404, including cache-bypassed retries. | Video deletion 6.01 s. | K-pages.png, K-videos.png, K-share-c6xsg9.png |
| L | Partial. Real Safari plays the share and captions; native login succeeds. Camera/mic permission prompt means recording skipped. | Playback timing not captured. | L-safari-play.png, L-permission.png |

Bugs and reproduction:

1. At 390 px, open the prospect video and reveal controls. Playback speed disappears; desktop has all four speeds.
2. Stop a long recording and immediately click Open page while Preparing link remains. It returns “Unable to open the page. Try again.” The button should wait for readiness.
3. Enter the recorder and change to Screen only or 1/3 split before device setup settles. This run intermittently returned “Could not start video source” and reverted layout. Waiting for camera setup and retrying succeeded. Browser/OS involvement remains possible.
4. After deleting the composite and repeated short-camera pages, /page/c6xsg9 and /page/6zk8d6 persistently return 503 “Page temporarily unavailable.” Six other deleted links return 404.

UX and evidence limits:

The real camera probe reached its first frame in 2.05 s. Initial app spinner versus blank state was not reliably captured. Preview is mirrored; saved playback is unmirrored. At the supplied 1800×1168 logical screen capture on a 3024×1964 display, 16 px text is readable and 12 px text is soft but decipherable. Output is 1920×1080.

Captions misheard “camera acceptance” as “camera exceptions.” Recovery should be surfaced on Home. Earlier silent fallback did not reproduce because an error appeared. Saving a never-framed camera stream was not rigorously reproduced under the required wait-for-frame protocol.

Timings include normal save/navigation/naming actions. Camera and long timings use verified repeat runs. The earlier 34.39 s long result selected the wrong short clip and is explicitly invalidated in the notes. No source files changed.

Gallery: https://willayam.github.io/clarity-design-previews/acceptance-mux-prod-2026-09-24/

Screenshot paths: .audit/acceptance-mux-prod/<filename above>. index.html embeds every PNG with a caption; notes.json contains timings and corrections.
