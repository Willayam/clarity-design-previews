# MacBook acceptance, 2026-09-23

Stopped on real-camera failure as explicitly required. No fake devices used. No source files modified.

Target https://staging.clarity.video
Commit 09a1d31da61c9d539e9bbf9268eeeb9cad2b89ad
Branch mux/phase-1-new-video-path
Headed Playwright channel chrome. Supplied args --use-fake-ui-for-media-stream and --auto-select-desktop-capture-source=Entire screen. Credentials read privately from .env.e2e.local.

A. PASS, with timing limitation. Real form login submit to /home 783 ms. Library rendered 241 videos and 60 pages. Library rendering latency was not instrumented. Initial attempt filled the password before email lookup completed and reached Create your account. Reload and sequential email lookup returned account known and login succeeded. This is not a confirmed product bug.

B. FAIL. Record click to stop click approximately 25 seconds; stop command finished at 25.029 seconds. Resulting media duration 24.995766 seconds. macOS say ran at rate 170 with: Clarity camera acceptance. The Mux migration should preserve my voice. Today is twenty three. This is the first camera recording on the MacBook. Requested system output volume 65. Audible output and captured speech were not independently verified. Saved preview had readyState 4 by 10.511 seconds after stop. Library poster and playback were subsequently observed. Exact stop-to-playable and first-frame latency unavailable; an early predicate accidentally matched another library video and its 59 ms result is invalid. Seeking to 12.5 seconds and playbackRate 1.5 confirmed. Fullscreen entered and exited via its button; synthetic Escape did not exit. Camera preview and recorded video show only blue background. No recognizable real image, orientation, or audio acceptance established.

Camera diagnostic: getUserMedia video/audio resolved in 1579 ms. Tracks identified FaceTime HD Camera (467C:1317) and MacBook Pro Microphone. A separate direct video element using the actual stream never obtained metadata or frames during a wait exceeding 20 seconds. readyState 0, videoWidth 0, videoHeight 0, live unmuted tracks. This disproves treating a successful getUserMedia promise as working camera capture. Stopped further acceptance work at that point.

C. FAIL/BLOCKED before recording. Screen only stayed unselected and Record camera remained. A transparent diagnostic wrapper around the original getDisplayMedia recorded NotReadableError, Could not start video source, after 93 ms. No fake or substituted streams. No 45-second clip. Small-text and playback checks blocked.

D. FAIL/BLOCKED before recording. 1/3 split also returned NotReadableError, Could not start video source, after 94 ms. No 30-second composite.

E. NOT RUN after camera stop condition. No four-minute clip.
F. BLOCKED because no screen clip exists.
G. NOT RUN after stop condition. Share was opened solely to identify the associated page for cleanup. It navigated to /edit/b5cc6dfc-6f86-43ee-bc0b-d57f1ed16f64. No prospect link was captured or tested. Captions, branding, speed choices, PiP, mobile playback not accepted.
H. NOT RUN. No prospect views generated.
I. NOT RUN. No download acceptance.
J. NOT RUN after camera stop condition.
K. PASS for created video cleanup. Deleted Acceptance B camera 25s via More > Delete > Delete Video. Absence confirmed within 10.715 seconds and after reload; count restored to 241. Page list remained at 60. Fresh context /page/b5cc6dfc-6f86-43ee-bc0b-d57f1ed16f64 returned 404. This path was constructed from the editor ID, not copied from a published share link; full published-link cleanup is not claimed. No separate journey page was created through New Journey Page.
L. NOT RUN after camera stop condition. Safari automation capability was not tested.

Confirmed findings
1. No-frame camera recording is accepted. On this MacBook open Record video with the physical camera selected. Preview stays blue. Click Record camera, wait 25 seconds, stop. App reports Changes saved and makes a 25-second blue clip. Recorder should detect missing frames and explain the capture failure. Root cause of hardware/browser no-frame condition remains unknown.
2. Screen capture failure is silent. Choose Screen only or 1/3 split when getDisplayMedia rejects with NotReadableError. UI remains in Camera only with no visible error. Explain failure and provide a recovery action.

Evidence notes
All PNG files are embedded with captions in index.html. Login screenshot masks inputs. Library screenshots contain QA fixtures; the final cleanup screenshot masks cards. The file mac-diagnostic.png contains a browser capture of the recorder failure state, not a desktop screenshot. An unrelated desktop capture was overwritten and is not published. No camera scene was captured. No credentials, cookies, or full authentication responses were saved.
