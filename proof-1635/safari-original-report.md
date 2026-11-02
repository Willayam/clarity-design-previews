# Safari original verification

Tested 2026-11-02 in native Safari through cua_repl, in a new Private Browsing window at https://pr-1635.clarity-video.workers.dev/page/nrkuej. Only the original was tested. No login, settings changes, code edits, pushes, merges, or production/staging writes were performed.

Clicked Play video, paused, and clicked the player's own closed captions control. Exactly one CC control appeared. It toggled captions directly, with no language/track chooser or duplicate option visible. This verifies a single visible caption control, not the underlying text-track count.

Safari played the video and advanced through the 23-second timeline without a visible playback error. Captions rendered in two lines over the bottom of the video. The first captured caption read "hi anna thanks for the meeting yesterday / as i mentioned we help sales teams book". During resumed playback, the frame stamped 00:08:850 showed "more meetings with short personal videos / you record a one minute video send a link". At frame stamp 00:22:550 no caption was visible. The player initially displayed 0:02 / 0:23 while the burned-in frame stamp read 00:03:150. Those displays use different precision and are not a measured speech offset.

Native Safari playback succeeded. The UI alone does not establish whether the underlying delivery was native HLS or another source, so the HLS implementation path remains unverified. The supplied exact duration of 23.523 seconds was not independently measurable; the UI showed 23 seconds.

JavaScript inspection was unavailable through the exposed native-app API. Command-Option-I produced no UI change and Safari had no Develop menu. No settings were enabled. Five currentTime/active-cue samples could not be collected. No exact JavaScript error was emitted, because no JavaScript execution interface was available.

The tools returned screenshots and accessibility text, with no audio feed. This mock video has an animated graphic rather than a visible speaker. Caption progression was observed, but visual evidence cannot establish alignment to speech. No speech accuracy claim or timing offset against the supplied microphone word times is made.

No visible page/player errors occurred. Verification is partial for speech alignment, exact track count, precise duration, and native HLS identification.

Evidence files: safari-original-captions.png, safari-original-playing.png, safari-original-late.png.
