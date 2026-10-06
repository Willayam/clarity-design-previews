# Edit Video modal, round 2: five layouts of variant A

You build ONE layout for Clarity's Edit Video modal (Clarity is a video sales platform; repo /Users/williamlarsten/Development/clarity, read-only for you). Round 1 prototypes are at /tmp/trim-proto/edit-modal/ (index.html, js/, styles.css, shots/). Variant A, "Sheet" (`?variant=sheet`), is the base William picked. Read its code and the screenshots /tmp/trim-proto/edit-modal/shots/sheet-*.png first. Copy the whole folder into YOUR output folder and change only what your layout needs. Do not edit /tmp/trim-proto/edit-modal/ or another agent's folder. The result is published on a public site. Media is the public-domain NASA video already used there. No Clarity customer media.

## What William kept from A
- Saving model: nothing is written until Done; Done saves trim and preview as one write and closes; a back-out drops the draft (Esc as well).
- A Trim | Preview segmented control over ONE strip, with the trim handles always on the strip.
- Hold-to-zoom feedback: the strip grows, a ruler respaces, and a "6.0 s window" style readout appears. Keep it or make it clearer, but never explain it in text.
- The auto-trim line "Trimmed N s of silence · Undo".
- Dark theme first. Share is gone, and there is exactly one primary action.

## William's feedback on A, verbatim
"It needs to be significantly cleaned up in terms of the layout. It's really unbalanced and wastes a ton of space. Kill this: 'Hold a handle still to zoom in'. Make sure that the scrubber and timeline fill the full width of the thing. You can probably remove the box around this stuff, and don't put the time and the timeline on the same line. That wastes a ton of space. I'm not so sure about the Cancel and Done up in the top left and right. And the trimming stuff could probably be right aligned or something, I'm not sure."

## Hard requirements (every layout)
1. No instructional or hint copy anywhere ("Hold a handle…", "saves on Done" explainers, and the like). Use labels only where a control needs a name.
2. The scrubber/timeline spans the full content width, edge to edge with the video. Nothing sits beside it in the same row: no play button, no time, no buttons.
3. No bordered or filled box/card around the timeline area. It sits on the modal surface.
4. The current time / duration is on its own line, never in the timeline's row.
5. The video is as big as the viewport allows, and the modal is sized to its content, with no dead areas. Check balance at 1440x900 AND 1280x800, plus a narrow 390x844 phone view that must not break.
6. One primary button. The back-out is clear and not a second primary.
7. Every pixel earns its place. Compare with round-1 A's screenshots and be visibly tighter.

## Deliver
- Your folder must have index.html, static, relative paths, and work from a subpath. Only your layout is needed, so remove the round-1 switcher pill or keep it hidden. Add `<meta name="layout-name" content="...">` with a 2-4 word name.
- Screenshots in <your folder>/shots/: rest.png, trim.png, zoom.png (holding a handle), preview.png (Preview segment), at 1440x900, plus rest-1280.png and rest-390.png. Use Playwright from /Users/williamlarsten/Development/clarity/node_modules/playwright/index.mjs, launched with args ['--disable-ipv6']. Serve with python3 -m http.server on a free port and stop it when done. The NASA host sometimes drops from this Mac. The round-1 code falls back to a synthetic scene, so retry until the real video shows for screenshots.
- Look at your own screenshots critically and iterate at least twice on balance and spacing before you reply.

## Reply
Reply (no report file) with your layout name, 4 to 6 sentences describing the structure and every placement decision (where the actions live and why, where trim info and time sit), and one sentence on the weakest part of your own design. Plain sentences, no em dashes.
