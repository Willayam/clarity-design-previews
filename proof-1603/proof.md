## Proof

**Head:** 10cccf4acd790465d0979ce9a301d1b8e42d03ab
**Issue:** #1275
**Routing:** steer. William signed off on landing as built, including the hero at body size, on 2026-11-02.
**Verdict:** BLOCKED. Current-head behavior passed. A fresh Before capture on PR #1590 is unavailable because that preview returns HTTP 404. Required Proof remains incomplete.
**PR:** https://github.com/Clarity-Video-HQ/clarity/pull/1603
**Preview:** https://pr-1603.clarity-video.workers.dev
**Mock public page:** https://pr-1603.clarity-video.workers.dev/page/232gc5
**Verify report:** https://willayam.github.io/clarity-design-previews/proof-1603/ NOT VERIFIED pending the Before item.

**Repro:** Create an isolated mock page with all nine kinds. Capture each empty field, type a subheadline, blur, reload, publish, and compare Clean and Noir at 1440 and 390 px. Check clearing, literal text, rapid typing, untouched stored text, concurrent edits and pricing edge cases.

**Before:** BLOCKED for a fresh capture. PR #1590 returned HTTP 404 on the initial login and six retries, 15 seconds apart. Its root also returned 404. [Current response](https://willayam.github.io/clarity-design-previews/proof-1603/before-1590-unavailable.png), [status](https://willayam.github.io/clarity-design-previews/proof-1603/before-status.json). The [archived November 1 Before screenshot](https://willayam.github.io/clarity-design-previews/proof-1603/before-1590.png) showed no subheadline controls on PR #1590 at head 2ea76ccb7c46a591359530a8e879272d6eb5869e. This archive is labelled historical and is not claimed as a fresh independent check.

**After, headline plus optional subheadline on every kind:** Each row proves the visible placeholder and the value retained after real keystrokes, blur and reload. [DOM readback](https://willayam.github.io/clarity-design-previews/proof-1603/editor-checks.json).

| Acceptance evidence | Empty field | Retained after reload |
| --- | --- | --- |
| Hero | [Placeholder](https://willayam.github.io/clarity-design-previews/proof-1603/placeholder-hero.png) | [Saved](https://willayam.github.io/clarity-design-previews/proof-1603/persisted-hero.png) |
| Story | [Placeholder](https://willayam.github.io/clarity-design-previews/proof-1603/placeholder-story.png) | [Saved](https://willayam.github.io/clarity-design-previews/proof-1603/persisted-story.png) |
| Logos | [Placeholder](https://willayam.github.io/clarity-design-previews/proof-1603/placeholder-logos.png) | [Saved](https://willayam.github.io/clarity-design-previews/proof-1603/persisted-logos.png) |
| Form | [Placeholder](https://willayam.github.io/clarity-design-previews/proof-1603/placeholder-form.png) | [Saved](https://willayam.github.io/clarity-design-previews/proof-1603/persisted-form.png) |
| Document | [Placeholder](https://willayam.github.io/clarity-design-previews/proof-1603/placeholder-document.png) | [Saved](https://willayam.github.io/clarity-design-previews/proof-1603/persisted-document.png) |
| Faq | [Placeholder](https://willayam.github.io/clarity-design-previews/proof-1603/placeholder-faq.png) | [Saved](https://willayam.github.io/clarity-design-previews/proof-1603/persisted-faq.png) |
| Pricing | [Placeholder](https://willayam.github.io/clarity-design-previews/proof-1603/placeholder-pricing.png) | [Saved](https://willayam.github.io/clarity-design-previews/proof-1603/persisted-pricing.png) |
| Summary | [Placeholder](https://willayam.github.io/clarity-design-previews/proof-1603/placeholder-summary.png) | [Saved](https://willayam.github.io/clarity-design-previews/proof-1603/persisted-summary.png) |
| Gallery | [Placeholder](https://willayam.github.io/clarity-design-previews/proof-1603/placeholder-gallery.png) | [Saved](https://willayam.github.io/clarity-design-previews/proof-1603/persisted-gallery.png) |

**Public rendering:** All nine subheadlines sit below their headlines in the editor's order and alignment in both themes and widths. Forms remain left-aligned. Browser CSS `start` resolves to left in this LTR page. [Clean 1440](https://willayam.github.io/clarity-design-previews/proof-1603/public-clean-1440.png), [Clean 390](https://willayam.github.io/clarity-design-previews/proof-1603/public-clean-390.png), [Noir 1440](https://willayam.github.io/clarity-design-previews/proof-1603/public-noir-1440.png), [Noir 390](https://willayam.github.io/clarity-design-previews/proof-1603/public-noir-390.png), [editor/public measurements](https://willayam.github.io/clarity-design-previews/proof-1603/public-checks.json). FAQ expansion also worked.

**Optional plain text:** Clearing the summary and republishing left zero subheadline elements in that section and zero empty subheadline elements on the page. The story displayed `<b>mock</b> & "quotes"` literally, with zero child elements. [Readback](https://willayam.github.io/clarity-design-previews/proof-1603/clear-literal.json), [clear](https://willayam.github.io/clarity-design-previews/proof-1603/cleared-summary.png), [literal text](https://willayam.github.io/clarity-design-previews/proof-1603/literal-text.png).

**Document-store integration:** Rapid keystrokes at zero delay survived blur and reload. Stored text of 322 characters survived focus and blur unchanged. Two tabs loaded the same revision; one changed the hero subheadline, then the other changed its headline. The stale save merged both values. [Readback](https://willayam.github.io/clarity-design-previews/proof-1603/merge-checks.json), [both values](https://willayam.github.io/clarity-design-previews/proof-1603/two-tabs.png). One HTTP 409 on `pages_save_draft` was the expected stale-revision response in this test.

**Agent field:** Authenticated browser-session `POST /api/actions/pages_edit` accepted `set_field` for `subheadline` on all nine kinds, and a fresh `pages_get` confirmed the values. [Calls and saved values](https://willayam.github.io/clarity-design-previews/proof-1603/pages-edit.json). The separate agent bearer transport was not exercised. The permitted test fallback passed `page-edits.test.ts` subheadline cases and `agent-pages-edit-help.test.ts` field contracts. Those suites plus parity passed 132 tests.

**Pricing:** With no plans, both editor and public page showed the headline followed by its subheadline. Public HTML contained H2 and P, with no pricing grid or cards. With an empty title, both showed the fallback `Pricing`, its subheadline and one mock plan. [HTML and measurements](https://willayam.github.io/clarity-design-previews/proof-1603/pricing-checks.json), [no plans editor](https://willayam.github.io/clarity-design-previews/proof-1603/pricing-no-plans-editor.png), [no plans public](https://willayam.github.io/clarity-design-previews/proof-1603/pricing-no-plans-public.png), [fallback editor](https://willayam.github.io/clarity-design-previews/proof-1603/pricing-fallback-title-editor.png), [fallback public](https://willayam.github.io/clarity-design-previews/proof-1603/pricing-fallback-title-public.png).

**Tests:** `pnpm --filter clarity-journey-editor exec vitest run tests/block-rendering-parity.test.ts` on the named head.

```text
Test Files  1 passed (1)
     Tests  92 passed (92)
```

[Parity log](https://willayam.github.io/clarity-design-previews/proof-1603/parity-tests.txt). The four canvas suites covering empty fields, keyboard controls, conflict drafts and focused selection also passed, 317 tests. [Canvas log](https://willayam.github.io/clarity-design-previews/proof-1603/canvas-tests.txt). No red-to-green line is required for this enhancement. Doctor confirmed authenticated access and preview headSha 10cccf4acd790465d0979ce9a301d1b8e42d03ab.

**Notes:** The [hero at 1440 px](https://willayam.github.io/clarity-design-previews/proof-1603/hero-1440.png) uses 18 px body text, approved by William on November 2. Mock media references produced Mux 404 and browser ORB errors; PDF viewer requests were aborted during navigation. Some media frames are blank. Media reliability is not established by this report, and the unavailable Before preview prevents a fresh comparison. No code was changed.

**Preview writes:** Created mock page `9345c0f4-02ec-490e-aa61-d8a5beca673b` from a read-only copy of the prior mock fixture. All content writes targeted this new page. Wrote nine subheadlines, the rapid-typing value, a 322-character stored value, concurrent hero headline and subheadline values, and the nine `pages_edit` values. Temporarily cleared the summary, set literal story text, removed pricing plans and cleared the pricing title. Switched Clean/Noir themes and published eight times. Restored the normal nine subheadlines, hero headline, original pricing and Clean theme, then published. Browser logs record one create, ten save attempts including the expected rejected stale save, nine edit calls and eight publishes. [Action counts](https://willayam.github.io/clarity-design-previews/proof-1603/action-counts.json). Reused existing mock asset references without modifying their records. No direct D1 writes, uploads, lead submissions, writes to PR #1590, or production/staging writes. Public visits may create normal preview analytics.

**Waved through:** none. The missing fresh Before remains a blocker, not a waiver or a code failure.
