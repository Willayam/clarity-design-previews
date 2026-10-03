# V3: flat minimal

A review prototype, not a production build. Nothing here has been run against the real app, and this document does not claim production readiness.

Files: `index.html`, `styles.css`, `app.js`. Open `index.html?view=library|editor|system&theme=light|dark`. The page also listens for `postMessage({ type: 'clarity-preview', view, theme })` from a parent frame and updates its URL and state.

## Purpose

The current chrome layers glass, gradients, bevels and halos on every control, and the library puts item actions on top of the thumbnails. The user called that cluttered and asked for alternatives. V3 is the flat answer: one typeface, a small neutral scale, one accent, and hairlines where a region ends. Media is the only thing on screen with colour and depth. Every action for an item lives in the toolbar, the inspector or a menu, never over the media.

The structural change, not a recolour, is this:

- The library is a list by default, with a grid as the alternative, two densities, and a 344px inspector on the right that opens from the Details button or `]` once something is selected and keeps that choice for the session. Today the library is shelves of 272px cards with hover rails.
- The toolbar is a fixed 40px row under the header. With nothing selected it holds the type tabs and the view controls. A selection adds a right-hand column, the same width as the inspector, with the count, Share, Open, the item menu and the Details toggle. Nothing is disabled at rest.
- The editor replaces the app sidebar with a section list on the left, keeps the canvas in the middle, and puts properties on the right. The properties tabs sit in the toolbar's right column, above the panel they control.
- The sidebar narrows from 272px to 232px and loses its decoration. The page title moves from a 36px heading into the breadcrumb, which gives the content 36px back.

## What the artifact covers

Library: sidebar with folder tree, breadcrumb, search, New menu, Upload, Record as the primary action, type tabs with counts, list and grid, two densities, sort and grouping in a Display popover, multi-select with keyboard, a selection toolbar with Share and Open, an inspector for one or many selected items, item menu with create page, details, rename, move, duplicate, download and delete. Record and Upload open dialogs that add sample items, including a processing state that resolves after a few seconds. Folders open in place.

Editor: "Welcome to your proposal" with an intro video, a value section and a call to action. Section list with reorder, hide, duplicate and delete. Canvas with a selection outline; the section name appears on hover and focus only. Properties for the section, the page and the theme, including the page title. The Page tab reports the sharing state; the header's Share button opens the dialog, and the tab does not edit link settings. Undo and redo. Desktop and phone canvas widths. Preview dialog. Share from the header.

Share: a dialog with a link switch, the public link, copy with feedback, access choice, expiry and a notify switch. It is the only place link settings change. For a page the switch is labelled Published, with the caption Draft when off, so the dialog and the Page tab use one word for one fact, and with the switch off the dialog is that one row. Empty, loading and error states are reachable from a prototype-only switch in the footer, and the empty state is also the natural state for items without a link. Escape closes, focus moves to Copy on open and back to the opener on close, and the clipboard failure path selects the link instead of pretending.

System: both token sets with hex values, type scale, spacing, radii and elevation, button, field and selection matrices with simulated and actual states marked, tabs, menu, tooltip, toast, three share dialog states, list and grid at two densities, the long-title stress case, empty search, loading and error affordances, and the icon sheet. The library itself lists the six agreed items only.

Responsive: desktop 1280 and 1440, tablet 768, phone 390 and 375. Below 1000px the inspector hides behind a Details menu item, and the editor's section list and properties become drawers opened from the toolbar; below 760px the sidebar becomes a drawer, a bottom selection bar replaces the toolbar actions, and dialogs become bottom sheets.

## Rationale

Flat is not the same as empty. The density comes from a 13px body on a 20px line, 56px rows, 40px thumbnails and tabular numbers, not from decoration. Hierarchy comes from four text roles and two weights, so a row title, its meta and a column head are told apart by colour and size rather than by boxes.

The primary button is ink, not blue. That leaves the accent for the three things that must read as state: selection, focus and checked. A blue primary next to a blue selected row makes both weaker.

Hairlines do a job or they are not there. The sidebar, header, toolbar, inspector and list rows each get one. Cards get none; their thumbnail edge and their caption are enough.

Pressed is a colour step, never a translate. Movement on press was one of the things the user called out as trying too hard.

Record is the primary header action. The product's loop starts with a recording, and the page is usually created from a video. New page lives in the New menu and in the video's item menu as "Create Journey Page", and on the empty Pages tab. If William prefers New page as primary, the change is one class.

Documents and images share one tab. The library has five kinds and a phone toolbar has room for four tabs. Images are rare in the sample data and in the product they are attachments to pages, so they sit under Documents. A fifth tab is a one-line change if the count justifies it.

## Choices rejected

- A card grid as the default. Cards show less per screen, hide age and views behind hover, and are what the user is reacting against. The grid stays as an option at two densities.
- Hover rails on thumbnails. Actions that appear on hover do not exist for touch or keyboard, and they draw on top of the one thing on screen that should be left alone. The toolbar column and the item menu replace them.
- A blue primary button. See above.
- Shadows for panels. Two levels only: a hairline, or a line plus one shadow for things that float.
- Icon-only toolbar menus for filter and sort. The type filter is the most used control in the library, so it is spelled out as tabs with counts. Sort and density, which are set once, go into the Display popover.
- A separate page title heading above the toolbar. The breadcrumb carries it.
- Modals for details. On desktop the inspector opens from Details or `]` for the selection; the Details dialog exists only below 1000px.
- A resting inspector. Round 1 showed workspace analytics with nothing selected. That is a dashboard, not a detail panel, and the sidebar already has an Analytics destination. The panel now exists only for a selection.
- Fluid type and clamp sizing. Product UI at fixed pixel sizes, with structural breakpoints.

## Tokens

All values are hex. Each scheme is one block in `styles.css` on `:root, .light` and `.dark`, so a panel can force the other scheme by class, which the system page uses.

| Token | Light | Dark | Use |
|---|---|---|---|
| bg | #ffffff | #0e0e10 | Content surface |
| bg-sunken | #f8f8f9 | #09090b | Sidebar, section list, canvas, read-only fields |
| bg-hover | #f3f3f5 | #17171a | Rows, cards, ghost buttons under the pointer |
| bg-active | #ebebee | #1f1f23 | Current nav item, pressed segment, thumbnail base |
| bg-pressed | #e2e2e6 | #27272c | Secondary and ghost buttons while pressed |
| bg-selected | #eef2fe | #162140 | Selected rows and cards |
| bg-selected-hover | #e4ebfd | #1b2950 | Selected rows under the pointer |
| bg-raised | #ffffff | #19191c | Menu, popover, dialog |
| line | #e9e9ec | #222226 | Hairlines between regions and rows |
| line-strong | #d4d4d9 | #34343a | Secondary buttons, segments, overlay edges |
| line-field | #929299 | #5f5f66 | Inputs, checkbox border, switch track |
| text | #18181b | #ededf0 | Titles, values, primary labels |
| text-2 | #52525b | #aeaeb6 | Panel body, secondary labels, sidebar items |
| text-3 | #65656e | #96969f | Meta, hints, column heads, section labels |
| text-disabled | #a3a3ac | #55555d | Disabled controls only |
| accent | #2453e3 | #7c9eff | Selection, focus ring, checked, links |
| accent-hover | #1d47c9 | #93afff | Links under the pointer |
| accent-pressed | #1a3db5 | #a8c0ff | Reserved |
| on-accent | #ffffff | #0e0e10 | Text on accent fills |
| ink | #18181b | #ededf0 | Primary button, workspace mark, canvas section chip |
| ink-hover | #2c2c31 | #ffffff | Primary button under the pointer |
| ink-pressed | #000000 | #d6d6db | Primary button while pressed |
| on-ink | #ffffff | #0e0e10 | Text on ink |
| float-bg | #18181b | #19191c | Tooltip and toast, dark in both schemes |
| float-text | #ffffff | #ededf0 | Text on float-bg |
| float-line | #18181b | #34343a | 1px edge of tooltip and toast, invisible in light |
| danger | #c4281c | #ff6b5e | Delete, errors, invalid fields |
| danger-hover | #a9201a | #ff8277 | |
| danger-pressed | #8f1a15 | #ff9a90 | |
| on-danger | #ffffff | #0e0e10 | |
| success | #1a7f4b | #4cc38a | Published, link on |
| warning | #a15c07 | #e5a13a | Expiring soon, the Simulated marker |
| rec | #e5342a | #ff4d42 | The record dot only |
| scrim | rgba(24,24,27,.4) | rgba(0,0,0,.56) | Behind drawers and dialogs |
| media-edge | rgba(24,24,27,.08) | rgba(255,255,255,.08) | 1px inset on thumbnails and media |
| shadow-overlay | 0 1px 2px rgba(24,24,27,.06), 0 12px 32px -12px rgba(24,24,27,.24) | 0 1px 2px rgba(0,0,0,.4), 0 16px 40px -12px rgba(0,0,0,.7) | Menus, popovers, dialogs |

Page theme tokens (`--page-accent`, `--page-bg`, `--page-text`, `--page-muted`, `--page-line`, `--page-radius`, `--page-font`) belong to the recipient's page, not the chrome, and are set per page from the Theme tab.

## Type

Geist from `../assets/geist.woff2`, variable weight, one family. Sizes are fixed pixels.

| Size / line | Weight | Where |
|---|---|---|
| 24 / 32 | 600, -0.02em | Design system page title only |
| 20 / 28 | 600, -0.015em | Stat values, detail titles |
| 15 / 20 | 600, -0.01em | Dialog and inspector titles |
| 14 / 20 | 500 | Breadcrumb, comfortable card titles |
| 13 / 20 | 400 and 500 | Body, rows, controls. Row titles and buttons are 500 |
| 12 / 16 | 400 and 500 | Meta, column heads, field labels, hints, tags in the sidebar |
| 11 / 16 | 500 | Tags, keyboard hints, canvas section labels |

Numbers in rows, meta and stats use tabular figures. On a coarse pointer, text inputs are 16px so iOS does not zoom.

## Spacing and sizes

A 4px base. Page inset 20px on desktop, 16px on phones. Fixed chrome: header 48, toolbar 40, control 32, small control 28, sidebar 232, inspector 344, row 56 (compact 32), thumbnail 40 tall, grid tile minimum 212 (compact 156), card padding 8. Menu items 28, dialog padding 20, inspector section padding 14 top 16 bottom.

On a coarse pointer, and at any width up to 760px, every interactive hit area is at least 44: controls, small controls, menu items, row and card menus, section tools, the checkbox hit area, the colour chips, the switch, the folder disclosure and the toast action. The toolbar grows to 48 to hold them and compact rows to 44 so hit areas do not overlap. Glyphs keep their size; the box around them grows. The 16px input size stays coarse-only, since it exists for iOS zoom.

## Radius

4 for tags, checkboxes, keyboard hints and the canvas section label. 6 for controls, inputs, thumbnails and the primary button. 8 for menus, popovers and toasts. 10 for cards. 12 for dialogs, 14 on the top corners of a phone bottom sheet. Nothing else.

## Elevation

Two levels. Level 0 is a hairline in `line`. Level 1 is a 1px `line-strong` edge plus `shadow-overlay`, used only by menus, popovers and dialogs. Toasts and tooltips use the float tokens, dark in both schemes with an edge that shows only in dark, and need no shadow. Thumbnails and media get a 1px inset `media-edge` so a white page preview has an edge on a white row. Drawers on phones use the scrim, not a shadow.

## Motion

One duration for state, 120ms, on background and colour only. Menus and popovers fade in with a 2px rise over 120ms; dialogs over 140ms with a 4px rise; toasts over 160ms. Drawers slide over 180ms. Spinners turn at 0.7s. The record dot pulses. Nothing moves on press, nothing animates on load, and `prefers-reduced-motion` removes every transition and animation except the spinners, which keep turning because they mean something is still running.

## State rules

Every control has default, hover, pressed, focus, disabled and busy, and the system page shows all six for buttons.

- Hover is one step on `bg-hover`, or `ink-hover` and `danger-hover` on fills.
- Pressed is one more step, `bg-pressed`, `ink-pressed`, `danger-pressed`. No translate, no shadow change.
- Focus is a 2px `accent` outline, offset 2px outside the control, drawn inside for inputs, segments, tabs and rows so it does not clip.
- Disabled drops text to `text-disabled` and removes fills and strong borders. Disabled is not dimmed with opacity, except checkboxes and switches, which keep their shape at 45%.
- Busy keeps the label and the width and replaces the icon slot with a spinner. A button is never relabelled while it works.
- Selected rows and cards use `bg-selected`; selected plus hover uses `bg-selected-hover`. Checked checkboxes and switches fill with `accent`.
- Error turns the field border and focus ring to `danger` and adds a 12px message with an icon under the field. Errors in content are inline alerts with a retry button in the alert, never a toast.
- Empty states have a glyph, a heading that names the cause, one sentence, and the one action that fixes it.
- Loading uses skeletons in the shape of the content. Busy buttons use the spinner slot.
- Toasts confirm what just happened and carry at most one action, which is the undo of that thing.

Simulated states on the system page use `.sim-hover`, `.sim-active` and `.sim-focus`. Those classes repeat the real rules and are only allowed on that page.

## Mapping to the existing primitives

| Today | V3 |
|---|---|
| `button.tsx` variant default on the hero surface (gradient, halo, edge) | `.btn-primary`: flat ink fill, hover and pressed steps, no shadow |
| variant outline (glass or border) | `.btn-secondary`: 1px `line-strong`, `bg-hover` on hover |
| variant ghost | `.btn-ghost` |
| variant destructive (tint) | `.btn-danger-quiet` in panels, `.btn-danger` as the confirm button in a dialog |
| variant link, dashed, plain, gold, ink | link stays an anchor; dashed becomes the dropzone; plain, gold and ink are not needed in the app and stay marketing-only |
| sizes default 32, sm 28, lg 40, toolbar 36, icon 32, icon-sm 28 | 32 and 28 only, both 44 on a coarse pointer through the two height tokens |
| `surface.tsx` altitudes hero, panel, bar, media | One altitude. Panels, bars and media chrome all take the same flat controls. The `bar` and `media` pills are deleted with the hover rail |
| `ChromeSegmented` sliding thumb | `.seg`: a bordered group with a filled pressed segment, no thumb |
| `input.tsx` default, panel, inline, glass | `.input` with the 3:1 border; `panel` and `inline` become the same field; `glass` stays on the sign-in routes, which are out of scope |
| `dropdown-menu.tsx` content, item, radio item, label, separator, shortcut | `.menu`, `.menu-item`, `[role=menuitemradio]` with `.check-slot`, `.menu-label`, `.menu-sep`, `.kbd` |
| `dialog.tsx` popup, header, footer, title, description, close | `.dialog`, `.dlg-head`, `.dlg-body`, `.dlg-foot`, `#dlg-title`, `[data-close]`; flush is the default |
| `FrostCardRail` | Deleted. Share and Open live in `.toolbar-actions`, the item menu in `.card-cap` and `.row .cell.action` |
| `FrostStage` and `FrostPageWindow` | `.thumb`: the media at 16:9 with a 1px inset edge; a page preview is drawn at its own aspect inside it, no window chrome |
| `PageHeader` title 36px | `.crumbs` in the 48px header; the 20px size is the largest in the app |
| `LibraryToolbar` search plus icon menus | `.search` moves to the header; type filter becomes `.tabs`; sort, density and grouping go in the Display `.popover` |
| `--radius: 0.625rem` scale | the four fixed radii above |
| slate palette in oklch | the neutral hex set above, warm-neutral rather than blue-slate |

An implementation would keep the shadcn structure and swap the class strings, with `cva` variants reduced to the five button faces and two sizes.

## Accessibility

Contrast was computed by hand with the WCAG 2 formula and rounded to one decimal; no automated checker ran in this session. Light: text on page 17.7:1, text-2 7.7:1, text-3 5.8:1 on page and 4.9:1 on `bg-active`, accent 6.1:1, white on accent 6.1:1, white on danger 5.7:1, success 5.0:1, warning 5.2:1, `line-field` on page 3.1:1. Dark: text 16.5:1, text-2 8.8:1, text-3 6.6:1 on page and 4.8:1 on `bg-selected-hover`, accent 7.5:1, danger 6.9:1, success 8.7:1, `line-field` 3.0:1. `line-strong` is 1.5:1 and is only used where text identifies the control, so it is decorative under 1.4.11. Disabled text is exempt and sits under 4.5:1 on purpose.

Keyboard: the library list is a listbox with roving focus. Arrows move, Shift extends, Space toggles, Enter opens, S shares, Delete deletes, Escape clears. `/` focuses search, `[` toggles the sidebar, `]` toggles the inspector. Tablists have one tab stop; Left, Right, Home and End move and select. Menus take arrows, Home, End, Escape and Tab. Dialogs are native `dialog` elements: Escape closes, focus moves to the first useful control on open and returns to the opener on close. The editor's section list and the canvas sections take arrows to move the selection, Alt plus arrows to reorder, and Delete. Cmd+Z and Shift+Cmd+Z undo and redo outside a field.

Touch: every hit area is at least 44px on a coarse pointer and at widths up to 760px, including the small controls, the row and card menus, the checkbox hit area, the colour chips and the switch. Rows are 56px, compact rows 44px. Row checkboxes cannot be revealed by hover on touch, so they appear once anything is selected. Tooltips do not show on touch.

Names: every icon button has an `aria-label`, menus have labels, rows have a full label with kind, length and age, and live regions announce toasts and the save state.

Known gaps: the row is a listbox option that contains two buttons, which some screen readers flatten; a cleaner pattern is a grid with cell navigation, and that is the right fix in the real app. Canvas sections are buttons that contain headings, which is tolerated but not clean. The share dialog's expiry menu is a custom menu rather than a native select.

## Rollout risks

- The hover rail and the glass altitudes are referenced across components and the `cva` variants, so this is a one-shot chrome change, not an incremental one. Mixing V3 controls with current glass chrome on one screen will look wrong.
- The library data model needs age, views and length on list rows and a cheap folder preview, which the shelves did not need.
- The inspector needs engagement data per item at list time, or a loading state per selection. The prototype loads it instantly.
- The toolbar's fixed right column assumes the inspector width. If the inspector becomes resizable, the column must follow.
- Documents and images sharing a tab is a product decision, not a style one.
- The 3:1 field border is darker than the current field edge and will read as a visible change on every form.

## Implementation plan

1. Tokens. Replace the oklch slate set and the glass tokens with the hex set above in `index.css`, remove the `--btn-*` and `--cg-*` families, keep the page theme tokens separate.
2. Buttons and inputs. Collapse `button.tsx` to five variants and two sizes, delete the surface read, delete the halo and gradient classes. Collapse `input.tsx` to one variant plus the sign-in glass variant.
3. Overlays. Restyle `dropdown-menu.tsx`, popover and `dialog.tsx` to level 1 and the 28px item.
4. Library. Replace `FrostCardRail` and `FrostStage` with the list and the plain thumbnail, add the toolbar column and the inspector, and move the type filter to tabs. This is the largest step and the one to gate behind a flag.
5. Editor. Add the section rail, move the properties tabs into the toolbar column, keep the current properties content.
6. Share. Restyle the dialog and add the empty, loading and error states to the real one.
7. Delete the dead chrome: glass utilities, hero and media surfaces, the rail components.

## Self-critique

What is good. The structure is different from the current app in ways that matter: list first, actions in a stable column, a useful inspector, properties tabs aligned with the panel. The system page is honest about what is simulated. Every primary action does something local and reversible. The token set is small and the contrast was checked role by role.

What I could not do. This session could not execute scripts or open a browser, so the artifact was checked by reading, not by running. Expect small runtime bugs on first load. The specific places I would look first: the container query breakpoint for list columns with the inspector open at 1280, the dialog body scroll on a 375px phone, menu placement inside the modal, and focus restore after a delete removes the opener.

What is weak. The thumbnails are flat shapes and will not sell the library as well as real posters would. The folder mosaic is a cheap stand-in. The editor's text section exposes six fields for three items, which is dense but clumsy; a list editor with inline rows would be better. The phone editor relies on two drawers, which works but is not a design. Documents and images sharing a tab is a shortcut.

What is missing that the brief asked for. Nothing is missing by section, but the share dialog's error state is a prototype switch rather than a path a user could hit, and the recorder is a stand-in with no camera. Both are marked as such in the UI.

## Remaining gaps

- No browser verification in this session; the critics' first pass should be a smoke test of every view at 1280, 768 and 375.
- No motion for the section reorder; the list just re-renders.
- No drag-and-drop for sections or for moving items into folders. Both go through menus.
- No real video playback, PDF rendering or image loading; the viewer is a labelled stand-in.
- The grid has no column headers for sort; sort lives in the Display popover only.
- The inspector shows engagement for folders as a count and a size only.

## Feedback round 1

Round 1 had one external critic and the parent's own review. Everything below was edited in place; nothing was rebuilt, and no screen, feature or dependency was added. No browser ran in this session either, so the parent's syntax and visual checks stand between this draft and round 2.

Accepted and done:

- The inspector no longer exists at rest. The parent's direction overrides the critic here: the critic wanted a scope line and one sentence, the parent wanted the panel gone until something is selected, and the latter keeps V3 apart from V5. The workspace analytics, the activity feed, the keyboard tip and the sidebar storage meter are deleted. Share, Open, the item menu and the Details toggle now form a selection toolbar that appears with the selection and takes the inspector's width; with nothing selected the toolbar is the tabs and the view controls, and nothing is disabled. A click on blank space in the collection clears the selection, so the toolbar can be dismissed with the mouse as well as Escape.
- Rows are 56px with a 40px preview by default. Comfortable is gone; compact remains the dense option. The system page shows the two densities.
- Link settings change in the Share dialog only. The Page tab is the title, recipient and company fields, a status line (Published or Draft, link state, access, expiry) and a Share button. For a page the link switch sets Published, so there is one switch for one fact. The row menu lost Open and Share; the selection toolbar owns them, with Enter and S as shortcuts. The inspector's "Edit page" button went for the same reason. Open lost the diagonal arrow glyph in the toolbar and the selection bar; the label is enough.
- The rail head is gone. The breadcrumb carries Library and the title; on phones, where the crumb text is hidden, the Library crumb becomes a back arrow. The section name shows in the toolbar only below 1000px, as the label of the Sections menu button. The canvas chip shows on hover and keyboard focus only, in ink rather than accent, so nothing sits on the content at rest.
- Row checkboxes rest hidden and appear for the hovered or focused row, for selected rows, and for every row once anything is selected. The header checkbox follows. The Length column is empty for pages, images and folders and reads "12 pages" for a document. The column headers, the Display popover and the system page share one sort list: Name, Length, Updated, Views.
- Rendering defects: the "Sections" label has a rule and sits on the section names' left edge; the sidebar user text can shrink, so the email truncates instead of wrapping; the select-all overlap came from the list cell carrying the same `check` class as the button, so the cell is now `check-cell` and only the button draws a box.
- Code audit: every dialog that attaches listeners to the shared `<dialog>` now passes an AbortController signal that `openDialog` creates per open and aborts on close, including the replace path. The share dialog's switch was the visible symptom; the viewer, recorder, upload and preview dialogs had the same leak. A view change from the host, the URL or the app now closes an open dialog first, with the opener dropped so focus does not return into the old view, and hides any tooltip.
- Touch: the small-control token, row and card menus, section tools, checkbox hit area, colour chips, switch, folder disclosure, list header, scrub bar, workspace and user rows and the toast action all reach 44px on a coarse pointer. The toolbar grows to 48 and compact rows to 44 so the targets fit without overlapping. The system page and this note say the same numbers.
- Polish: the theme switches from the sidebar footer only; the system page says fifteen neutral roles and lists fifteen; the "Password, Team plan" row is gone from the share dialog and the system page; the library lists the six agreed items and the long-title case lives on the system page only.

Judgement calls and deferrals:

- Hover reveal does not exist on touch, so on touch the checkboxes appear only once a row is selected. Below 560px the column is hidden as before.
- With the sidebar gone from the editor and the theme switch kept to one place, the editor has no theme control of its own. The URL parameter and the host message cover it, which is how the comparison host drives theme anyway.
- Opening the inspector reflows the list by 344px on the first selection. That is the cost of a panel that exists only for a selection, and it is accepted rather than animated.
- Detail dialogs below 1000px and the viewer footer still carry a Share button. Both are modal, so the selection toolbar is not reachable from them; this is not the duplication the critic described.

## Feedback round 2

Round 2 had one external critic and the parent's own findings. Everything was edited in place. No screen, feature, dependency or control was added. No browser ran in this session, so the parent's syntax and visual checks stand between this draft and round 3.

Accepted and done:

- The list is Name, Length, Updated and Views again. The Kind and Owner tracks, cells and column heads are gone at every width, and the 940px container rule that used to hide them went with them. The thumbnail carries kind in the default density and the type glyph carries it in compact.
- The inspector starts closed. A click on a row shows the selection toolbar and nothing else moves. The Details button, the `]` key and the row menu's Details item open the panel, and the in-memory state keeps that choice for the session. The round 1 note that accepted the reflow on first selection is superseded.
- The editor header lost its page menu and its hamburger. Rename is the Title field in the Page tab, Page settings is the tab itself, Delete page is the tab's danger zone, and Duplicate lives in the library item menu only. From 1000px down the rail is a drawer and the toolbar's Sections button is the one way in. It carries the current section name, reports the drawer through `aria-expanded`, opens with focus on the current section, and a choice closes the drawer and lands on that section in the canvas. Escape closes the drawer and returns focus to the button. A closed drawer is also `visibility: hidden`, so its buttons leave the tab order; the sidebar drawer got the same two lines.
- Media bars carry only working controls. The inspector's video bar is play, which opens the viewer, and the duration. The document bar is the page count and Open viewer. The viewer kept play and the working scrub and lost speed, volume and captions. Secondary and select buttons show `bg-active` while their menu is open, so New, Add section, the expiry select and the video picker read as open.
- For a page the share switch is labelled Published, with the caption "Draft. Only you can open it." when off, which is the word the Page tab uses. With the switch off the dialog is that one row plus the Sample link tag. On, it shows the URL, copy, status, access, expiry and notify as before. The Page tab's Share button is gone; the header's primary Share is always visible.
- Focus survives item mutations. Rename, Move, Duplicate, New folder, Delete and each of their undos place focus by hand after the list is rebuilt: the renamed or created row, the duplicate, the moved row if it is still in view and otherwise the first survivor after it, the next row after a delete (the previous one when the last row goes), and the empty state's action when nothing is left. Dialogs that end in a mutation drop their opener first, so the close handler cannot hand focus to a node that no longer exists.
- Tooltip and toast no longer use ink. Ink flips to near-white in dark mode, which recreated the bright tooltip the user rejected. Three tokens, `float-bg`, `float-text` and `float-line`, give both a dark surface in both schemes. Light uses ink with white text. Dark uses the raised surface with `text` and a `line-strong` edge. The primary button keeps ink. The system page lists the tokens, and its tooltip and toast samples use the same classes.
- The 44px hit areas apply at widths up to 760px as well as on a coarse pointer, so a mouse-driven phone-width preview shows what a phone gets. The 16px input size stays coarse-only, since it exists for iOS zoom. No physical device or touch emulation was checked here.
- Tablists have one tab stop. The selected tab is tabbable, the others are not, and Left, Right, Home and End move and select. The filter tabs, the properties tabs in the toolbar and in the drawer, and the system page samples all follow.
- Toast messages truncate with an ellipsis inside a toast capped at the viewport width minus 32px. The icon and the Undo action keep their size.
- New folder lives in the New menu only. The plus beside the sidebar's Folders label is gone.

Judgement calls:

- The Sections button at 1000px and below opens the drawer rather than a menu, because the drawer reaches hide, duplicate, reorder and delete, which the menu lacked.
- The float tokens are three new names rather than a reuse of `bg-raised`, because the light scheme needs ink there and the dark scheme needs the raised surface. A token that means one thing per scheme is cleaner than a per-control override.
- The inspector's play button and a click on the media both open the viewer. That stays. A play glyph on a video bar is expected, and it is the one control left there.
