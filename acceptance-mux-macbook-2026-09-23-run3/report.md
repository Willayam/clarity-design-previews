Chrome recording, trim, recovery, statistics and download work; overall acceptance fails.
Biggest risk: Safari reports success for a blank recording with no audio track.
25 s camera: Stop to playable 8.65 s.
45 s screen: Stop to playable 8.30 s.
30 s composite: Stop to playable 6.89 s.
4 min camera: Stop to playable 14.29 s, below the 20 s limit.

Tested https://staging.clarity.video at commit `09a1d31da61c9d539e9bbf9268eeeb9cad2b89ad`. Chrome used Launch Services, CDP, real devices and the requested flags. No source files changed.

| Flow | Result | Deciding observation and timing |
|---|---|---|
| A Login/library | Pass | Real two-step form; library settled in 2.33 s, including 1.5 s settling wait. |
| B Camera | Pass | 25.01 s recorded; poster 6.97 s; first playback frame 1.68 s. Real upright image and speech; middle seek, 1.5× and fullscreen round trip work. |
| C Screen | Pass | 45.00 s recorded; poster 6.52 s; first frame 1.78 s. Audio present; small text readable fullscreen. Same controls pass. |
| D Composite | Pass | 30.00 s split; poster 5.52 s; first frame 1.37 s. Camera and screen preserved; controls pass. Twelve-pixel text is readable but soft fullscreen. |
| E Long | Pass | Actual 240.97 s; poster 11.96 s; playable 14.29 s. Non-silent audio; no processing-threshold finding. |
| F Trim | Pass | 8→30 save 4.14 s; immediate 22 s playback without reload. Reopened full 44.99 s timeline at 8/30; 5/40 persisted; Restore confirmed 0/45. |
| G Prospect | Fail | Fresh context plays to 25.006 s; first frame 0.62 s; seek to 12.50 s. Desktop offers 1/1.25/1.5/2; blue accent and no PiP button. Captions contain all required words. At 390 px, speed control is absent. |
| H Statistics | Pass | Loaded in 4.95 s; seven views, watched percentages 4–100%, retention curve. |
| I Download | Pass | 1.00 s; 6.93 MB MP4; 24.987 s; H.264 1080p plus non-silent AAC. |
| J Recovery | Pass | Tab closed at 15.01 s. Recorder offered 14 s/3.2 MB recovery. Saved preview in 7.41 s; recovered 14.16 s clip plays. |
| K Cleanup | Pass | Seven videos and one page deleted. Starting counts restored: 241 videos, 60 pages. Share returns 404. Video cleanup 7.98 s; page deletion/check 2.09 s. |
| L Safari | Fail | Native controls start shared playback and captions; screenshot does not establish a visible video frame. Recorder permits blank capture and says “Changes saved.” Download contains only blue video, no audio. Requested ~20 s attempt produced 27.15 s; native timing was not precise. |

Bugs and reproduction

1. Safari silent failure. Sign in, open `/record`, observe blank preview and “Choose camera”/“Choose microphone,” press Record, then Stop. “Changes saved” appears. Download and play in Chrome: blue placeholder, no audio stream. The earlier blank-save finding reproduces in Safari. Chrome completed real-camera recordings after waiting; that exact failure was not reproduced there.
2. Mobile speed control missing. Open the published camera page in a fresh context at 390×844, then Play. Captions, quality and fullscreen remain; playback speed disappears. At 1280 px, all four speed choices appear.
3. Caption error. Spoken “captions” becomes “catchings.” “Clarity,” “Mux migration,” and “Twenty-three” are correct.

The earlier failed-screen-capture fallback was not reproduced. Screen capture succeeded with the required disabled features; the failure branch remains unverified.

UX and test limits

The initial camera preview stayed blue without a useful spinner. Reopening produced the real image. A direct camera probe measured its first frame at 302 ms. The app’s composited video reported dimensions before camera content appeared, so its 1.33 s dimension result is not a valid camera-start measurement.

Screen capture uses 1800×1168 logical pixels on a 3024×1964 display. The composite reduces text further. Private foreground content was captured during part of the screen test and redacted from published screenshots. A clean text target supplied composite legibility evidence.

Earlier prospect timeout notes were test errors: the check missed video inside shadow DOM. The corrected check passed. Several handle and hidden-control interactions needed retries. Safari was driven through native accessibility because JavaScript from Apple Events was disabled.

Gallery: https://willayam.github.io/clarity-design-previews/acceptance-mux-macbook-2026-09-23-run3/

Screenshots are under `.audit/acceptance-mux-macbook-run3/`. Key evidence: `G-captions-desktop.png`, `G-captions-mobile.png`, `H-statistics.png`, `J-recorder-recovery.png`, `L-safari-finish.png`, `Run3-L-Safari-final-fullscreen.png`, `K-share-deleted.png`. The gallery embeds every screenshot with a caption.
