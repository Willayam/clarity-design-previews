**Verdict:** FAIL. The new payment warning's Update card action is nearly invisible in light mode. No code was changed.

**Head:** bc76f82d7d00c0779a36da763b296b640b288fd7
**Issue:** #1435
**Routing:** steer. William has not signed off or approved landing.
**PR:** https://github.com/Clarity-Video-HQ/clarity/pull/1634
**Preview:** https://pr-1634.clarity-video.workers.dev
**Published proof:** https://willayam.github.io/clarity-design-previews/proof-1634/
**Waved through:** none

### Defect

Put the mock Pro account into past_due with a future paid-through date, load Home or the editor, and use light mode at 390 or 1440 px. The new Update card link has near-white text on the white banner. It still opens Billing, but its label and outline are barely visible. This persists after theme transitions settle.

Computed styles show color oklch(0.985 0 0), parent background oklch(1 0 0), transparent background, background-image none and opacity 1. The new Link in PlanWarningBanner.tsx uses buttonVariants without data-button-variant. The shared gradient variables are declared on [data-button-variant], so --btn-gradient is empty on this link. PR #1590 has no banner or Update card control in this location. Its normal Home controls render correctly. This is a new broken call site, not a claimed regression in the shared primitive.

Evidence is payment-defect-light.png, payment-defect-dark.png and payment-style.json in the published report. The matrix includes the same defect on Home and in the editor at both widths. Matching a chosen round-2 variant no longer applies. William's 2026-11-02 decision selected one compact banner with changing wording.

### Acceptance criteria

1. **Real states, dates and counts.** PASS. Changed only the seeded mock account in clarity-pr-1634-auth. Captured real plan_get responses for early trial, final three days, final day, failed payment and trial-ended Free. Dates and day counts match the banner. Free responses carry the live-page limit of 3. See results.json and the labelled state screenshots.
2. **Dismissal and reloads.** PASS. Early, final-three-days and trial-ended banners remain dismissed after real document reloads. With the browser clock advanced while retaining the same database end date, early dismissal expires inside the final three days and daily dismissal expires after local midnight. Trial-ended dismissal remains after two days and another reload. Final-day and payment warnings have no dismiss control. See additional-results.json and results.json. Clock advancement tests the client boundary; database-derived plans were not intercepted or replaced.
3. **Action destination.** NOTE FOR WILLIAM. Keyboard activation of all five actions opens /settings/billing. This follows the coordinator's revised brief and differs from the issue's original checkout-or-portal wording. No checkout or payment was initiated. The payment action's visual treatment FAILS as described above.
4. **Desktop and phone appearance.** FAIL for the payment action. All 40 required After screenshots are published, covering five states, Home and editor, 1440 and 390 px, light and dark. Eight Before screenshots use PR #1590, which is main from before this PR plus a CSS token change. No baseline database was changed. Other banner text fits both widths.
5. **Folded-in #1436.** PASS for the Free explanation and capability claim. A dated trial lapse under 14 days shows the explanation. A lapse over 14 days shows none. A Free account edited the fixture title, reloaded the saved value, restored the title and reloaded again. The existing public fixture remained live at /page/4uxp6b with the Free footer. A real fake-camera recording produced a two-chunk draft titled Using video to increase sales meeting bookings. The take and its generated share page were then deleted. See free-results.json, take-cleanup.json and Free screenshots.

### Other required checks

- Plain Pro, staff and Free over 14 days show no banner. Their Home heading stayed at x=296, y=22 throughout the first-paint sample at 1440 px, matching PR #1590. No heading movement was observed in the four-second samples. This is bounded layout evidence, not a claim about every later interaction.
- Plan-request comparison found 1 request on each of four PR #1590 loads, versus 2, 3, 3 and 3 on PR #1634. The baseline is older than the analytics change 89dbea3fb already present in this PR's main base 13fa9c5f3ec4b970bad168e6be5b46b45818daa3. That change added separate ProductAnalytics plan reads, including on auth changes and focus. The banner itself consumes TrialAccessContext and does not request a plan. The requested previews are therefore not a clean runtime comparison for attributing extra calls to this PR. The counts are reported, not waved through or called a banner defect. A current-main baseline is needed to close that attribution gap. See counts-1590.json and counts-1634.json.
- Keyboard activation reaches Billing. Tab moves from the action to dismiss. After dismissal, focus is on the connected MAIN element with tabindex=-1. All three dismissible states passed this check.
- The deploy workflow on this head passed 4 preview smoke tests, 3 critical-flow tests with 1 skipped, and all 3 preview e2e tests. library-mutations.spec.ts passed in 20.9 seconds. The separate E2E Smoke workflow's execution job was skipped after impact detection, so its green wrapper is not the evidence. Source run https://github.com/Clarity-Video-HQ/clarity/actions/runs/41428445540 .
- The browser logged intermittent network failures for Mux thumbnails and remote fonts. They were retried during reloads and are not attributed to the banner. One login and one Share selector attempt needed correction or retry. The Share control becomes Share changes after a draft edit.

### Tests at head

Installed in a fresh detached worktree using Node 22.23.1 and pnpm install --frozen-lockfile --prefer-offline. Ran pnpm --dir editor test tests/plan-warning.test.ts tests/plan-warning-banner.test.tsx tests/protected-session-refresh.test.tsx.

```text
Test Files  3 passed (3)
     Tests  44 passed (44)
  Duration  3.20s
```

Enhancement. No red-to-green test is required. Doctor confirmed the exact head and a signed-in identity before evidence collection.

### Copy for William

Every banner string follows. Dates and day counts are inserted at runtime.

- Your Pro trial ends in {daysLeft} days.
- It ends on {date}.
- It ends on {date}. You'll move to Free. Your pages stay live.
- Your Pro trial ends within a day.
- Your payment failed.
- Update your card to keep Pro. Pro ends on {date}.
- Your Pro trial ended, so you're on Free.
- You can still record and edit. Your pages stay live.
- Upgrade to Pro
- Update card
- Plan warning
- Dismiss plan warning

The recording, editing and existing-live-page statements were exercised as described above. Free still limits new live pages to three.

### Write ledger and restoration

Every direct SQL statement, in execution order including repeated capture runs, is published in write-ledger.sql. All targeted clarity-pr-1634-auth and the one seeded mock account acct_workos_user_01M3PV8N4H36ZZPHGXFXWCQPM3.

- Updated its existing e2e access grant between trial and complimentary and changed ends_at for early trial, final three days, final day, recent expiry, old expiry and healthy Pro. Repeated the matrix to capture settled themes.
- Temporarily set system_role to system_admin for staff suppression, then restored NULL.
- Inserted the mock proof-1634-sub subscription with past_due, fake Stripe ID sub_proof_1634_mock and a future end. Deleted it between states and during restoration.
- Restored the grant to complimentary with ends_at 2030-01-01T00:00:00.000Z. All final user, grant and subscription rows read back exactly equal to the original snapshot after each run.
- Through the app, changed the seeded fixture e300555e-6ee9-5dda-aecb-26f50e242a73 title to Proof 1634 temporary edit and back to Fixture: every block, themed. Reload confirmed both writes. Draft revisions advanced, so the editor shows Changes not published even though the title value is restored. No publication action ran.
- Recorded one test take with asset ID a8DuYpFKmhlnUqxFMt6JJxpatPPQlU2Rib00crr1R2eQ. The recorder also created its share page c41b86fa-3a32-493b-acfa-2bbe1e5c7286. library_delete returned both IDs as deleted and movedToRoot as empty.
- Plan reads and authenticated browser flows also invoke the app's normal analytics/session bookkeeping. No manual analytics or session SQL was run.

No writes to PR #1590, staging or production. No branch edits, pushes or merges. GitHub metadata writes replace the existing issue proof and PR Proof section and add this run's verdict comment.
