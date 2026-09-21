# Page statistics at application scale

Question: Can page statistics remain as simple as the existing video statistics dialog?

Following independent design advice, the current prototype is one screen: the existing preview, retention chart, and table, with a page-visit summary and a narrow Clicked column. Tabs, block list, histories, and explanatory copy were removed. Clicking the checkmark reveals the button label.

Layout follows VideoStatsModal: 928 px maximum width, 24 px padding, 18 px title, 14 px summary, 12 px rows, 236 px preview. Public data is fictional. The local .context/page-statistics-real/preview holds the production snapshot and is not for publication or commit.

Run the public example: python3 -m http.server 8044 --directory editor/prototypes/page-statistics-v2

Run the private snapshot: python3 -m http.server 8043 --bind 127.0.0.1 --directory .context/page-statistics-real/preview

## Production implementation

- Reuse the existing Dialog and VideoStatsModal sizing and shared visit formatting.
- Add an owner-authorized page statistics GET endpoint; resolve page ownership before reading events.
- Derive page visits from distinct page_view sessions and CTA clicks from page_cta_click.
- Join video events by the selected page's session IDs and media IDs. Count watched ranges, not loaded events, as plays.
- Use exact ranges merged per session to measure watched coverage. Page-open duration is elapsed time, not active attention.
- Join block analytics to stable block IDs, and show unavailable when no visibility tracking exists. The current native renderer sends page_view, page_cta_click, page_form_submit and page_unload, but does not emit page_section_view or page_section_dwell.
- Add and verify block visibility tracking before drawing block-reach bars. Historical visibility cannot be recovered from existing visit/video events.
- Hide submission metrics when the page has no form. Confirm server-side successful submissions for conversion counts.
- Retain the existing video modal for standalone videos. Link the page-card counter to page statistics.

This remains a throwaway read-only UI, not a production feature. Decision pending user review.
