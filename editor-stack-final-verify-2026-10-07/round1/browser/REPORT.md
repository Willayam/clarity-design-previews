NOT VERIFIED | https://pr-1042.clarity-video.workers.dev | 6c8c169b4f1fc05bebcb434e42432eac40f0cd89

Independent browser acceptance at the exact PR #1042 head. Completed 2026-10-07T17:01:53.501553+00:00. All 191 supplied coverage rows ran fresh: 190 pass, 1 fails, 0 are not testable. The failure is row 56, story media alignment Left by pointer on a short, wide image. Other LAND acceptance checks pass.

This report covers live preview browser work only. The parent owns build gates and the diff audit. No product edits, commits, pushes, GitHub comments or deploys were made. No artifacts were published externally.

## LAND checks

| Check | Result | Evidence |
| --- | --- | --- |
| Exact preview identity | PASS | Login then doctor --pr 1042 --wait. Final doctor matches the requested head. [doctor-final.txt](doctor-final.txt) |
| All 191 coverage rows | FAIL | 190 pass, 1 fails, 0 not testable. Row 56 fails by pointer. [coverage.json](coverage.json) |
| UI saves and API values | FAIL | 466 successful browser PUT responses. 233 of 234 stored-value assertions pass; the single failure is the blocked Left alignment. Other suites also use inline API predicates. [api-value-audit.json](api-value-audit.json) |
| No old editor side panel | PASS | Old editor-panel and editor-form are absent. Hero has no removal handle. [extras-complete/panel-hero.json](extras-complete/panel-hero.json) |
| Hero and story video controls | PASS | Edit video, Replace, add and remove pass by pointer and keyboard. Replace remains open after its opening press. [video-final/results.json](video-final/results.json) |
| Logo defaults and wide thumbnail | PASS | Picker checkbox and Style default action are present. Loaded image is 640 by 100 and uses object-fit contain. [wide-logo-final/wide-logo-measured.json](wide-logo-final/wide-logo-measured.json) |
| Visible carets | PASS | Pricing name, price and Aurora heading inspected in screenshots with caret initial. [visual/results.json](visual/results.json) |
| Pricing Enter and Backspace | PASS | Enter creates the second feature. Backspace on the empty second feature removes it. Both survive reload. [extras-complete/results.json](extras-complete/results.json) |
| Theme radius on media outline | PASS | Overlay and image both have border-radius 20px, matching --jp-radius. [extras-complete/media-radius.json](extras-complete/media-radius.json) |
| Theme and Style saves | PASS | Preset, accent, background, font, size, corners and logo alignment saved and reloaded. [extras-complete/results.json](extras-complete/results.json) |
| Publish and public rendering | PASS | UI Publish returned 200 and opened a public link. Its heading and pricing plan matched the saved edits. [extras-complete/public.json](extras-complete/public.json) |
| Library, recorder and settings | PASS | Each route loaded with no console or page errors. [adjacent-land/results.json](adjacent-land/results.json) |
| Existing keyboard rich-text link gap | WARN | Tab skips the link toolbar for story, form and pricing. Pointer add, edit and remove links pass. This gap is already recorded in the supplied checklist. [rich/results.json](rich/results.json) |
| Save failure recovery | PASS | One deliberate 503 produced an explanatory alert. Removing the interception allowed a real save and reload. [special-land/save-error-recovered.json](special-land/save-error-recovered.json) |
| Fixture cleanup | PASS | 44 pages and 2 public URLs return 404. Four owned media assets were deleted and return 404. The default logo is null with legacy preference again. [cleanup.json](cleanup.json) |
| Build, tests and diff audit | NOT RUN | Assigned to the parent. No product code changed.  |

## Finding

Blocker for browser acceptance: the story resize handle intercepts Left alignment on a short, wide image.

Code location: `editor/src/components/editor/JourneyMediaResizer.tsx:151`, where the resize hit area has an 80-pixel height, a 44-pixel width and z-index 6. The toolbar is rendered in `editor/src/components/MediaPicker.tsx:326`.

1. On the exact preview head, create a page with a story block. Use a 1440 by 1000 viewport.
2. Add a 640 by 100 image to the story. This run used its own `LAND-logo-1.png`.
3. Hover the media and click Right. Wait for save, reload, and hover it again.
4. Click the center of Left in the media toolbar. The resize handle receives the click. The saved `mediaSide` remains `right` after reload.

The measured Left button spans x=931.5 to 963.5 and y=532.171875 to 564.171875. At its center, `elementFromPoint` returns the Resize media button. Six of the nine sampled interior points hit Resize media. A direct mouse click, with no forced locator action, reproduces the unchanged API value. Keyboard activation does save `left`.

Expected fix: prevent the resize hit area from covering toolbar buttons, for example by giving the toolbar precedence or excluding its bounds from the resize target. Recheck short landscape media on both alignments.

Evidence: [hit test](story-hit/Left-hit.json), [saved wrong value](story-hit/story-media-Left.json), [screenshot](story-hit/representative-Left.png), [reproduction commands](story-hit/commands.txt), [keyboard control](canonical-keyboard/story-media-Left.json). This run did not compare the same shape against main, so it does not claim when the obstruction was introduced.

## Coverage

| Row | Capability | Result | Evidence | Notes |
| --- | --- | --- | --- | --- |
| 1 | hero title | PASS | [canonical-keyboard/hero-title.json](canonical-keyboard/hero-title.json) |  |
| 2 | hero title alignment Left | PASS | [canonical-keyboard/hero-align-Left.json](canonical-keyboard/hero-align-Left.json) |  |
| 3 | hero title alignment Center | PASS | [canonical-keyboard/hero-align-Center.json](canonical-keyboard/hero-align-Center.json) |  |
| 4 | hero title alignment Right | PASS | [canonical-keyboard/hero-align-Right.json](canonical-keyboard/hero-align-Right.json) |  |
| 5 | story title | PASS | [canonical-keyboard/story-title.json](canonical-keyboard/story-title.json) |  |
| 6 | story title alignment Left | PASS | [canonical-keyboard/story-align-Left.json](canonical-keyboard/story-align-Left.json) |  |
| 7 | story title alignment Center | PASS | [canonical-keyboard/story-align-Center.json](canonical-keyboard/story-align-Center.json) |  |
| 8 | story title alignment Right | PASS | [canonical-keyboard/story-align-Right.json](canonical-keyboard/story-align-Right.json) |  |
| 9 | logos title | PASS | [canonical-keyboard/logos-title.json](canonical-keyboard/logos-title.json) |  |
| 10 | logos title alignment Left | PASS | [canonical-keyboard/logos-align-Left.json](canonical-keyboard/logos-align-Left.json) |  |
| 11 | logos title alignment Center | PASS | [canonical-keyboard/logos-align-Center.json](canonical-keyboard/logos-align-Center.json) |  |
| 12 | logos title alignment Right | PASS | [canonical-keyboard/logos-align-Right.json](canonical-keyboard/logos-align-Right.json) |  |
| 13 | gallery title | PASS | [canonical-keyboard/gallery-title.json](canonical-keyboard/gallery-title.json) |  |
| 14 | gallery title alignment Left | PASS | [canonical-keyboard/gallery-align-Left.json](canonical-keyboard/gallery-align-Left.json) |  |
| 15 | gallery title alignment Center | PASS | [canonical-keyboard/gallery-align-Center.json](canonical-keyboard/gallery-align-Center.json) |  |
| 16 | gallery title alignment Right | PASS | [canonical-keyboard/gallery-align-Right.json](canonical-keyboard/gallery-align-Right.json) |  |
| 17 | faq title | PASS | [canonical-keyboard/faq-title.json](canonical-keyboard/faq-title.json) |  |
| 18 | faq title alignment Left | PASS | [canonical-keyboard/faq-align-Left.json](canonical-keyboard/faq-align-Left.json) |  |
| 19 | faq title alignment Center | PASS | [canonical-keyboard/faq-align-Center.json](canonical-keyboard/faq-align-Center.json) |  |
| 20 | faq title alignment Right | PASS | [canonical-keyboard/faq-align-Right.json](canonical-keyboard/faq-align-Right.json) |  |
| 21 | pricing title | PASS | [canonical-keyboard/pricing-title.json](canonical-keyboard/pricing-title.json) |  |
| 22 | pricing title alignment Left | PASS | [canonical-keyboard/pricing-align-Left.json](canonical-keyboard/pricing-align-Left.json) |  |
| 23 | pricing title alignment Center | PASS | [canonical-keyboard/pricing-align-Center.json](canonical-keyboard/pricing-align-Center.json) |  |
| 24 | pricing title alignment Right | PASS | [canonical-keyboard/pricing-align-Right.json](canonical-keyboard/pricing-align-Right.json) |  |
| 25 | summary title | PASS | [canonical-keyboard/summary-title.json](canonical-keyboard/summary-title.json) |  |
| 26 | summary title alignment Left | PASS | [canonical-keyboard/summary-align-Left.json](canonical-keyboard/summary-align-Left.json) |  |
| 27 | summary title alignment Center | PASS | [canonical-keyboard/summary-align-Center.json](canonical-keyboard/summary-align-Center.json) |  |
| 28 | summary title alignment Right | PASS | [canonical-keyboard/summary-align-Right.json](canonical-keyboard/summary-align-Right.json) |  |
| 29 | hero media add | PASS | [canonical-keyboard/hero-media-add.json](canonical-keyboard/hero-media-add.json) |  |
| 30 | hero media change | PASS | [canonical-keyboard/hero-media-change.json](canonical-keyboard/hero-media-change.json) |  |
| 31 | hero media remove | PASS | [canonical-keyboard/hero-media-remove.json](canonical-keyboard/hero-media-remove.json) |  |
| 32 | story media add | PASS | [canonical-keyboard/story-media-add.json](canonical-keyboard/story-media-add.json) |  |
| 33 | story media change | PASS | [canonical-keyboard/story-media-change.json](canonical-keyboard/story-media-change.json) |  |
| 34 | story media remove | PASS | [canonical-keyboard/story-media-remove.json](canonical-keyboard/story-media-remove.json) |  |
| 35 | hero primaryCta add | PASS | [canonical-keyboard/hero-cta-add-0.json](canonical-keyboard/hero-cta-add-0.json) |  |
| 36 | hero primaryCta label | PASS | [canonical-keyboard/hero-cta-Label-0.json](canonical-keyboard/hero-cta-Label-0.json) |  |
| 37 | hero primaryCta link | PASS | [canonical-keyboard/hero-cta-Link-0.json](canonical-keyboard/hero-cta-Link-0.json) |  |
| 38 | hero primaryCta emphasis | PASS | [canonical-keyboard/hero-cta-emphasis-0.json](canonical-keyboard/hero-cta-emphasis-0.json) |  |
| 39 | hero primaryCta remove | PASS | [canonical-keyboard/hero-cta-remove-0.json](canonical-keyboard/hero-cta-remove-0.json) |  |
| 40 | hero signCta add | PASS | [canonical-keyboard/hero-cta-add-1.json](canonical-keyboard/hero-cta-add-1.json) |  |
| 41 | hero signCta label | PASS | [canonical-keyboard/hero-cta-Label-3.json](canonical-keyboard/hero-cta-Label-3.json) |  |
| 42 | hero signCta link | PASS | [canonical-keyboard/hero-cta-Link-3.json](canonical-keyboard/hero-cta-Link-3.json) |  |
| 43 | hero signCta emphasis | PASS | [canonical-keyboard/hero-cta-emphasis-3.json](canonical-keyboard/hero-cta-emphasis-3.json) |  |
| 44 | hero signCta remove | PASS | [canonical-keyboard/hero-cta-remove-3.json](canonical-keyboard/hero-cta-remove-3.json) |  |
| 45 | hero paymentCta add | PASS | [canonical-keyboard/hero-cta-add-2.json](canonical-keyboard/hero-cta-add-2.json) |  |
| 46 | hero paymentCta label | PASS | [canonical-keyboard/hero-cta-Label-1.json](canonical-keyboard/hero-cta-Label-1.json) |  |
| 47 | hero paymentCta link | PASS | [canonical-keyboard/hero-cta-Link-1.json](canonical-keyboard/hero-cta-Link-1.json) |  |
| 48 | hero paymentCta emphasis | PASS | [canonical-keyboard/hero-cta-emphasis-1.json](canonical-keyboard/hero-cta-emphasis-1.json) |  |
| 49 | hero paymentCta remove | PASS | [canonical-keyboard/hero-cta-remove-1.json](canonical-keyboard/hero-cta-remove-1.json) |  |
| 50 | hero customCta add | PASS | [canonical-keyboard/hero-cta-add-3.json](canonical-keyboard/hero-cta-add-3.json) |  |
| 51 | hero customCta label | PASS | [canonical-keyboard/hero-cta-Label-2.json](canonical-keyboard/hero-cta-Label-2.json) |  |
| 52 | hero customCta link | PASS | [canonical-keyboard/hero-cta-Link-2.json](canonical-keyboard/hero-cta-Link-2.json) |  |
| 53 | hero customCta emphasis | PASS | [canonical-keyboard/hero-cta-emphasis-2.json](canonical-keyboard/hero-cta-emphasis-2.json) |  |
| 54 | hero customCta remove | PASS | [canonical-keyboard/hero-cta-remove-2.json](canonical-keyboard/hero-cta-remove-2.json) |  |
| 55 | story body | PASS | [canonical-keyboard/story-body.json](canonical-keyboard/story-body.json) |  |
| 56 | story media alignment Left | FAIL | [story-hit/Left-hit.json](story-hit/Left-hit.json), [story-hit/story-media-Left.json](story-hit/story-media-Left.json), [canonical-keyboard/story-media-Left.json](canonical-keyboard/story-media-Left.json) | FAIL by pointer for a 640×100 story image. Resize handle covers Left. Keyboard passes. |
| 57 | story media alignment Right | PASS | [canonical-keyboard/story-media-Right.json](canonical-keyboard/story-media-Right.json) |  |
| 58 | logos variant Rolling | PASS | [canonical-keyboard/logos-Rolling.json](canonical-keyboard/logos-Rolling.json) |  |
| 59 | logos variant Static | PASS | [canonical-keyboard/logos-Static.json](canonical-keyboard/logos-Static.json) |  |
| 60 | logos colors Muted | PASS | [canonical-keyboard/logos-Muted.json](canonical-keyboard/logos-Muted.json) |  |
| 61 | logos colors Full | PASS | [canonical-keyboard/logos-Full-color.json](canonical-keyboard/logos-Full-color.json) |  |
| 62 | logos colors Auto | PASS | [canonical-keyboard/logos-Auto.json](canonical-keyboard/logos-Auto.json) |  |
| 63 | logos add | PASS | [canonical-keyboard/logos-add.json](canonical-keyboard/logos-add.json) |  |
| 64 | logos remove | PASS | [canonical-keyboard/logos-remove.json](canonical-keyboard/logos-remove.json) |  |
| 65 | logos seventh independent removal | PASS | [seventh-diagnostic/seventh-logo-pointer.json](seventh-diagnostic/seventh-logo-pointer.json), [seventh-diagnostic/seventh-logo-keyboard.json](seventh-diagnostic/seventh-logo-keyboard.json) |  |
| 66 | form title | PASS | [canonical-keyboard/form-title.json](canonical-keyboard/form-title.json) |  |
| 67 | form description | PASS | [canonical-keyboard/form-description.json](canonical-keyboard/form-description.json) |  |
| 68 | form submit label | PASS | [canonical-keyboard/form-submit.json](canonical-keyboard/form-submit.json) |  |
| 69 | form redirect | PASS | [canonical-keyboard/form-redirect.json](canonical-keyboard/form-redirect.json) |  |
| 70 | form add field | PASS | [canonical-keyboard/form-add-field.json](canonical-keyboard/form-add-field.json) |  |
| 71 | form field label | PASS | [canonical-keyboard/form-field-label.json](canonical-keyboard/form-field-label.json) |  |
| 72 | form required | PASS | [canonical-keyboard/form-required.json](canonical-keyboard/form-required.json) |  |
| 73 | form remove field | PASS | [canonical-keyboard/form-remove-field.json](canonical-keyboard/form-remove-field.json) |  |
| 74 | disabled form row edit | PASS | [special-land/branch-hidden-pointer-edit.json](special-land/branch-hidden-pointer-edit.json) |  |
| 75 | disabled form row required | PASS | [special-land/branch-hidden-pointer-required.json](special-land/branch-hidden-pointer-required.json) |  |
| 76 | disabled form row remove | PASS | [special-land/branch-hidden-pointer-remove.json](special-land/branch-hidden-pointer-remove.json) |  |
| 77 | document add | PASS | [canonical-keyboard/document-add.json](canonical-keyboard/document-add.json) |  |
| 78 | document change | PASS | [canonical-keyboard/document-change.json](canonical-keyboard/document-change.json) |  |
| 79 | document clear | PASS | [canonical-keyboard/document-remove.json](canonical-keyboard/document-remove.json) |  |
| 80 | faq add question | PASS | [canonical-keyboard/faq-add.json](canonical-keyboard/faq-add.json) |  |
| 81 | faq question | PASS | [canonical-keyboard/faq-question.json](canonical-keyboard/faq-question.json) |  |
| 82 | faq answer | PASS | [canonical-keyboard/faq-answer.json](canonical-keyboard/faq-answer.json) |  |
| 83 | faq remove question | PASS | [canonical-keyboard/faq-remove.json](canonical-keyboard/faq-remove.json) |  |
| 84 | pricing plan title | PASS | [canonical-keyboard/plan-title.json](canonical-keyboard/plan-title.json) |  |
| 85 | pricing plan price | PASS | [canonical-keyboard/plan-price.json](canonical-keyboard/plan-price.json) |  |
| 86 | pricing plan description | PASS | [canonical-keyboard/plan-description.json](canonical-keyboard/plan-description.json) |  |
| 87 | pricing plan CTA label | PASS | [canonical-keyboard/plan-cta-label.json](canonical-keyboard/plan-cta-label.json) |  |
| 88 | pricing plan CTA link | PASS | [canonical-keyboard/plan-cta-link.json](canonical-keyboard/plan-cta-link.json) |  |
| 89 | pricing add feature | PASS | [canonical-keyboard/plan-feature-add.json](canonical-keyboard/plan-feature-add.json) |  |
| 90 | pricing feature text | PASS | [canonical-keyboard/plan-feature-edit.json](canonical-keyboard/plan-feature-edit.json) |  |
| 91 | pricing remove feature | PASS | [canonical-keyboard/plan-feature-remove.json](canonical-keyboard/plan-feature-remove.json) |  |
| 92 | pricing duplicate plan | PASS | [canonical-keyboard/plan-duplicate.json](canonical-keyboard/plan-duplicate.json) |  |
| 93 | pricing add plan | PASS | [canonical-keyboard/plan-add.json](canonical-keyboard/plan-add.json) |  |
| 94 | pricing delete plan | PASS | [canonical-keyboard/plan-delete.json](canonical-keyboard/plan-delete.json) |  |
| 95 | shell move/grip | PASS | [drag/section-pointer-drag.json](drag/section-pointer-drag.json), [drag/section-keyboard-move.json](drag/section-keyboard-move.json) |  |
| 96 | shell move buttons/menu | PASS | [drag/section-menu-move.json](drag/section-menu-move.json) |  |
| 97 | shell add section | PASS | [canonical-keyboard/canvas-add.json](canonical-keyboard/canvas-add.json) |  |
| 98 | shell delete section | PASS | [canonical-keyboard/canvas-remove.json](canonical-keyboard/canvas-remove.json) |  |
| 99 | form remove/add | PASS | [add-menu/branch-pointer-add-form.json](add-menu/branch-pointer-add-form.json), [add-menu/branch-pointer-remove-form.json](add-menu/branch-pointer-remove-form.json) |  |
| 100 | logos move down/up | PASS | [canonical-keyboard/logos-move-down.json](canonical-keyboard/logos-move-down.json), [canonical-keyboard/logos-move-up.json](canonical-keyboard/logos-move-up.json) |  |
| 101 | logos section delete | PASS | [canonical-keyboard/logos-remove-section.json](canonical-keyboard/logos-remove-section.json) |  |
| 102 | manual save / topbar name | PASS | [canonical-keyboard/topbar-manual-name.json](canonical-keyboard/topbar-manual-name.json) |  |
| 103 | clear hero-title | PASS | [clearing/branch-hero-title.json](clearing/branch-hero-title.json) |  |
| 104 | clear story-title | PASS | [clearing/branch-story-title.json](clearing/branch-story-title.json) |  |
| 105 | clear logos-title | PASS | [clearing/branch-logos-title.json](clearing/branch-logos-title.json) |  |
| 106 | clear gallery-title | PASS | [clearing/branch-gallery-title.json](clearing/branch-gallery-title.json) |  |
| 107 | clear faq-title | PASS | [clearing/branch-faq-title.json](clearing/branch-faq-title.json) |  |
| 108 | clear pricing-title | PASS | [clearing/branch-pricing-title.json](clearing/branch-pricing-title.json) |  |
| 109 | clear summary-title | PASS | [clearing/branch-summary-title.json](clearing/branch-summary-title.json) |  |
| 110 | clear story-body | PASS | [special-land/story-clear-body.json](special-land/story-clear-body.json), [pointer-finishing/clear-story-body.json](pointer-finishing/clear-story-body.json) |  |
| 111 | clear faq-question | PASS | [special-land/faq-clear-question.json](special-land/faq-clear-question.json) |  |
| 112 | clear faq-answer | PASS | [clearing/branch-faq-answer.json](clearing/branch-faq-answer.json) |  |
| 113 | clear plan-title | PASS | [clearing/branch-plan-title.json](clearing/branch-plan-title.json) |  |
| 114 | clear plan-price | PASS | [clearing/branch-plan-price.json](clearing/branch-plan-price.json) |  |
| 115 | clear plan-description | PASS | [clearing/branch-plan-description.json](clearing/branch-plan-description.json) |  |
| 116 | clear plan-feature | PASS | [clearing/branch-plan-feature.json](clearing/branch-plan-feature.json) |  |
| 117 | clear form-title | PASS | [clearing/branch-form-title.json](clearing/branch-form-title.json) |  |
| 118 | clear form-description | PASS | [clearing/branch-form-description.json](clearing/branch-form-description.json) |  |
| 119 | clear form-submit | PASS | [clearing/branch-form-submit.json](clearing/branch-form-submit.json) |  |
| 120 | clear form-field | PASS | [clearing/branch-form-field.json](clearing/branch-form-field.json) |  |
| 121 | clear primaryCta-label | PASS | [clearing-links/branch-primaryCta-label.json](clearing-links/branch-primaryCta-label.json) |  |
| 122 | clear primaryCta-link | PASS | [clearing-links/branch-primaryCta-link.json](clearing-links/branch-primaryCta-link.json) |  |
| 123 | clear signCta-label | PASS | [clearing-links/branch-signCta-label.json](clearing-links/branch-signCta-label.json) |  |
| 124 | clear signCta-link | PASS | [clearing-links/branch-signCta-link.json](clearing-links/branch-signCta-link.json) |  |
| 125 | clear paymentCta-label | PASS | [clearing-links/branch-paymentCta-label.json](clearing-links/branch-paymentCta-label.json) |  |
| 126 | clear paymentCta-link | PASS | [clearing-links/branch-paymentCta-link.json](clearing-links/branch-paymentCta-link.json) |  |
| 127 | clear customCta-label | PASS | [clearing-links/branch-customCta-label.json](clearing-links/branch-customCta-label.json) |  |
| 128 | clear customCta-link | PASS | [clearing-links/branch-customCta-link.json](clearing-links/branch-customCta-link.json) |  |
| 129 | clear pricing-label | PASS | [clearing-links/branch-pricing-label.json](clearing-links/branch-pricing-label.json) |  |
| 130 | clear pricing-link | PASS | [clearing-links/branch-pricing-link.json](clearing-links/branch-pricing-link.json) |  |
| 131 | clear form-label | PASS | [clearing-links/branch-form-label.json](clearing-links/branch-form-label.json) |  |
| 132 | clear form-link | PASS | [clearing-links/branch-form-link.json](clearing-links/branch-form-link.json) |  |
| 133 | canvas regression gallery-add | PASS | [canonical-keyboard/gallery-add.json](canonical-keyboard/gallery-add.json) |  |
| 134 | canvas regression gallery-more-columns | PASS | [canonical-keyboard/gallery-more-columns.json](canonical-keyboard/gallery-more-columns.json) |  |
| 135 | canvas regression gallery-fewer-columns | PASS | [canonical-keyboard/gallery-fewer-columns.json](canonical-keyboard/gallery-fewer-columns.json) |  |
| 136 | canvas regression gallery-remove | PASS | [canonical-keyboard/gallery-remove.json](canonical-keyboard/gallery-remove.json) |  |
| 137 | canvas regression summary-cell | PASS | [canonical-keyboard/summary-cell.json](canonical-keyboard/summary-cell.json) |  |
| 138 | hero video add | PASS | [video-final/pointer-hero-video-add.json](video-final/pointer-hero-video-add.json), [video-final/keyboard-hero-video-add.json](video-final/keyboard-hero-video-add.json) |  |
| 139 | hero video change | PASS | [video-final/pointer-hero-video-change.json](video-final/pointer-hero-video-change.json), [video-final/keyboard-hero-video-change.json](video-final/keyboard-hero-video-change.json) |  |
| 140 | hero video remove | PASS | [video-final/pointer-hero-video-remove.json](video-final/pointer-hero-video-remove.json), [video-final/keyboard-hero-video-remove.json](video-final/keyboard-hero-video-remove.json) |  |
| 141 | story video add | PASS | [video-final/pointer-story-video-add.json](video-final/pointer-story-video-add.json), [video-final/keyboard-story-video-add.json](video-final/keyboard-story-video-add.json) |  |
| 142 | story video change | PASS | [video-final/pointer-story-video-change.json](video-final/pointer-story-video-change.json), [video-final/keyboard-story-video-change.json](video-final/keyboard-story-video-change.json) |  |
| 143 | story video remove | PASS | [video-final/pointer-story-video-remove.json](video-final/pointer-story-video-remove.json), [video-final/keyboard-story-video-remove.json](video-final/keyboard-story-video-remove.json) |  |
| 144 | story rich text Bold | PASS | [rich/branch-story-pointer-Bold.json](rich/branch-story-pointer-Bold.json) |  |
| 145 | story rich text Italic | PASS | [rich/branch-story-pointer-Italic.json](rich/branch-story-pointer-Italic.json) |  |
| 146 | story rich text Bullet-list | PASS | [rich/branch-story-pointer-Bullet-list.json](rich/branch-story-pointer-Bullet-list.json) |  |
| 147 | story rich text Numbered-list | PASS | [rich/branch-story-pointer-Numbered-list.json](rich/branch-story-pointer-Numbered-list.json) |  |
| 148 | story rich text Add-link | PASS | [rich/branch-story-Add-link.json](rich/branch-story-Add-link.json) | Pointer passes. Existing keyboard toolbar gap reproduced. |
| 149 | story rich text Edit-link | PASS | [rich/branch-story-Edit-link.json](rich/branch-story-Edit-link.json) | Pointer passes. Existing keyboard toolbar gap reproduced. |
| 150 | story rich text Remove-link | PASS | [rich/branch-story-Remove-link.json](rich/branch-story-Remove-link.json) | Pointer passes. Existing keyboard toolbar gap reproduced. |
| 151 | form rich text Bold | PASS | [rich/branch-form-pointer-Bold.json](rich/branch-form-pointer-Bold.json) |  |
| 152 | form rich text Italic | PASS | [rich/branch-form-pointer-Italic.json](rich/branch-form-pointer-Italic.json) |  |
| 153 | form rich text Bullet-list | PASS | [rich/branch-form-pointer-Bullet-list.json](rich/branch-form-pointer-Bullet-list.json) |  |
| 154 | form rich text Numbered-list | PASS | [rich/branch-form-pointer-Numbered-list.json](rich/branch-form-pointer-Numbered-list.json) |  |
| 155 | form rich text Add-link | PASS | [rich/branch-form-Add-link.json](rich/branch-form-Add-link.json) | Pointer passes. Existing keyboard toolbar gap reproduced. |
| 156 | form rich text Edit-link | PASS | [rich/branch-form-Edit-link.json](rich/branch-form-Edit-link.json) | Pointer passes. Existing keyboard toolbar gap reproduced. |
| 157 | form rich text Remove-link | PASS | [rich/branch-form-Remove-link.json](rich/branch-form-Remove-link.json) | Pointer passes. Existing keyboard toolbar gap reproduced. |
| 158 | pricing rich text Bold | PASS | [rich/branch-pricing-pointer-Bold.json](rich/branch-pricing-pointer-Bold.json) |  |
| 159 | pricing rich text Italic | PASS | [rich/branch-pricing-pointer-Italic.json](rich/branch-pricing-pointer-Italic.json) |  |
| 160 | pricing rich text Bullet-list | PASS | [rich/branch-pricing-pointer-Bullet-list.json](rich/branch-pricing-pointer-Bullet-list.json) |  |
| 161 | pricing rich text Numbered-list | PASS | [rich/branch-pricing-pointer-Numbered-list.json](rich/branch-pricing-pointer-Numbered-list.json) |  |
| 162 | pricing rich text Add-link | PASS | [rich/branch-pricing-Add-link.json](rich/branch-pricing-Add-link.json) | Pointer passes. Existing keyboard toolbar gap reproduced. |
| 163 | pricing rich text Edit-link | PASS | [rich/branch-pricing-Edit-link.json](rich/branch-pricing-Edit-link.json) | Pointer passes. Existing keyboard toolbar gap reproduced. |
| 164 | pricing rich text Remove-link | PASS | [rich/branch-pricing-Remove-link.json](rich/branch-pricing-Remove-link.json) | Pointer passes. Existing keyboard toolbar gap reproduced. |
| 165 | Hero media actual Tab access | PASS | [gaps-complete/hero-tab-remove.json](gaps-complete/hero-tab-remove.json), [gaps-complete/tab-Edit.json](gaps-complete/tab-Edit.json) |  |
| 166 | Incomplete pricing CTA forward Tab | PASS | [pricing/branch-keyboard-incomplete-pricing-tab.json](pricing/branch-keyboard-incomplete-pricing-tab.json) |  |
| 167 | CTA click reopens after Escape | PASS | [reopen-final/branch-hero-reopen.json](reopen-final/branch-hero-reopen.json) |  |
| 168 | Save error explanation and recovery | PASS | [special-land/save-error-accessibility.json](special-land/save-error-accessibility.json), [special-land/save-error-recovered.json](special-land/save-error-recovered.json) |  |
| 169 | Empty story title and body | PASS | [empty-story/results.json](empty-story/results.json) |  |
| 170 | add and remove story section | PASS | [add-menu/branch-keyboard-add-story.json](add-menu/branch-keyboard-add-story.json) |  |
| 171 | add and remove logos section | PASS | [add-menu/branch-keyboard-add-logos.json](add-menu/branch-keyboard-add-logos.json) |  |
| 172 | add and remove gallery section | PASS | [add-menu/branch-keyboard-add-gallery.json](add-menu/branch-keyboard-add-gallery.json) |  |
| 173 | add and remove form section | PASS | [add-menu/branch-keyboard-add-form.json](add-menu/branch-keyboard-add-form.json) |  |
| 174 | add and remove document section | PASS | [add-menu/branch-keyboard-add-document.json](add-menu/branch-keyboard-add-document.json) |  |
| 175 | add and remove faq section | PASS | [add-menu/branch-keyboard-add-faq.json](add-menu/branch-keyboard-add-faq.json) |  |
| 176 | add and remove pricing section | PASS | [add-menu/branch-keyboard-add-pricing.json](add-menu/branch-keyboard-add-pricing.json) |  |
| 177 | add and remove summary section | PASS | [add-menu/branch-keyboard-add-summary.json](add-menu/branch-keyboard-add-summary.json) |  |
| 178 | faq duplicate occurrence removal | PASS | [duplicates-land/branch-keyboard-faq-duplicate-remove.json](duplicates-land/branch-keyboard-faq-duplicate-remove.json) |  |
| 179 | logos duplicate occurrence removal | PASS | [duplicates-land/branch-keyboard-logos-duplicate-remove.json](duplicates-land/branch-keyboard-logos-duplicate-remove.json) |  |
| 180 | FAQ duplicate occurrence editing | PASS | [duplicates-land/branch-keyboard-faq-duplicate-edit.json](duplicates-land/branch-keyboard-faq-duplicate-edit.json) |  |
| 181 | FAQ Add preserves open answers: ids | PASS | [faq-add/branch-ids-keyboard-state.json](faq-add/branch-ids-keyboard-state.json) |  |
| 182 | FAQ Add preserves open answers: legacy | PASS | [faq-add/branch-legacy-keyboard-state.json](faq-add/branch-legacy-keyboard-state.json) |  |
| 183 | FAQ Add preserves open answers: duplicate | PASS | [faq-add/branch-duplicate-keyboard-state.json](faq-add/branch-duplicate-keyboard-state.json) |  |
| 184 | Section pointer drag and keyboard move | PASS | [drag/section-pointer-drag.json](drag/section-pointer-drag.json), [drag/section-menu-move.json](drag/section-menu-move.json) |  |
| 185 | Whole form remove and recreate | PASS | [add-menu/branch-keyboard-add-form.json](add-menu/branch-keyboard-add-form.json), [add-menu/branch-keyboard-remove-form.json](add-menu/branch-keyboard-remove-form.json) |  |
| 186 | Form CTA reopens after Escape | PASS | [reopen-final/branch-form-reopen.json](reopen-final/branch-form-reopen.json), [traversal-stable/results.json](traversal-stable/results.json) |  |
| 187 | Pricing CTA reopens after Escape | PASS | [reopen-final/branch-pricing-reopen.json](reopen-final/branch-pricing-reopen.json), [traversal-stable/results.json](traversal-stable/results.json) |  |
| 188 | Hero delete | PASS | [extras-complete/panel-hero.json](extras-complete/panel-hero.json) | Hero has no removable section handle, as required. |
| 189 | Panel toggle and accordion collapse | PASS | [extras-complete/panel-hero.json](extras-complete/panel-hero.json) | Old side panel and its toggle are intentionally absent. |
| 190 | Pricing maximum of three plans | PASS | [canonical-keyboard/plan-add-dom.txt](canonical-keyboard/plan-add-dom.txt), [canonical-keyboard/plan-add.json](canonical-keyboard/plan-add.json) |  |
| 191 | Legacy FAQ first reorder, all answers open | PASS | [faq-reorder-pointer-recheck/results.json](faq-reorder-pointer-recheck/results.json), [faq-reorder/results.json](faq-reorder/results.json) |  |

## Evidence limits and cleanup

Keyboard actions generally start with programmatic focus and then use key events. Separate real Tab checks cover hero media and CTA traversal.

The scripts create owned fixtures through the preview API and perform the acceptance mutations through the UI. Saved-state waits, reloads, rendered snapshots and real API reads back each edit. Existing seeded video assets were selected but never edited or deleted. Earlier attempts with stale staging fixture names, immediate DOM counts, missing hover states or unnamed-dialog assumptions remain in their attempt directories; the coverage table points to the fresh successful rechecks.

The screenshot audit caught Playwright's default caret hiding and a logo thumbnail captured before decode. The final visual evidence uses `caret: initial` and waits for the thumbnail to decode. The wide thumbnail's container does not need to match the image aspect ratio because `object-fit: contain` preserves the whole image.

The fresh pointer link operations pass for story, form and pricing. Their existing keyboard toolbar gap remains a follow-up, as recorded in the supplied coverage table. The accepted concurrent-writer cases were not tested. Recorder route loading passed, but no recording was attempted with this headless browser's absent devices.

Final relevant suites have no console or page errors. The two aborted requests in canonical-keyboard and pointer-retry occurred during navigation. One 503 was deliberately simulated for the save-error check and then removed. Initial restrictive media-request attempts are superseded by the final media and visual runs. Browser navigation stayed on the PR preview; the app fetched its normal media and font dependencies.

All 44 created page IDs independently return 404. Both published URLs return 404. All four uploaded test media nodes were deleted and their path reads return 404. The logo picker initially defaulted to saving the test logo for new pages. Deleting that owned logo restored a null default with legacy preference. Later logo checks explicitly unchecked that choice. The cleanup details are in [cleanup.json](cleanup.json). Every raw Playwright browser process started by this run closed.

The self-contained HTML report is [report.html](report.html). Screenshots were opened with the image-viewing tool; the captions and paths are in [screenshot-inspection.json](screenshot-inspection.json).
