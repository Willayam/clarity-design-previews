# Independent diff audit

Head: 6c8c169b4f1fc05bebcb434e42432eac40f0cd89.
Base: origin/main at 59d7e0b9635fe0cdb37cf15b3115c0bf4aa28c29.
Read the complete 10,467-line triple-dot diff across 78 files. Parent verifier handles gates and preview browser proof. No product changes, commits, publishing, or remote writes were made for this audit.

## Finding

Should-fix. `editor/src/components/editor/row-keys.ts:8` uses array position as the React key and commit identity whenever a record lacks a unique string id. It ignores a unique seq_no. This directly violates BRIEF-COMMON's requirement to use stable identity for both React keys and commits. It affects ordinary records, not only malformed legacy data. New form fields from createDefaultField and new pricing plans from createBlankPricing lack ids. FormEditor.tsx:37 uses these positional identities; lines 50-53 resolve commits through them; line 83 hardcodes the new field's positional identity. PricingEditor.tsx:40 and lines 52-55 do the same for plans. FAQ, logos, gallery and summary also call rowKeys.

Exact reproduction, run at this head with Node's TypeScript stripping:

```javascript
import {rowKeys} from './editor/src/components/editor/row-keys.ts';
const a = {seq_no: '1', title: 'A'};
const b = {seq_no: '2', title: 'B'};
console.log(rowKeys('plans', [a, b]));
console.log(rowKeys('plans', [b]));
```

Actual output is `["row:plans:0","row:plans:1"]` followed by `["row:plans:0"]`. B's identity changes after A is removed, and takes A's old identity despite its unchanged unique sequence. Expected fix: resolve a unique stored id or unique seq_no and establish an explicit stable occurrence identity for records without either. Use that identity for keys and edits. Preserve existing stored content and order.

This is a proven code-rule violation. This audit does not claim a newly reproduced data-loss bug. The diff contains extensive forced-commit and focus-restoration tests for local structural edits, and those mitigations must be considered. Accepted concurrent whole-list overwrite behavior is excluded from this finding.

## Other conclusions and limits

The old panel's concrete controls have corresponding canvas implementations in the diff. Currency and updateMeta were unused BlockEditorProps, not an implemented currency control in the removed panel. Their removal does not establish a lost capability.

The diff removes Accordion, DynamicList, block-editors and use-block-reorder and their obsolete CSS. EditorWorkspace no longer renders an editor panel or panel toggle. Hero and story video edit callbacks, logo default choice and ThemeStylePanel wiring remain. No production Worker, authentication or published route implementation changes appear in this diff. Domain sequence comparison and pricing duplication do affect shared rendering order; tests explicitly cover the intended order.

Two follow-ups were identified without claiming a new product regression. SummaryTableEditor.tsx:420 and :432 retain tabIndex=-1 on column reorder and remove controls. This predates this PR; browser verification must not count programmatic focus as keyboard reachability. Also, the new optional tests/e2e/link-settings-card.spec.ts:43 calls the old always-present Add section button without first hovering a seam or opening a handle. The normal seeded hero-plus-story canvas only mounts that button after pointer hover, or when no movable sections exist. That test path appears stale and was not executed in this audit.

No independent browser, screenshot, API persistence or publish claims are made here. Those belong to the parent verifier's report. Static review cannot prove caret visibility, all keyboard paths, preview deployment identity, or live publishing parity.

## Whole-diff coverage

Every file below was read in the complete diff, including deleted implementations and test changes. The review covered canvas behavior, identity and commit targeting, focus and accessible controls, published markup and ordering, save-store integration, removed capabilities, CSS and lint scope, and updated verification scripts.

- `.agents/skills/verify-loop/features/journey-page-editor.md`
- `DESIGN.md`
- `css-budget.json`
- `docs/agents/guards.md`
- `editor-css-legacy-classes.json`
- `editor/src/components/Accordion.css`
- `editor/src/components/Accordion.tsx`
- `editor/src/components/MediaPicker.tsx`
- `editor/src/components/RichTextField.tsx`
- `editor/src/components/editor/CanvasReorder.tsx`
- `editor/src/components/editor/CtaRowEditor.tsx`
- `editor/src/components/editor/DynamicList.tsx`
- `editor/src/components/editor/EditablePdfFrame.tsx`
- `editor/src/components/editor/EditableText.tsx`
- `editor/src/components/editor/EditorTopbar.tsx`
- `editor/src/components/editor/FaqListEditor.tsx`
- `editor/src/components/editor/FormEditor.tsx`
- `editor/src/components/editor/FormFields.tsx`
- `editor/src/components/editor/GalleryEditor.css`
- `editor/src/components/editor/GalleryEditor.tsx`
- `editor/src/components/editor/InlineText.tsx`
- `editor/src/components/editor/LinkSettingsCard.tsx`
- `editor/src/components/editor/LivePreview.tsx`
- `editor/src/components/editor/LogosRowEditor.tsx`
- `editor/src/components/editor/LogosSection.tsx`
- `editor/src/components/editor/PricingEditor.tsx`
- `editor/src/components/editor/SummaryTableEditor.css`
- `editor/src/components/editor/SummaryTableEditor.tsx`
- `editor/src/components/editor/block-editors.tsx`
- `editor/src/components/editor/row-keys.ts`
- `editor/src/components/ui/button-base.tsx`
- `editor/src/components/ui/input.tsx`
- `editor/src/components/ui/label.tsx`
- `editor/src/hooks/use-block-reorder.ts`
- `editor/src/hooks/use-editor-page.ts`
- `editor/src/index.css`
- `editor/src/lib/focused-canvas-draft.ts`
- `editor/src/lib/journey-page-document-store.ts`
- `editor/src/lib/reorder.ts`
- `editor/src/lib/sync-editable-text.ts`
- `editor/src/routes/EditorWorkspace.tsx`
- `editor/src/styles/23-add-section.css`
- `editor/src/styles/24-block-reorder.css`
- `editor/tests/canvas-conflict-drafts.test.tsx`
- `editor/tests/canvas-empty-fields.test.tsx`
- `editor/tests/canvas-keyboard-controls.test.tsx`
- `editor/tests/canvas-list-focus.test.tsx`
- `editor/tests/canvas-logos-pdf-faq.test.tsx`
- `editor/tests/canvas-section-handle.test.tsx`
- `editor/tests/cta-row-editor-interaction.test.ts`
- `editor/tests/editor-topbar-loading.test.ts`
- `editor/tests/faq-conflict-edit.test.tsx`
- `editor/tests/faq-list-editor.test.ts`
- `editor/tests/focused-field-selection.test.tsx`
- `editor/tests/form-block-editor.test.ts`
- `editor/tests/form-canvas-editor.test.tsx`
- `editor/tests/gallery-editor.test.ts`
- `editor/tests/journey-page-domain.test.ts`
- `editor/tests/journey-page-preview-surface.test.ts`
- `editor/tests/journey-page-theme.test.ts`
- `editor/tests/journey-video-edit.test.tsx`
- `editor/tests/pointer-drag-session.test.ts`
- `editor/tests/pricing-canvas-editor.test.tsx`
- `editor/tests/summary-column-gestures.test.ts`
- `eslint-suppressions.json`
- `eslint.config.mjs`
- `package.json`
- `packages/journey-page-domain/src/blocks.ts`
- `packages/journey-page-domain/src/index.ts`
- `packages/journey-page-domain/src/lead-form-fields.ts`
- `packages/journey-page-domain/src/sequence.ts`
- `scripts/benchmark-route-loading.mjs`
- `scripts/check-css-budget.mjs`
- `tests/e2e/gallery-summary-persistence.spec.ts`
- `tests/e2e/helpers/staging-critical-flow-account.ts`
- `tests/e2e/link-settings-card.spec.ts`
- `tests/e2e/staging-critical-flow.spec.ts`
- `tests/e2e/staging-lead-form.spec.ts`
