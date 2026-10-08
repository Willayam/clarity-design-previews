# Design system

Keep using shadcn Base UI. The shared primitives live in `editor/src/components/ui/`. Feature components stay beside the feature they serve. Start here before adding or styling a control.

[The inventory](inventory.md) lists all named components, exports, direct usages, variant definitions, CSS selectors, tokens, and legacy allowances. Generate it with `pnpm design:inventory`. Build the public review with `pnpm design:catalogue`. The catalogue renders the real shared components with mock data.

## Choose a component

| Need | Use | Guidance |
| --- | --- | --- |
| Action that looks like a button | `Button` | Pick a role and size below. Add a missing repeated treatment to this primitive. |
| Pressable thumbnail, drag handle, disclosure, or sortable heading | `ButtonBase` | Carries its own layout. Keep keyboard focus and an accessible name. Do not use it to create a second painted button system. |
| Navigation styled as a button | An anchor or router `Link` with `buttonVariants` | Preserve native link semantics. Base UI Button applies button behavior to non-native elements. Do not use `Button render={<a ... />}` for navigation. |
| Text, password, or numeric field | `Input` and `Label` | `default` for forms, `panel` for properties, `inline` for in-place edits, `glass` over the auth photograph. `InputAdornment` holds trailing controls. |
| Search | `SearchInput` | Includes the icon and consistent toolbar sizing. |
| Multiline text | `Textarea` | `default` or `panel`. |
| Checkbox, radio, toggle, slider | `Checkbox`, `RadioGroup` + `RadioGroupItem`, `Switch`, `Slider` | Native file and hidden inputs are appropriate platform controls. The current raw-input rule also exempts checkbox, radio, and range, so it does not fully enforce this guidance. |
| Select | `Select` parts or `NativeSelect` | Use `NativeSelect` for a normal browser select. Use `Select` for the existing popup treatment. |
| Exclusive short choices | `SegmentedControl` | Reuse the labelled radio group. `ChromeSegmented` serves the compact editor toolbar treatment. |
| Menu | `DropdownMenu` parts | Use the shared trigger and content. Let the primitive own popup paint and focus behavior. |
| Dialog | `Dialog` parts | Reuse `DeleteConfirmationDialog` for destructive confirmation and the existing media dialogs for media flows. |
| Tooltip | `Tooltip` parts | A tooltip supplements an accessible name. It does not replace one. |
| Status or notification | `Badge`, `toast`, `Toaster` | Toast variants follow the existing notification contract. |
| Container or separator | `Card` parts, `Surface`, `Separator`, `ChromeSeparator` | Pick the surface based on content behind it. Do not manufacture a background to justify glass. |
| Table | `Table` parts or `DataTable` | `DataTable` handles the existing sorting and empty states. Use `ButtonBase` for sortable headers. |
| Navigation layout | `Sidebar` parts, `AppShell`, `AppSidebar`, `PageHeader`, `SectionNav` | Compose the existing app shell before making another navigation pattern. |
| Editor property | `EditorField`, `ControlRow` and fields in `components/editor/FormFields.tsx` | These already compose the primitives. Avoid rebuilding labels, resets, and property controls in each block editor. |
| Tabs | `Tabs` parts | Defined in the library but no direct app JSX usage was found. Do not treat that as proof it should be removed. |

Import primitives from their existing files. A barrel, component registry, or second library is not needed to make them discoverable.

For navigation, follow [shadcn's link guidance](https://ui.shadcn.com/docs/components/base/button#as-link) and apply the exported `buttonVariants` helper to the anchor or router Link. Use Base UI's `render` prop for action triggers and other supported compositions. Existing Button-based navigation callers need a separate migration and rendered semantics check.

## Buttons

The same Button reads the nearest `Surface`. `hero` is the default. `panel` removes the hero depth, `bar` supplies a floating glass pill with transparent controls, and `media` supplies dark chrome over media. Dialogs and menus reset context at their portals. Choose a Surface for the container, rather than painting each button at the call site.

| Role | Variant | Where to use it |
| --- | --- | --- |
| Primary action | `default` | Save, publish, submit, record. |
| Secondary action | `outline` | Cancel, filters, alternate actions. |
| Quiet action | `ghost` | Toolbars and less prominent actions. |
| Destructive action | `destructive` | Delete and destructive confirmations. |
| Action in running text | `link` with `size="inline"` | A text action without a box. Use an actual link for navigation. |
| Add placeholder | `dashed` | The existing add row in property panels. |
| Ink-only icon in a field | `plain` | Muted until hover or pressed. |
| Marketing trial CTA | `gold` | Marketing only. |
| Marketing header CTA | `ink` | Marketing header and established light marketing surfaces. |
| Upstream secondary | `secondary` | Defined for compatibility. No direct caller selects it. Prefer `outline` for new secondary actions. |

| Context | Size |
| --- | --- |
| Normal control | `default`, 32px |
| Dense controls | `xs`, 24px, or `sm`, 28px |
| Headline action | `lg`, 40px |
| Search toolbar | `toolbar`, 36px with a 44px coarse-pointer minimum |
| Toolbar icon | `icon-toolbar` |
| Labelled toolbar action that collapses on phones | `toolbar-collapsing` |
| Auth action | `xl`, 52px |
| Marketing CTA | `cta`, 48px |
| Running text | `inline` |
| Icon | `icon`, `icon-xs`, `icon-sm`, `icon-lg` |

Give icon buttons an `aria-label`. Mark a button's own pending work with `aria-busy` and `disabled`. The shared busy style preserves its visual strength. Test focus, hover, pressed, invalid, unavailable, and pending states when changing the primitive. Coarse-pointer and Surface rules can override a size's nominal height.

```tsx
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';

<Surface surface="panel">
  <Button variant="outline">Cancel</Button>
  <Button disabled={saving} aria-busy={saving}>Save</Button>
</Surface>
```

`data-button-surface="none"` is an existing escape hatch. It opts out of hero faces and has several legacy marketing uses. It is not a substitute for adding a shared variant when the treatment repeats.

## Styling ownership

- `editor/components.json` configures shadcn `base-nova`, Base UI, Lucide, and the `@/components/ui` alias.
- `editor/src/index.css` owns app tokens, Tailwind theme mappings, glass utilities, button face tokens, auth tokens, marketing tokens, and motion helpers. Read the values there. Do not copy colors, radii, or shadows into feature files.
- `editor/src/components/ui/` owns primitive appearance, variant definitions, interaction states, and accessibility behavior. Outside that directory, use component props and layout classes.
- `editor/src/styles.css` imports Geist and the two remaining global CSS partials. The inventory lists the other legacy and legal stylesheets with their selectors and tokens.
- Published Journey Pages have a separate customer-branded contract in `packages/journey-page-domain/src/journey-page-styles.ts` and the SSR renderer under `workers/frontend-router/src/public-page-delivery/`. `LivePreview` must retain that markup and rendering parity. Migrating its raw form elements to app chrome would change the customer page.
- `DESIGN.md` explains visual intent. Some code references are stale, including the deleted `ui/chrome.css` path. The current source locations and values in this inventory take precedence for implementation. Do not recreate deleted styling files from that prose.

## Enforced reuse

`pnpm lint` already errors on raw buttons, ordinary inputs, selects, textareas, labels, and tables outside ui/. Existing violations use the shrinking `eslint-suppressions.json` baseline. It also errors on primitive restyling, raw colors, arbitrary values, inline styles, unknown classes, and dynamic class construction through `@shadcn/lint`. The ui/ directory is exempt from the restyling rule because it defines the paint. Other design rules still apply there.

The import rule also errors on new Base UI, Radix, and CVA imports outside ui/. Three existing files may import only their current modules: `CtaRowEditor` uses Popover, `FormFields` uses Radio and RadioGroup, and `PageStatsContent` uses Accordion. A different low-level module in those files still fails. This rule covers static imports and re-exports. It does not ban domain components or every possible dynamic loader.

`pnpm css:budget` prevents growth in legacy stylesheets, CSS imports, legacy class names, and important utilities. `index.css` is deliberately outside that size budget. It is a reviewed token source, not a place to hide feature CSS. Run `pnpm lint:prune` and `node scripts/check-css-budget.mjs --update` only after removing legacy code. Never expand baselines to pass a new violation.

New feature compositions are allowed. Before adding a shared primitive or variant, check the inventory, state why an existing primitive cannot serve it, and define the treatment in ui/. Update this guide and regenerate the inventory in the same change. This is a code-review rule, not a frozen list of every allowed React component.

## Review findings and refinement order

The first scan found 25 shared UI modules and 105 named UI declarations, including internal helpers and aliases. Button has 181 direct JSX sites and ButtonBase has 42. The app already has a central control system. Moving all feature components into ui/ would blur its ownership.

1. Consolidate existing Button overrides at their source. `TeamsRoute.tsx` has custom painted CTAs using `data-button-surface="none"`. `ContactUsRoute.tsx` overrides disabled paint. Compare those actual states before replacing them with a shared marketing treatment. The inventory's Button section identifies every caller.
2. Finish raw controls in `HomeTreeRoute`, `ContactsIndexRoute`, `LibraryGrid`, `EditorWorkspace`, and `AddSection`. Choose Button for actions and ButtonBase for tiles and hit areas. Preserve focus, drag, and pointer behavior. Leave Journey Page parity controls in `LivePreview` to a separate parity-tested change.
3. Review the direct Popover, Accordion, and editor radio treatments. Extract a shared wrapper only when the same intent repeats. The editor Accordion has reorder and reveal behavior, so sharing its name with an analytics accordion does not make them interchangeable.
4. Reduce restyling and literal-value exceptions as each affected screen is refined. The first scan has 160 `no-restyle`, 64 arbitrary-value, 46 raw-color, and 40 inline-style suppressions. These are counts by rule, not unique components or automatic redesign instructions.
5. Review unused definitions after checking value references and dynamic consumers. Tabs and several menu/select/table parts have no direct app JSX sites. Keep upstream parts that are useful to compose the installed primitives. Delete proven dead custom code.

This pass inventories source and demonstrates the current primitives. It does not establish contrast or interaction parity for every feature screen, and it does not redesign those screens. Refinements should proceed through small changes to a primitive and its affected callers, with rendered state checks.

Tracked work: https://github.com/Clarity-Video-HQ/clarity/issues/1380.
