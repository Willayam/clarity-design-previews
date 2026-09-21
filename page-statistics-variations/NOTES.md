# Page statistics variations

Question: Can a miniature page provide useful context between the crowded dashboard and the bare video-statistics dialog?

A: Overview. Mini page beside three counts and video retention, with compact visits below.
B: Explore. Click the video or button in the mini page to select the corresponding activity view.
C: Visits. Select a visit to highlight its recorded video and button activity on the mini page.

All versions use the 928 px dialog width and the application's Geist font. There is no block-reach chart, inferred reading history, or unrecorded conversion metric.

The public data is fictional. Todd's production snapshot is local-only in .context/page-statistics-real/variations. Do not publish that directory.

Run the public example: python3 -m http.server 8046 --directory editor/prototypes/page-statistics-variations
Run the private snapshot: python3 -m http.server 8045 --bind 127.0.0.1 --directory .context/page-statistics-real/variations

Switch with the bottom controls or ?variant=A, B, or C. No writes or persistence.

Decision pending user feedback. Delete or absorb the winning direction after review.
