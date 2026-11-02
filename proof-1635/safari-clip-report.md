# Safari clip caption verification

Date: 2026-11-02
Page: https://pr-1635.clarity-video.workers.dev/page/nrkuej
Requested playback ID: O8DEfHXOHZ700vBW01kAt5a4P7YuSJC7VFP8levuwfPZY

Reloaded the existing native Safari Private window and played the clip using native computer-use tools. The player changed from the previous 23-second duration to a displayed 2-second duration. The playback ID is supplied by the task and was not independently exposed by the visible UI.

One visible CC control appeared in the player. It toggled captions directly, without a language-choice menu. Turning it on displayed one line, "hi anna thanks for the meeting yesterday". Turning it off removed that line. Turning it back on restored it. No duplicate caption line or second CC control was visible.

Three visual samples showed the same single cue:

| Sample | Seek fraction reported by accessibility | Visible player time | Burned-in source frame label | Evidence |
| --- | --- | --- | --- | --- |
| Early, paused after seeking | 0.1678838 | 0:00 / 0:02 | 00:02:500 50 | safari-clip-early.png |
| Middle, paused after seeking | 0.4939708 | 0:00 / 0:02 | 00:03:150 63 | safari-clip-middle.png |
| Near end, replay icon visible | 0.9783381 | 0:01 / 0:02 | 00:04:100 82 | safari-clip.png |

A further playing sample at seek fraction 0.5314847 showed the same caption once, with the pause control and 0:01 / 0:02 visible.

The visible text fits the supplied clip transcript. A single sentence cue is consistent with the expected .160 to 2.000 interval; the words need not appear separately. The supplied word times are hi .16 to .48, anna .48 to .96, thanks .96 to 1.28, for 1.28 to 1.52, the 1.52 to 1.6, meeting 1.6 to 1.92, and yesterday 1.92 to the clipped endpoint at 2.000.

This is a visual content and duplicate-caption check, not a frame-accurate timing pass. No audio feed was available. No page JavaScript or developer tools were used, and no settings were changed. The UI rounds playback time to seconds, and accessibility reported unknown time after paused seeks. The burned-in source labels are reported as seen, not treated as authoritative clip timestamps. In particular, the near-end source frame says 00:04:100, so these observations cannot certify an exact source cut at 4.000 seconds. I did not establish exact cue onset at .160 or disappearance at 2.000. The cue remained visible on the stopped near-end frame.

The earlier original screenshot was not re-evaluated in this run. The supplied correction is "video send a link"; there is no basis here for the earlier "demo and send" reading.

No code edits, secrets access, production or staging writes, push, or merge were performed. Evidence was saved locally as requested.
