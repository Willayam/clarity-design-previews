# Explore with different data

William selected Explore: select a video or button in a miniature page to inspect its activity.

Six public scenarios use fictional data: 38 visits, two visits, early drop-off, multiple videos and buttons, no visits, and a page without video. Choose an example with the bottom picker. The case query parameter preserves the choice.

The private local version replaces the first two scenarios with read-only customer snapshots. It lives in .context/page-statistics-real/explore-tests/preview. Never publish that directory.

The layout keeps the existing 928 px dialog width and Geist font. Recorded watch ranges drive the curve and percentages. Long visit lists scroll and can filter to watched or clicked visits. Missing locations display numbered visits. Video and button selection updates the curve and visit results. No visits and no video have explicit states. No block reach is inferred.

Verified desktop switching, per-video curves, button results, filters and empty states. Verified 390 px mobile layouts, no horizontal overflow, font loading and no browser errors.

Run public: python3 -m http.server 8048 --directory editor/prototypes/page-statistics-explore
Run private: python3 -m http.server 8047 --bind 127.0.0.1 --directory .context/page-statistics-real/explore-tests/preview

Throwaway prototype. No production changes, writes or persistence.
