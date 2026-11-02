Verdict: PASS+NOTES. The missing payment-button fill is fixed. This supersedes the earlier FAIL for that defect.

Head ea09b3151d97ffe0eda7b1623fad50d4298a1286. The preview reported this exact head before capture. Signed-in mock-account authentication succeeded. The diff from bc76f82d7d00c0779a36da763b296b640b288fd7 contains only the data-button-variant attribute and its regression assertion, two files with three insertions and one deletion. No generated documentation differs between these two heads.

The Update card action is visible on Home at 1440 and 390 CSS pixels in light and dark. Its computed background-color is transparent, with the intended nontransparent blue background-image gradient. Light mode uses oklch(0.591399 0.193505 262.9) to oklch(0.51324 0.2021 262.9), approximately #3c75ef to #215bd8. Dark mode uses oklch(0.660699 0.153005 259.8) to oklch(0.58562 0.1598 259.8), approximately #5791ef to #3e79d9. Text is oklch(0.985 0 0), approximately #fafafa, in both themes. These computed colours exactly match Home's existing Record video button.

The measured text-to-gradient-stop contrast is 4.04 to 5.66 in light mode and 3.00 to 4.07 in dark mode. Ratios use browser canvas conversion to 8-bit sRGB and the relative-luminance formula. This fixes the invisible action but is not a claim that the shared primary-button palette meets 4.5 everywhere. The shared palette needs a separate accessibility follow-up, especially in dark mode. No palette changes were made.

Upgrade to Pro was checked at 390 CSS pixels in light and dark. It has data-button-variant=link, transparent background and no gradient. Light text is oklch(0.546 0.215 262.9), approximately #2563eb, on white, with 5.17 contrast. Dark text is oklch(0.623 0.17 259.8), approximately #4484ec, on oklch(0.208 0.042 265.755), approximately #0f172b, with 4.89 contrast. Both labels fit and are visible. Themes were selected with the same root dark class that the app's theme resolver applies.

Ran pnpm --dir editor test tests/plan-warning-banner.test.tsx in a fresh detached checkout at head after frozen-lockfile installation with Node 22.23.1.

```text
Test Files  1 passed (1)
     Tests  10 passed (10)
  Duration  5.13s
```

Every direct database write targeted only clarity-pr-1634-auth and mock account acct_workos_user_01M3PV8N4H36ZZPHGXFXWCQPM3. Set its existing grant to trial ending 2026-11-09T12:00:00.000Z. Inserted proof-1634-sub with mock Stripe ID sub_proof_1634_mock, status past_due and the same future end. Deleted that subscription for the trial screenshots. Restored the grant to complimentary ending 2030-01-01T00:00:00.000Z. Readback confirmed the grant and empty subscription list exactly match the pre-run snapshot. The first database read and write hit fetch failures and were retried with retry.sh. The write retry succeeded once. Exact SQL is in recheck-write-ledger.sql.

Other writes were the preview login and normal app session/analytics bookkeeping, local scratch evidence and a disposable worktree, the published proof report, the PR Proof update and this verification comment. No customer records, production, staging, branch code, pushes to the PR branch or merges were involved.

Evidence is https://willayam.github.io/clarity-design-previews/proof-1634/ . The six recheck screenshots and recheck-colours.json supplement the earlier full matrix at bc76f82d7. Earlier passing checks were retained without rerunning, as requested. Earlier notes about Billing navigation, plan-request attribution and copy remain. Routing is steer and William has not signed off. Waved through is none.
