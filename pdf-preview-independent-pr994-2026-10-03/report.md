# Independent preview verification

VERIFIED, PASS+NOTES. Independent runtime checks pass and the completed primary report and artifacts have been audited. Verified on 3 October 2026.

Target https://pr-994.clarity-video.workers.dev
Head ee27092c292980ea4836fec24f7ca580032750cf
Base e6b68052a8481a411b57436c3e0a2ccd46b55e4e
Stable patch 22a32b54af522d94a022c8d4ece01ccaaab01c50

This fresh verifier wrote no source code and gathered none of the primary evidence. No agents were spawned. T3 preview tools were unavailable. Verification used the repo control CLI and Playwright with isolated CONTROL_CLARITY_STATE under this evidence directory, real seeded userPro authentication and no mocks.

## Independent checks

| Check | Result | Evidence |
| --- | --- | --- |
| Authenticated target and deployed head/base | Pass | doctor.log |
| Preview CI 37123978785 | Pass, success at exact head | ci.json |
| Actual Home PDF upload | Pass, first-page image displays the unique fixture text | home-desktop-upload.png, network.json |
| Persisted thumbnail | Pass after reload and real asset API read | assertions.json, private-detail.json |
| Desktop document fit | Pass at 1440 pixels, 618 by 800 raster uses contain, preserves aspect ratio and fits parent | home-desktop-reload.png, assertions.json |
| Mobile document fit | Pass at 390 pixels, same raster preserves aspect ratio and fits parent | home-mobile.png, assertions.json |
| Browsing delivery | Pass, image requests and no source PDF or PDF renderer requests after reload | browse-network.json |
| Original document action | Pass, UI opens original and HTTP 200 application/pdf is byte-identical to uploaded 693-byte file | assertions.json |
| Private thumbnail | Pass, signed image 200 image/webp, unsigned 403 | assertions.json |
| Adjacent ordinary PNG | Pass, existing image completes with nonzero natural width | assertions.json, screenshots |
| Cleanup | Pass, only own synthetic document deleted through API, read-after-delete 404 | cleanup.json, process-cleanup.log |

The actual diff changes the base's unconditional document placeholder into a signed thumbnail with contain fit. Upload now renders from the local file and attaches a private image tied to the source. The base opens the original and the head preserves that action. The deployed image, nonzero natural dimensions, persisted thumbnail access and original byte comparison distinguish the new behavior from the base contract. I did not run the parent commit. The invalid-file placeholder is fallback evidence, not a historical before screenshot.

I inspected the independent desktop and mobile screenshots. Both show the blue first-page heading and complete white page with readable unique fixture text. No console errors occurred in the browsing check. A CLI selector syntax error was corrected before collection and was not a product failure.

## Limits

Production backfill was not run because R2 credentials are missing. Physical phones and customer PDFs were not tested. The PR documents the accepted existing placeholder-extension quirk and the backfill signal exit-status race. No production deployment or merge was attempted. Earlier unit, engine, backfill and security checks were not repeated.

Raw control state and private API evidence contain session or signed media data and must remain private. Screenshots contain synthetic QA data only. Primary fixtures were not changed by this verifier.

## Completed primary audit

Audited /Users/williamlarsten/Development/clarity-pdf-thumbnails-current/.context/verify-loop/pdf-preview-primary/report.md after it reached VERIFIED. Its scope and caveats accurately describe the retained artifacts. Reviewed raw successful attachment API bodies, API replay and source-mismatch results, media byte comparisons, all four Home layout records, both picker records, rename/open results, final doctor and console summary. Recomputed the four original fixture hashes. See primary-audit.json.

The primary checks show two successful attachments, replay returning attached=false, wrong-source requests returning 409, and unsigned image access returning 403. This is the deployed negative-path coverage audited here. Broader ownership/security checks remain the earlier passing checks supplied in the handoff and were not repeated.

I visually inspected Home frost and classic desktop captures, mobile card viewport captures, the final fresh-browser mobile frost capture, and desktop/mobile LibraryGrid captures. The final captures show recognizable blue first-page headings, white page edges and both page orientations with contain fit. The final report correctly excludes earlier offscreen paint captures as final proof. API records require loaded images with nonzero natural dimensions and exact API URL matches, so missing thumbnails would fail the recorded conditions.

The primary logger records one unidentified-resource 404 in the native PDF popup. Its source document returned 200 and exact original bytes. My independent UI Open and byte comparison also passed. Native browser PDF viewer rendering is not claimed. No /editor/api request occurred, so authorization-header forwarding on that route is not claimed; route coexistence checks were reused from the passed preview CI rather than repeated.

The primary fixtures remain untouched by this verifier for parent cleanup. No product defect was found in the verified scope. This verdict is evidence for the authorized shipping workflow, not a claim that production deployment or production backfill has occurred.
