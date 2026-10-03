# V5 Contextual studio

A review artifact, not a production build. Open `index.html` directly, or with `?view=library|editor|system` and `?theme=light|dark`. The page also listens for `postMessage({type:'clarity-preview', view, theme})` from a parent host and updates its URL to match.

Files: `index.html` (shell and icon sprite), `styles.css` (tokens and every rule), `app.js` (sample data, rendering, interactions). The font loads from `../assets/geist.woff2`. There are no other dependencies and no network calls.

## Purpose

The current Clarity chrome puts depth on everything: glass toolbars, beveled buttons, halos, a frost card rail. The user's complaint was that it looks cluttered and tries to do too much. V5 answers with a studio layout where the structure does the work instead of the surfaces.

Three ideas carry the direction.

1. Three regions, one language. Library and editor both use rail, pane, inspector. The rail is navigation (folders in the library, sections in the editor). The pane is where work happens (the media list, the page canvas). The inspector reads the current selection and offers its properties. A user who learns one screen has learned the other.
2. Chrome is flat and quiet; the content is framed. Panels are separated by hairlines, not shadows. Depth appears only on things that float over content: menus, tooltips, the contextual bar, dialogs. Media gets a dark framed backdrop so a 16:9 poster or a 9:16 portrait clip reads as the object, not the chrome.
3. Actions sit next to what they act on. A selected section on the page canvas grows a small contextual bar (move, hide, duplicate, delete). A selected row grows share and more buttons. Multi-select grows a floating selection bar. The top bar never changes.

## What the artifact covers

Library. Rail with All media, Recent, Shared links, Trash, one folder (Brand assets), New folder, and the workspace areas. Pane with crumbs, item count, New page, Upload, Record, a search field, the type segment (All, Videos, Pages, Documents), list or grid density. Column headers sort the list, and a second click on the sorted header reverses it; the sort menu appears only where there are no headers, in grid density and on phone. The root holds the six entries every direction shares, five media items and the Brand assets folder, which holds four images. Rows carry a 112 by 63 preview, title, type, length or size, views, modified, share and a menu; the age moves into the sub line only when the Modified column is off screen, so no fact prints twice. Folders show a dash in the length column because the sub line already carries their count. Keyboard: arrows, Shift ranges, Enter opens, Space toggles, Delete trashes with undo, F2 renames, Escape clears. At rest the inspector states the scope's count under the same rule as the pane head (a folder adds its created and modified dates) and waits for a selection. It then shows one item (preview, Open, Share, details with access as a plain value, link, engagement) or a multi-selection with bulk actions. Folders open in place; pages open the editor; videos and documents open a preview dialog that says playback is not part of the prototype.

Editor. The page "Welcome to your proposal" with an intro video, a value section with three points and a call to action. The first visit opens with the first section selected, so the contextual bar is on screen on arrival; later visits keep the user's selection. Sections are selectable from the rail or the canvas. Text that appears on the page (title, greeting, headings, body text, captions, points) is edited on the canvas only; the pane head shows the title read-only. The inspector holds what the canvas cannot show: page details (prospect, company), appearance (page theme, accent, type), link and access, engagement; or the selected section's properties (label, video source and options, the point list with add, remove and jump-to, layout, button label, link with validation, style, alignment, new tab). Structure actions (move, hide, duplicate, delete) live in the contextual bar on the selected section and in the rail's per-section menu, nowhere else. Add section offers text, video, points, documents and call to action. Preview hides editing chrome and offers desktop or phone width; Escape leaves it. Share is the one entry to the share dialog on this screen.

Share. One dialog used from the library row, the inspector, the editor header and the preview dialog. Copy writes a sample link to the clipboard and reports in a live region, including the failure case when the clipboard is unavailable. Access has three states with a short simulated update. Invite only reveals an invite field with validation, an empty state and an invitee list. Options cover required email, first-view notification and expiry. A dashed "Prototype states" segment in the footer shows the loading and error versions, so critics can see them without guessing a trigger. Copy link is the one primary button; Done is plain. Escape closes, focus enters on the Copy button and returns to the opener, which the caller passes in explicitly because Safari does not focus a button on click, or to the opener's replacement when the list or inspector re-rendered underneath. While any dialog is open the top bar and views are inert. When the dialog body re-renders (access change, invite added), focus is put back on the same control, or on the dialog itself while that control is disabled.

System. Color tokens for the current theme, each with its declared value (mixes show the base token and percentage) and the color the browser resolved, type scale, spacing, radius, elevation, motion rules, then state matrices for buttons, fields, checkbox and switch, tabs, segments, rail nodes, tooltip, menu, toast, long titles in four places, empty search, skeleton rows and an error banner with a simulated retry. Every group is labelled Live or Simulated. Simulated states use `.sim-hover`, `.sim-active`, `.sim-focus` and `.sim-selected`, which share the real selectors through `:is()`.

Record and Upload are prototype actions with explicit Demo labels. Record counts elapsed time and files a demo video with that length. Upload uses the local file picker and adds Demo items with a short busy state. Nothing is captured, uploaded or published. Download and playback report that they are not wired.

## Tokens

Declared in `styles.css`. Values are oklch; the system sheet shows what the browser resolved.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg-app` | oklch(95.2% 0.004 250) | oklch(14.5% 0.006 250) | app frame, editor canvas |
| `--bg-panel` | oklch(97.4% 0.003 250) | oklch(18.5% 0.006 250) | top bar, rail, inspector, transport rows |
| `--bg-content` | oklch(100% 0 0) | oklch(21.5% 0.006 250) | list, pane, cards |
| `--bg-raised` | oklch(100% 0 0) | oklch(25% 0.007 250) | menus, dialogs, contextual bar, buttons |
| `--bg-sunken` | oklch(96.2% 0.003 250) | oklch(17% 0.006 250) | fields, segment tracks, pills |
| `--bg-media` | oklch(22% 0.008 250) | oklch(12% 0.006 250) | framed media backdrop |
| `--bg-letterbox` | oklch(10% 0.004 250) | oklch(7% 0.004 250) | reserved for a player |
| `--fg-1` | oklch(20% 0.012 250) | oklch(93% 0.005 250) | primary text |
| `--fg-2` | oklch(45% 0.012 250) | oklch(72% 0.008 250) | secondary text, labels |
| `--fg-3` | oklch(53% 0.012 250) | oklch(63% 0.008 250) | meta text, resting icons |
| `--fg-4` | oklch(78% 0.008 250) | oklch(40% 0.008 250) | decorative only, never text |
| `--fg-on-media` | oklch(90% 0.005 250) | same | text over media |
| `--fg-on-media-2` | oklch(70% 0.006 250) | oklch(66% 0.006 250) | secondary text over media |
| `--bg-hover` | fg-1 at 5% | fg-1 at 6% | hover wash |
| `--bg-active` | fg-1 at 9% | fg-1 at 11% | pressed and selected chrome |
| `--line` | fg-1 at 10% | fg-1 at 9% | hairlines |
| `--line-strong` | fg-1 at 18% | fg-1 at 17% | control borders |
| `--line-on-media` | white at 16% | white at 12% | edges over media |
| `--accent` | oklch(47% 0.105 240) | oklch(76% 0.09 240) | accent text, focus ring, selected icons |
| `--accent-fill` | oklch(49% 0.11 240) | oklch(55% 0.12 240) | primary button, switch on, playhead |
| `--accent-fill-hover` | oklch(44% 0.115 240) | oklch(51% 0.12 240) | primary button hover |
| `--accent-fg` | oklch(99% 0 0) | same | text on accent fill |
| `--accent-soft` | accent at 10% | accent at 12% | selected rows, pressed quiet buttons |
| `--accent-soft-strong` | accent at 22% | accent at 24% | focus halo on fields, selected row hover |
| `--accent-line` | accent at 45% | accent at 50% | accent borders |
| `--ok` | oklch(52% 0.13 150) | oklch(72% 0.13 150) | success |
| `--warn` | oklch(62% 0.14 75) | oklch(78% 0.13 75) | warning |
| `--danger` | oklch(53% 0.18 25) | oklch(70% 0.16 25) | destructive |
| `--danger-soft` | danger at 10% | same | danger hover wash |
| `--danger-line` | danger at 45% | same | danger borders |
| `--shadow-raised` | 0 1px 2px black 6%, 0 8px 24px black 10% | 0 1px 2px black 30%, 0 10px 28px black 45% | menus, tooltips, contextual bar |
| `--shadow-sheet` | 0 0 0 1px line, 0 12px 40px black 18% | 0 0 0 1px line-strong, 0 12px 40px black 55% | dialogs, overlay panels |
| `--shadow-page` | 0 1px 2px black 5%, 0 16px 40px -16px black 14% | 0 1px 2px black 30%, 0 16px 40px -16px black 50% | the page frame on the canvas |
| `--scrim` | black 32% | black 50% | behind dialogs and drawers |
| `--toast-bg` / `--toast-fg` | fg-1 / bg-content | bg-raised / fg-1 | toasts and tooltips; dark mode adds a `--line-strong` border |

Percent mixes use `color-mix(in oklab, ...)` so one base token drives hover, active and line steps in both themes.

The Journey Page inside the editor has its own tokens on `.page-frame` (`--pg-bg`, `--pg-fg`, `--pg-muted`, `--pg-line`, `--pg-soft`, `--pg-accent`, `--pg-accent-fg`) with light and dark sets and four accent choices (blue, teal, graphite, plum). The page theme is light or dark per page and never follows the editor theme, so a dark editor still shows a light page when that is what the prospect will see.

## Type, radius, spacing, elevation, motion, states

Type. One family, Geist, fixed pixel sizes. Chrome: 20/24 600 summary numbers and the sheet title; 15/20 600 dialog titles; 14/20 600 pane titles and stat values; 13/18 400 body, controls, rows; 13/18 500 row titles and button labels; 12/16 500 segments, section heads, tooltips, pane meta; 11/14 500 meta, kickers, column labels. On coarse pointers body rises to 14/20 and meta to 12. Page content: 30/36 600 title, 22/30 600 section heading, 16/26 body, 15/24 point detail, 14/20 caption; phone drops the title to 24/30. Tabular numerals on every number column.

Radius. 4 inside segments, checkboxes and pills; 6 on buttons, fields, rows, rail nodes; 8 on cards, menus, the contextual bar, the video block; 10 on dialogs and the page frame. Avatars and switches are round.

Spacing. 4, 6, 8, 10, 12, 14, 16, 24, 36. Rail padding 8, node padding 8. Pane head 14 left, 10 right. Inspector sections 14. Dialog body 16 by 18. Canvas 28 by 24, page frame 36 by 48 (20 by 16 on phone).

Sizes. Top bar 44. Pane head 44. Toolbar 40. Controls 28 (32 for the top bar icon buttons), rows 68 with 112 by 63 thumbnails, menu items 30, rail nodes 30. On coarse pointers controls, menu items, rail nodes, tabs and checkboxes become 44 and rows 64; thumbnails stay 112 by 63 until the phone breakpoint, which shrinks them to 64 by 36. Rail 224 (56 when collapsed to icons). Inspector 328 by default, resizable between 260 and 520 by dragging or with arrow keys on the divider. Double-click resets.

Elevation. Three tiers. Flat: rail, inspector, toolbars, a hairline and no shadow. Raised: menus, tooltips, the contextual bar, hairline plus `--shadow-raised`. Sheet: dialogs and the overlay inspector on narrow screens, over `--scrim`, with `--shadow-sheet`. The page frame on the canvas gets `--shadow-page` so it reads as a document on a desk; this is the only shadow on a non-floating element.

Motion. 120 ms for hover, toggles and chevrons, 180 ms for the toast rise and the canvas width change in preview. Nothing animates for decoration. `prefers-reduced-motion` removes transitions, the toast rise, the busy pulse and the spinner rotation (the spinner becomes a dimmed full ring). Simulated loading waits shrink under reduced motion.

States. Every control has default, hover, pressed, focus, disabled, and where it applies busy, selected and invalid.

- Buttons: `.btn` default (raised fill, strong line), `.primary` (accent fill, white text), `.quiet` (no fill until hover), `.danger` (danger text, danger wash on hover). Hover and pressed mix 5% and 9% of fg-1 into the fill. Focus is the shared 2 px accent outline with 2 px offset. Disabled is 45% opacity with pointer events off. Busy keeps the label and swaps the leading icon for a spinner; the label never changes mid-action. `aria-pressed="true"` fills with `--bg-active`; on quiet buttons it uses accent text on `--accent-soft`.
- Fields: sunken fill, strong line; hover darkens the line; focus swaps the line for accent and adds a 2 px `--accent-soft-strong` halo; invalid uses the danger line and a danger message under the field; disabled is 50% opacity; read-only uses fg-2.
- Checkbox and switch: 14 px box, 30 by 18 switch; on is accent fill; mixed shows a bar; focus is the shared outline; hover strengthens the border or darkens the track.
- Segments: sunken track, selected option raised with a 1 px strong line; hover washes.
- Rows and cards: hover wash, selected `--accent-soft`, selected hover `--accent-soft-strong`, keyboard cursor a 2 px accent bar at the left edge (rows) or an accent border (cards). Selected row metadata and active rail counts use `--fg-2`; resting metadata keeps `--fg-3`. Row actions and checkboxes appear on hover, focus, selection, or always on coarse pointers.
- Rail nodes: hover wash, current `--bg-active`. Hidden sections strike their label.
- Menu items: hover and focus wash, danger items in danger text, checked radio items show an accent check, disabled items at 45%.
- Toast: `--toast-bg` with an inline action and dismiss; three at most; hovering pauses the timer.
- Inline editable text on the canvas: a 1 px strong line on hover, a 2 px accent halo on focus.

## Choices rejected

- Keeping the glass and bevel treatments on fewer elements. Half-measures leave two visual systems in one app; V2 covers the refinement path.
- A card grid as the only library view. Thumbnails at 272 px are large but tell you little without a selection model; the list with a 328 px inspector preview shows more items and a bigger preview of the one you care about. The grid stays as a density option.
- Floating property popovers on the canvas instead of an inspector. Popovers hide the rest of the properties and fight with the contextual bar. The inspector stays put; the bar carries only structural actions.
- Changing the top bar per screen. A stable top bar is what makes rail, pane and inspector feel like one app. Screen-specific actions live in the pane head.
- A dedicated section tree plus a properties accordion, as in the current editor. The rail already is the tree; the inspector already is the properties panel. One fewer region.
- Shimmering skeletons, orchestrated reveals, hover lifts. All removed; motion only reports state.
- A multi-hue palette for item types. Type is carried by the preview itself (dark media, white paper, window frame for pages, folder shape) and a text label; color stays for selection, focus and the one primary action.

## Mapping to existing Clarity primitives

| Existing | V5 equivalent | Notes |
|---|---|---|
| `Button` variant default on surface hero | `.btn.primary` | no gradient, no halo; same height at `size="default"` (28 instead of 32, 44 on coarse) |
| `Button` variant outline | `.btn` | raised fill with `--line-strong`, flat |
| `Button` variant ghost | `.btn.quiet` | wash on hover only |
| `Button` variant destructive | `.btn.danger` and `.btn.danger.quiet` | danger text, wash on hover; `.danger.primary` for the one filled case |
| `Button` dashed | `.btn.add` in the rail | dashed line, left aligned |
| `Button` size icon, icon-sm, icon-xs | `.btn.icon`, `.btn.xs.icon` | 28, 22 (44 on coarse) |
| `Surface` hero / panel / bar / media | removed | one flat altitude; depth comes from `--shadow-raised` on floating elements only. `ChromeBar` becomes `.ctx-bar`; `ChromeSegmented` becomes `.seg` |
| `Input` default / panel | `.input` | sunken fill replaces the transparent and muted variants; one look everywhere |
| `Input` inline | `[data-edit]` on the canvas | hover line, focus halo, no box until then; the only place page text is edited |
| `Input` glass | not needed | no translucent panels remain |
| `DropdownMenu` and items | `.menu` with `role="menu"` buttons | same structure; radio items via `aria-checked` and the check glyph |
| `Dialog` | `.scrim` plus `.dialog` | head, body, foot grid; focus trap, Escape, scrim click |
| `PageHeader` page / compact / toolbar | `.pane-head` | one 44 px row; title truncates; actions never wrap under the title. On phone New page and Upload fold into one "+" menu and Record and Details stay as icons |
| `LibraryToolbar` | `.toolbar` | search, type segment, density (not on phone), sort menu (grid and phone only; headers sort the list); wraps to two rows on phone |
| `FrostStage`, `FrostCardRail`, `FrostRailTip` | `.thumb` plus row actions, `.preview` in the inspector, `.tooltip` | the hover rail is gone; share and more live at the row end and always in the inspector |
| `MediaCard` | `.card` | same content, flat border, actions in the body |
| `Sidebar` | `.rail` | 224 open, 56 icons, drawer on phone |
| Editor right panel (380, accordion) | `.inspector` with `.sect` | 328 default, resizable; sections remember open state |
| `ChromeChip` | `.pill` | same role, four tones |
| Toast (sonner) | `.toast` | action and dismiss inline |

Tailwind mapping: the tokens here are plain custom properties and can be registered under `@theme inline` the same way the current `--color-*` tokens are. `--bg-*` maps to `--color-background`, `--color-card`, `--color-popover`, `--color-muted`; `--fg-*` to `--color-foreground` and `--color-muted-foreground` plus one new step; `--line` and `--line-strong` to `--color-border` and `--color-input`; `--accent-*` to `--color-primary` and `--color-ring`.

## Accessibility

- Every icon button has `aria-label`; tooltips are visual only and appear on hover and keyboard focus (`:focus-visible`).
- Focus is one shared 2 px accent outline. Fields replace it with an accent border and halo so the ring does not fight the field edge.
- Contrast. The selected row and active rail tint lowered the contrast of `--fg-3` metadata below 4.5:1 in the light-mode spot check. Those two states now use the stronger `--fg-2` token. Resting metadata keeps `--fg-3`, and `--fg-4` is reserved for decoration. The remaining contrast claims need measured browser verification.
- Touch. `@media (pointer: coarse)` raises every control, menu item, rail node and tab to 44 px, the switch hit area to 44 px tall, and shows row actions and checkboxes at rest.
- The library list is a `listbox` with `aria-multiselectable`, roving `aria-activedescendant`, and the keyboard model listed on the system sheet. Row buttons are reachable with Tab.
- Menus: `role="menu"`, arrow and Home/End navigation, Escape and Tab close and return focus, outside click closes.
- Dialogs: `role="dialog"`, `aria-modal`, labelled by the title, focus trapped in a cycle, the top bar and views carry `inert` while one is open, Escape closes, focus returns to the opener or to its re-rendered replacement (same id, or same label inside the same id scope, else the nearest focusable ancestor such as the list). Callers pass the opener in where the trigger is a button, because Safari does not focus buttons on click and the active element there would be the body.
- Re-rendering keeps focus. The rails, the list, the canvas and the inspectors are replaced wholesale; one helper remembers the focused control by a stable key (scope, section, section menu, section action, row action, sort header, inspector control) and focuses its replacement. Delete focuses the next section's rail node, else the Page node. Escape from the contextual bar lands on the section itself. A Move button that becomes disabled hands focus to its toolbar's first live button. A row removed by its own menu leaves focus on the list.
- Switching views (tab, URL, or host message) closes any open menu, tooltip, drawer or dialog first.
- The review tabs in the top bar are prototype chrome, dashed like the Demo pill and 24 px tall (32 on touch). They are not product navigation and do not follow the 44 px rule.
- Live regions: toasts (`role="status"`), copy feedback, the share dialog's loading note.
- Inline editing uses `contenteditable`. Every field carries `role="textbox"` and an `aria-label` (Page title, Greeting, Heading, Caption, Body text, Point, Detail); body text and captions carry `aria-multiline="true"`. Enter commits single-line fields and inserts a line in multiline ones; Escape leaves the field. These semantics come from the markup; no screen reader has read them yet.
- Reduced motion and reduced waits as described above.
- Theme follows `prefers-color-scheme` when no parameter is given; the toggle remembers for the session only.

## Responsive behavior

- 1440 and 1280: rail 224, inspector 328, list with all columns.
- 1100 and below: rail collapses to 56 px icons with tooltips; the Modified column goes; inspector 300.
- 900 and below: the inspector leaves the grid and becomes a right-hand overlay panel opened from the pane head's Details or Properties button and closed with its own button or Escape. The top-bar inspector toggle is hidden here, so each width has one opener.
- 700 and below: the rail becomes a drawer behind the pane head's menu button (the top-bar rail toggle is hidden so there is one way in); New page and Upload fold into one "+" menu whose items carry their labels, Record and Details stay as icons; the density segment and the column header row go, the list is the only layout and the sort menu returns to the toolbar, which wraps to two rows; rows keep thumbnail, title, meta and the menu; cards shrink; the canvas and page frame lose padding; dialogs become bottom sheets; toasts span the width.
- Nothing overflows horizontally: the app grid column is `minmax(0, 1fr)` so content can never widen the document, every grid column that can hold text uses `minmax(0, 1fr)`, titles truncate, the toolbar and galleries wrap, and the system sheet's wide state matrices scroll inside their own labelled, focusable region.

## Rollout risks

- The flat chrome depends on surface steps of 2 to 3 points of lightness. On uncalibrated or warm displays, rail and pane can merge. The hairlines are what keep the regions apart; they must stay.
- Removing `Surface` altitudes touches every Button call site. Doing it in one sweep is cleaner than carrying both systems, but it is a large diff.
- The inspector replaces the editor's 380 px accordion panel. Existing property editors (color picker, media picker, FAQ rows, CTA editor card) need to fit 328 px and the two-column `.fields` grid.
- Inline canvas editing and inspector inputs must share one source of truth. The prototype's `setPath` binding is small; the production editor already has a domain model that should drive both.
- The library list changes the selection model from card-first to row-first with an inspector. The home tree's shelves and folder cards go. Users who like the large cards keep the grid density.
- Portrait video in a 16:9 list thumbnail is pillarboxed; the inspector preview shows it at true aspect. The published page will need its own portrait block (the multi-track program).

## Implementation plan

1. Tokens. Add the V5 color, radius and size tokens to `index.css` beside the existing ones, mapped into `@theme inline`. Add the `.sim-*` state classes to the component stories so state matrices can be reviewed in the real app.
2. Primitives. Reduce `button.tsx` to four faces (primary, default, quiet, danger) with no surface switch; keep the size scale. Make `input.tsx` one sunken look plus inline. Keep `dropdown-menu.tsx` and `dialog.tsx`, restyle only. Replace `FrostCardRail` with row actions and the inspector preview.
3. Shell. One top bar component with the view tabs replaced by the real routes, a rail component with open, icon and drawer modes, a pane head component, an inspector shell with resizable width and remembered section state.
4. Library. Row and card renderers over the existing media list data, the type segment and sort menu over the existing filter and sort state, the inspector reading the selection. Keep the existing upload and record entry points behind the new buttons.
5. Editor. Section rail from the page outline, canvas selection and contextual bar, inspector sections per block type. The share dialog from the existing share route.
6. System sheet as a route behind a flag, so the state matrices stay reviewable after launch.
7. Measure contrast on real devices and run the e2e suite at 1280, 768 and 390 before any of this reaches main.

## Self-critique and remaining gaps

- No runtime verification happened in this environment. The sandbox blocked node and any browser, so the artifact was checked by reading, not by running. Syntax errors or layout breaks may remain. The first thing the next round should do is open the three views at four widths and both themes and watch the console.
- Contrast numbers above come from oklch lightness, not from a contrast checker on rendered pixels.
- The library list is a listbox with interactive children (checkbox, share, menu). That pattern is tolerated by screen readers but not clean; a grid role or a toolbar per row would be stricter.
- The inspector width is resizable but not remembered across views or reloads.
- Section reordering is by buttons and menu only; no drag and drop.
- The share dialog's loading and error states are reached through a prototype control rather than a real request. That is deliberate but means the transitions between normal and failed states are not shown.
- Video posters paint their base with `--bg-media` and carry a `--line-on-media` edge, so the dark theme gets a backdrop darker than the row. Whether a 12% against 21.5% step reads on an uncalibrated display is still to be checked in the browser.
- The editor rail collapsed to icons on tablet loses section labels; tooltips help, but a tablet user may prefer the drawer. Worth testing.
- The system sheet shows the declared and resolved color values for the current theme only; switching the theme re-reads them, but both themes are not shown side by side.
- The page frame uses one shadow, which is the only non-floating shadow in the system. If critics read it as a bevel, a hairline alone would do.

## Feedback round 1

Revised 2026-10-03 after the first independent critique and the parent's browser findings. Still checked by reading, not by running; the parent owns browser and syntax checks.

Accepted and done.

- Library inspector at rest. It now states the scope's count under the pane head's rule (one helper for both, folders counted as items everywhere, the rail included), adds a folder's own dates, and tells the user to select an item. The quick-action list, storage meter, type breakdown and global engagement list are gone. The invented storage line left the rail foot too.
- Editor duplicates. The pane-head title is read-only and follows the canvas. Title, greeting, headings, body, captions and point text are edited on the canvas only, so the inspector's Title, Greeting, Caption, Content and Heading fields are gone and the Points section is a list with add, remove and jump-to-page instead of a second set of inputs. The inspector's section menu and its Delete button are gone; structure actions live in the contextual bar and the rail menu only. "Manage access" is gone from both inspectors; Share is already on every screen that had it. "Page" section is now "Details". Engagement collapses by default in both inspectors and "Button clicks" became the derived "Viewers" count.
- Rows and toolbar. Headers sort the list; the sort menu shows only in grid density and on phone. The age in the sub line is hidden by CSS while the Modified column is visible and returns at 1100 px and below, where the column goes. Folders print a dash in the length column.
- Phone. The top-bar rail toggle is hidden at 700 px and below, so the pane head's menu button is the one way into the drawer. The density segment is hidden and the list is forced; the toolbar is two rows. The column header row is hidden.
- Media weight. Rows are 68 px with 112 by 63 thumbnails (skeletons match). Sample folders are cut to the one in the brief; the items from the other two sit at the top level, so the list opens on nine media rows and one folder.
- Parent findings. The app grid column is `minmax(0, 1fr)` and the views region has `min-width: 0`, so the fields state matrix (7 by 120 px minimum) can no longer widen the document; both state matrices are labelled, focusable scroll regions. Dialogs remember the opener by id or by label within the nearest id scope and focus its replacement after the list re-renders, else the nearest focusable ancestor. The share dialog keeps focus on the same control across body re-renders, or on the dialog while that control is disabled. The top bar and views are inert while a dialog is open. Switching views closes menus, tooltips, the drawer and dialogs first.
- Polish taken. "Public link" is a neutral pill with the globe; green stays for confirmations. The review tabs are dashed, smaller and labelled "Review" so they read as prototype chrome. The token sheet shows the declared value (mixes with their base token and percentage) above the resolved color, wrapping instead of truncating.

Judgment calls and deferrals.

- The inspector header still shows the page title next to the kicker, the same way it shows the selected section's label. It is a label of what the inspector reads, not an edit point. Dropping it would break the one structure used twice.
- Point text left the inspector because it is inline on the page, which the critique's rule asks for. The cost is that a keyboard user edits a point by jumping to the canvas from the list. If round 2 finds that slower than two inputs, the list rows can take an input back without changing the structure.
- The review tabs do not meet the 44 px touch rule on purpose; they are not product controls.
- Sort by type is reachable only from the sort menu (grid and phone). The list has no Type column, so a type sort chosen in the grid shows no sorted header after switching back to the list.
- Not verified at runtime: the inert attribute's effect on the drawer rail, the opener-replacement search after a rename, and the phone toolbar fitting in two rows on a 375 px coarse-pointer device. These are the first things to look at in the browser pass.

## Feedback round 2

Revised 2026-10-03 after the second independent critique and the parent's browser audit. Checked by reading, not by running; the parent owns browser and syntax checks.

Accepted and done.

- Openers per width. `.btn.drawer-only` and `.btn.overlay-only` now out-rank `.btn`, so the menu and Details buttons no longer show on desktop. The top-bar inspector toggle is hidden at 900 px and below, where the pane head's button owns the overlay; the rail toggle stays hidden at 700.
- Focus after re-render. One helper remembers the focused control by a stable key and refocuses its replacement. `setScope`, `selectSection`, `renderLibrary` and the editor inspector use it, so Enter on Recent, on a section, or on Move up, Hide, Duplicate and Delete keeps focus where the user was. Delete focuses the next section's rail node, else the Page node; Escape from the contextual bar lands on the section; a disabled Move button hands focus to its toolbar; a row removed by its own menu leaves focus on the list. Opening the editor focuses the selected section's rail node and Back focuses the list.
- Inline fields. Every `contenteditable` carries `role="textbox"` and an `aria-label`; body text and captions carry `aria-multiline="true"`. Not verified with a screen reader.
- Dark posters. The video poster base and the avatar ring use `--bg-media`, the portrait caption band uses `--bg-letterbox`, and `.thumb`, `.preview`, the open-preview and the record stage carry a 1 px `--line-on-media` edge. Paper previews keep `--line`.
- Arrival. The editor's first visit selects the first section so the contextual bar is on screen. Later visits keep the user's selection. The library default is unchanged; the parent captures the hero with a row selected.
- Share dialog. Done is a plain button and Copy link is the one primary. The Public pill left the Link head; the access radios below state it. Access is a plain value in the library inspector's Details grid and in the page inspector's Link and access section; no pill sits in a switch slot.
- Duplicates. The Show on page switch is gone, so the contextual bar and the rail menu are the two hide controls. The top bar shows the avatar only. On phone, New page and Upload fold into one "+" menu whose items carry their labels; Record and Details stay as icons.
- Sample fairness. The root holds the six agreed entries, Brand assets, Follow-up for Maya, Welcome to your proposal, Northstar launch walkthrough, Product overview and Project brief.pdf. The four extra items are gone; the long-title stress case stays on the system sheet. Counts are derived at render time.
- Polish taken. Openers are passed to dialogs explicitly for Safari. The Hide button is a plain action whose label and icon flip, with no `aria-pressed`. "Match app" is gone from the page theme. The Prototype states segment is dashed. A second click on the sorted header reverses it; the chevron points up for ascending and the direction is in the header's accessible name. The select chevron is a per-theme token. Coarse-pointer tablets keep 112 by 63 posters until the phone breakpoint.

Judgment calls and deferrals.

- Folder preview. The parent suggested a compact folder glyph row if the critic agreed; the critic did not take it up, so the folder keeps its 112 by 63 tile. The tile is the only place the folder shows what it holds.
- Row Share and More stay Tab stops and Shift+F10 was not added. Changing the list's tab model without a browser pass could break keyboard access to those two actions. It stays on the list for round 3.
- Grid density stays. The parent asked for it to remain unless it blocked something, and it does not.
- Not verified at runtime: where focus lands after each re-render path, the textbox and multiline semantics with a screen reader, the dashed segment and the token chevron in both themes, the coarse-pointer sizes (the audit used a fine pointer), and the phone "+" menu opening the file picker from a menu item. These are the first things for the browser pass.

After the final author pass, the dark tooltip and toast tokens were aligned with the existing raised surface, text, and border tokens. This removes the bright labels that prompted the review. The change was checked in CSS only; browser verification remains with the parent.
