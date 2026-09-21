# Stable Explore accordion

Refines the approved accordion prototype using the project's installed Base UI accordion and Lucide icons. The shadcn configuration uses Base Nova and Lucide. No new dependency or production UI change.

The dialog has a stable viewport-based height. The open panel receives the remaining height after the metrics and accordion headers. The visit list fills that space and scrolls when needed. Very short screens retain an overflow fallback. The miniature stays mounted when selecting content. Selection does not scroll the dialog.

Panels use a 220 ms height transition with matching chevrons. Reduced motion disables both transitions and smooth preview scrolling. Base UI handles trigger semantics, keyboard interaction, and panel visibility. Content stays mounted for closing transitions.

All public examples are fictional. Real snapshots are local-only.

Build: node_modules/.bin/esbuild editor/prototypes/page-statistics-smooth/app.jsx --bundle --minify --alias:@=./editor/src --define:process.env.NODE_ENV='"production"' --outfile=editor/prototypes/page-statistics-smooth/bundle.js
Run: python3 -m http.server 8050 --directory editor/prototypes/page-statistics-smooth

Verified fixed dialog bounds across panel selection, zero accordion overflow at desktop and 390 by 844, linked mini selection, watched filter, and empty states. User feedback pending.

Visit rows now follow VideoStatsModal.tsx: Where / When / Watched / %, relative dates, compact alternating rows, watched-range rails and end dots, sortable headers. Button panels share the same table and show a checkmark only for recorded clicks. On phones, dates move below locations. Checked sorting and phone overflow.

Uses the shared Table family, ButtonBase for sorting and filtering, and NativeSelect. Visit rows now render as React components. Sort direction is exposed through aria-sort. Base UI Accordion and Lucide remain shared dependencies. Prototype-only layout, preview rendering, and summary graph styling remain local. Verified filtering, sorting, scenario changes and no-click suppression.
