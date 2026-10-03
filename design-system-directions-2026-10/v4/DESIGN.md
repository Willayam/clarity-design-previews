# V4 Editorial: a content-led direction for Clarity

Prototype files: `index.html`, `styles.css`, `app.js`, `icons.js`. Open `index.html` directly. Views switch with `?view=library|editor|system`, theme with `?theme=light|dark`, and the page listens for `postMessage({ type: 'clarity-preview', view, theme })` from a parent frame and writes both back to the URL.

This is a review artifact. It has not been run in a browser by me in this environment (the sandbox blocked Node and Chrome), so every claim below about behaviour is a claim about what the code does as written, checked by reading, not by execution. The parent ran the first draft and took screenshots; the round-one and round-two revisions described at the end are again unrun by me. It is not production-certified and nothing here was measured on real hardware.

## Purpose

Clarity is a tool a salesperson uses to record a video, build a Journey Page around it, send it and watch what happens. The current V1 chrome carries bevels, glass, halos and gradients on most controls. The user finds it cluttered and over-worked. This direction removes all of that and asks a different question: what if the tool looked like a well-set document rather than a dashboard? Paper, ink, hairlines, a serif reserved for the customer's own words, and one warm accent that only ever means "recording" or "attention".

The thesis is that Clarity's content is the point. A salesperson's video titles, page titles and page copy are the things they are proud of and the things their prospects see. The tool should set those words well and get out of the way. Everything that is tool, not content, is Geist at 13px, in ink, on paper.

## What is different from V1, structurally

These are hierarchy, layout and affordance changes, not a recolour.

**Library is rows, not shelves.** V1 shows shelves of 272px glass cards with controls that pop in on hover. V4 shows a table of readable rows: an 88px contact-sheet poster, the title in Geist at 15px, a metadata line, a status word, the age, and two always-present quiet actions (Share and a menu). Rows take a hover fill and a selected fill; nothing floats. Folders are 40px rows with a glyph at the top of the same table, so containers look different from media. The root lists one level only: the brief's six names, five of them loose files and the sixth the Brand assets folder, which holds the brand images, so the type tabs add up to the five files. Long-title and failed-upload stress rows live on the System screen. On phones and coarse pointers the title link stretches over the poster and name, so the row itself is the open target. Opening a folder shows its files under a crumb. A search from the root spans folders and names the folder in the metadata line.

**Action hierarchy is one filled button.** V1 has a blue primary, a red Record and outline Upload. V4 fills exactly one control on the Library screen: Record, in the accent, because recording is the start of the core task and the accent is the record light. Upload and New page are hairline. In the editor the one filled button is Share, in ink, because sending is the point of editing.

**Editor is three panes with a document in the middle.** V1 has the app sidebar, a preview and a 380px accordion properties panel. V4 hides the app rail while editing (the bar's back arrow is the way out, the crumb is plain text naming the path, and nothing in the rail acts on a page), adds a Contents pane on the left (page settings, then numbered sections, one Add section button), puts the page itself on a sheet in the centre, and keeps a 300px properties pane on the right that shows the fields of whatever is selected. The bar's status is the page's publish word; "Edited" is appended after the first change. Selecting works from Contents, from the sheet, or from arrow keys in Contents. The title is edited in place on the sheet and in the properties pane; both stay in step. Preview renders the title as text. The video section's player has play, time and track only; controls that could only raise a toast are not drawn.

**Sharing is one dialog with four parts.** Public link with copy feedback, who can view (three radio options; the simulated 600ms update shows as a spinner and the word Updating in the group's header while the options dim), people with personal links (invite by email with live validation and an empty state), and two engagement facts, views and last opened. Choosing either open option marks the item Shared; only Link off does not. The chosen access option stays on the in-memory item when the dialog reopens. The same dialog opens from a row, from the editor bar and from a multi-select. It is the only place sharing facts appear.

**Status is words.** Shared, Not shared, Only you, Link off, Processing, Upload failed. A dot and a word in ink. Colour never carries meaning alone. The accent appears only on live recording, progress and the focus ring; Upload failed and every other error take `--danger`.

## Choices considered and rejected

- **Cards with hover-revealed actions (V1).** Rejected. Hover reveal hides the primary action from keyboard and touch users and makes the grid read as decoration. Rows carry actions in a fixed column.
- **A second accent for success or info.** Rejected. One accent keeps the palette quiet, and success is reported in words ("Shared", "Copied") plus a check glyph. Errors and destructive items take their own crimson, `--danger`, since round two, so Record and an error message no longer share a hue. It is a danger colour, not a second accent: it never fills a control.
- **Serif everywhere, or a display serif for headings.** Rejected. The product register note in `.agents/skills/impeccable/reference/product.md` warns against display type in UI labels, and the brief limits the serif to customer content. So everything the tool draws is Geist, including the names of files, folders and pages wherever the tool lists them (rows, crumbs, dialog subtitles, fields). Only the Journey Page itself is serif: its title, greeting, body, captions and document names. The split is a rule, not a taste: serif only on the page the prospect will see.
- **Lighter field borders (1.3:1 to 1.9:1), as Linear and Stripe use.** Rejected for fields, kept for buttons. A text field's boundary is the only thing that says "type here", so it meets the 3:1 non-text contrast rule with its own token. A hairline button is identified by its label, so its border stays light.
- **Hover-only checkboxes with no other way to select.** Softened. The row checkbox fades in on hover and focus, but it is always in the tab order, always visible once anything is selected, and the header checkbox selects all.
- **Container queries.** Not used. Plain media queries at 1279, 1023 and 767 are enough for a review artifact and easier to port.
- **Rounded, large radii.** Rejected. Radii are 2, 4, 6 and 10px. The one 10px is the dialog.
- **Any animation that does not report state.** Rejected. Two durations (120ms, 200ms), one curve. Spinners and progress keep moving under reduced motion because they report state; everything else drops to 0ms.

## Tokens

Names follow the variables in `editor/src/index.css` where a counterpart exists (see the mapping section), so the real app can adopt them without renaming components.

### Light

| Token | Value | Role | Contrast |
|---|---|---|---|
| `--paper` | `#f7f4ee` | page background | |
| `--sheet` | `#fdfcfa` | fields, menus, dialogs, the page in the editor | |
| `--sunk` | `#efebe3` | wells and hover fills | |
| `--selected` | `#e9e3d8` | selected row, current nav item | |
| `--rule` | `#e3ddd2` | dividers | 1.2:1 vs paper |
| `--rule-strong` | `#b9b1a3` | hairline buttons, poster frames | 1.9:1 vs paper |
| `--rule-field` | `#8f8677` | text field, checkbox and switch boundaries | 3.3:1 vs paper, 3.5:1 vs sheet, 3.0:1 vs sunk |
| `--ink` | `#1e1b16` | text, primary button fill | 15.6:1 on paper |
| `--ink-2` | `#4f493f` | secondary text, hover fill of the primary | 8.1:1 on paper |
| `--ink-3` | `#6e675a` | metadata, placeholders, icons | 5.1:1 on paper, 4.7:1 on sunk, 4.4:1 on selected |
| `--ink-4` | `#9a9284` | disabled text and decorative glyphs only | 2.9:1, never information |
| `--on-ink` | `#f7f4ee` | text on ink | 15.6:1 |
| `--accent` | `#b8431f` | Record fill, focus ring, live status, progress | 4.96:1 on paper, 4.6:1 on sunk |
| `--on-accent` | `#ffffff` | text on accent | 5.4:1 |
| `--accent-soft` | `rgb(184 67 31 / 0.10)` | hairline brand button hover on the page | |
| `--danger` | `#b02a37` | errors, invalid field borders, the failed status word, destructive menu items and buttons; never a fill | 5.9:1 on paper, 5.5:1 on sunk, 5.1:1 on selected |
| `--overlay`, `--on-overlay`, `--overlay-rule` | `#1e1b16`, `#f7f4ee`, transparent | tooltips and toasts: the ink pill | 15.6:1 |
| `--overlay-danger` | `#f0747f` | the alert glyph inside a toast, both schemes | 6.1:1 on the light overlay, 4.8:1 on the dark |
| `--scrim` | `rgb(30 27 22 / 0.42)` | behind dialogs | |
| `--skeleton` | `#ebe6dd` | loading shapes | |
| `--frame`, `--frame-2`, `--frame-figure`, `--frame-ink` | `#2b2520`, `#3a322b`, `#6b5f52`, `#f7f4ee` | video frames, same in both schemes | |

### Dark

| Token | Value | Contrast |
|---|---|---|
| `--paper` | `#171512` | |
| `--sheet` | `#1f1c18` | |
| `--sunk` | `#221f1a` | |
| `--selected` | `#2a261f` | |
| `--rule` | `#2f2a24` | |
| `--rule-strong` | `#4a4339` | |
| `--rule-field` | `#756d5f` | 3.6:1 vs paper, 3.3:1 vs sheet |
| `--ink` | `#ece6da` | 14.7:1 |
| `--ink-2` | `#ada596` | 7.5:1 |
| `--ink-3` | `#8f8778` | 5.1:1 on paper, 4.6:1 on sunk, 4.2:1 on selected |
| `--ink-4` | `#655e52` | disabled only |
| `--on-ink` | `#171512` | |
| `--accent` | `#e8703f` | 5.9:1 on paper |
| `--on-accent` | `#1a1410` | 5.9:1 |
| `--accent-soft` | `rgb(232 112 63 / 0.14)` | |
| `--danger` | `#f0747f` | 6.5:1 on paper, 5.9:1 on sunk, 5.4:1 on selected |
| `--overlay`, `--on-overlay`, `--overlay-rule` | `#332e27`, `#ece6da`, `#4a4339` | 10.8:1 text on the overlay; the overlay sits 1.35:1 above paper, lifted by its hairline and the pop shadow |
| `--scrim` | `rgb(0 0 0 / 0.55)` | |
| `--skeleton` | `#262219` | |

The ratios were computed by hand with the WCAG formula and are printed live on the System screen from the loaded stylesheet (the overlay against its own text, everything else against paper), so a critic can check them in the browser. Two consequences shaped the rules: `--ink-3` falls under 4.5:1 on `--selected` in both schemes, so selected rows promote their metadata to `--ink-2` (`.row.is-selected .muted`); and `--ink-4` never carries information.

### Type

UI, always Geist (`--font-ui`):

| Role | Size/leading | Weight | Use |
|---|---|---|---|
| micro | 11/16, caps, +6% tracking | 500 | column headers, panel group labels |
| small | 12/16 | 400 | metadata, hints, status words |
| base | 13/20 | 400/500 | controls, menus, fields, body in the tool |
| body | 14/20 | 400 | dialog copy, large buttons |
| title | 15/20 | 500 | names of files, folders and pages in the tool; the editor crumb |
| heading s | 15/20 | 600 | dialog and panel titles |
| heading m | 18/24 | 600 | page titles in the tool, folder titles |

Content, serif stack `Charter, "Iowan Old Style", "Sitka Text", Cambria, Georgia, serif` (`--font-content`), the Journey Page only:

| Role | Size/leading | Use |
|---|---|---|
| content compact | 15/20 | greeting, captions, document names on the page |
| content prose | 17/27 | Journey Page body |
| content heading | 22/28 | Journey Page sections |
| content title | 34/40 | Journey Page title (26/32 at phone width) |

Rule: serif only on the page itself. Everything the tool draws, including customer-named files and folders, is Geist.

### Space, radius, elevation, motion

- Space: 4px base. Tokens `--s-1` to `--s-16` at 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- Radius: `--r-1` 2px (kbd, tags), `--r-2` 4px (buttons, fields, rows), `--r-3` 6px (posters, menus, sheets), `--r-4` 10px (dialogs).
- Elevation: flat (hairline) for rows, panels, the rail; sheet (hairline on `--sheet`) for the page and fields; `--shadow-pop` for menus, toasts and tooltips; `--shadow-dialog` for dialogs. Nothing else casts a shadow. Toasts and tooltips sit on `--overlay`, which is ink in light and a raised dark surface in dark, so neither inverts to a near-white pill in dark mode.
- Motion: `--t-fast` 120ms for hover, press and menus; `--t-pane` 200ms for panes, dialogs and toasts; one curve `cubic-bezier(0.2, 0.7, 0.2, 1)`. Under `prefers-reduced-motion` both durations are 0 and the entrance animations, the live-dot pulse and the skeleton pulse are off. Spinners and indeterminate progress keep moving.
- Layout: rail 232px, compact rail 56px on tablets, no rail in the editor, Contents 220px, properties 300px, editor bar 48px, text measure 640px (the sheet is measure plus 128px of padding).
- Controls: 30px default, 26px small, 36px large. At phone width and on coarse pointers these become 40, 36 and 44, every icon button becomes 44, menu items and tabs 40 to 44, the player's one button 44, and the row title stretches over the poster and name so the row is the open target. The phone rules key on width as well as pointer, because a viewport test can shrink the window without emulating a pointer.

### State rules

Every interactive control has default, hover, pressed, focus, disabled and, where it can work, busy. The System screen shows each.

- Hover: fill steps to `--sunk` (quiet and hairline), `--ink-2` (primary), brightness 0.94 (record). Fields step their border to `--ink-2`.
- Pressed: fill steps to `--selected` and the control moves 0.5px down.
- Focus: 2px `--accent` outline, 2px offset, on everything. Fields instead take an ink border and a 2px accent ring outside a 2px paper gap. Tabs pull the ring inside so it is not clipped by the scrolling tab strip.
- Disabled: opacity 0.5, pointer events off. Disabled fields fill with `--sunk`.
- Busy: `aria-busy="true"` with a spinner replacing the leading icon; the control keeps full strength because working is not unavailable. The disabled attribute stays on so keyboard activation is blocked, and a specific rule holds the opacity at 1.
- Expanded: a button with `aria-expanded="true"` takes the selected fill while its menu or drawer is open, hairline and quiet alike.
- Selected: `--selected` fill plus a checked checkbox; metadata steps to `--ink-2`.
- Error: border and message in `--danger` with an alert glyph and a sentence; the field gets `aria-invalid` and `aria-describedby`. Colour never stands alone.
- Loading: skeleton rows of the same shape as real rows; an indeterminate 2px progress hairline; a spinner only inside a control or a status word.
- Empty: a sentence and one or two actions inside a dashed hairline. No illustration.

### Simulated versus live, in the prototype

The System screen tags each specimen. "live" means hover, focus or click it. "simulated" means the appearance is forced with a class (`sim-hover`, `sim-active`, `sim-focus`, `sim-open`) or static markup. Disabled uses the real attribute. Busy, error, menu-open, toast and the failed upload are simulated, with the live equivalents reachable from the same screen (the Retry button runs a real busy cycle and fails again on purpose; the Share dialog's invite field validates for real; the Copy button really writes a sample URL to the clipboard and says so).

## Mapping to existing Clarity primitives

| V4 token or pattern | Clarity today (`editor/src/index.css`, `components/ui/*`) |
|---|---|
| `--paper` | `--background`, `--sidebar` |
| `--sheet` | `--card`, `--popover`, dialog background |
| `--sunk` | `--muted`, and the `--accent` hover fill |
| `--selected` | new; selected rows and `aria-current` nav |
| `--rule` / `--rule-field` | `--border` / `--input` |
| `--rule-strong` | new; hairline button border |
| `--ink`, `--ink-2`, `--ink-3` | `--foreground`, secondary text, `--muted-foreground` |
| `--accent` | the `[data-record-action]` fill; also `--ring` |
| `--danger` | `--destructive` |
| `--overlay` | new; the toaster and tooltip surface, dark in both schemes |
| `--primary` | becomes ink. The blue goes away. |
| `.btn-primary`, `.btn`, `.btn-quiet`, `.btn-record` | `Button` variants `default`, `outline`, `ghost`, and `data-record-action`. The `surface` axis in `surface.tsx` (hero, panel, bar, media) collapses to one face: no glass, no halo, no gradient. `bar` and `media` keep their transparent-pill behaviour over video only. |
| `.input`, `.textarea`, `.select` | `Input` variants `default` and `panel` merge; `inline` becomes `.editable` (contenteditable that looks like text until touched); `glass` is deleted with the sign-in sky. |
| `.menu`, `.menu-item` | `dropdown-menu.tsx`; the radio tick and the danger item map to `DropdownMenuRadioItem` and `variant="destructive"` |
| `.dialog`, `.scrim` | `dialog.tsx` `DialogPopup` and `DialogBackdrop` |
| `.tabs`, `.seg` | new underlined tabs; `ChromeSegmented` loses the sliding thumb |
| `.row`, `.poster` | replaces `FrostStage`, `FrostCardRail`, `MediaCard` on the home route |
| `.status` | replaces coloured badges |
| `.toast` | the existing toaster, restyled as an overlay pill: ink in light, raised dark in dark |

## Accessibility

- Every icon-only control has an `aria-label` and a tooltip that appears on hover and keyboard focus. The hover rule sits inside a `(hover: hover)` media query, so touch never gets one; the label is in the accessibility tree.
- The tablet properties drawer sets `aria-expanded` on its opener both ways, and Escape, the close button and the scrim all return focus to the opener. After an inline rename the re-render puts focus back on the renamed title.
- Menus are `role="menu"` with arrow keys, Home, End, Escape and Tab handling; focus returns to the trigger; `aria-expanded` and `aria-haspopup` are set on triggers.
- Dialogs are `role="dialog" aria-modal="true"` with `aria-labelledby`, a Tab trap, Escape and scrim-click to close, and focus returned to the opener (or its re-rendered twin, found by `data-act` and `data-id`). Initial focus goes to the primary control when it is enabled and visible, otherwise to the first enabled control, then Close, then the dialog itself. The app behind the scrim is `inert` while a dialog is open. A view change from the host closes any open dialog without returning focus into the old screen.
- Tabs are a `tablist` with roving tabindex and arrow keys; selection follows focus.
- The row checkbox fades in visually but stays in the tab order and reveals itself on focus. The header checkbox reports mixed state with the real `indeterminate` property.
- The page title is a `contenteditable` span with `role="textbox"` and a label; Enter blurs, paste is plain text.
- Toasts live in a `role="status" aria-live="polite"` region, dismiss on a button, and carry an Undo for every destructive action.
- Switches are `input[type=checkbox][role=switch]`; radios in the Share dialog are native inputs styled with `appearance: none`.
- Skip link to main content; `main` takes focus after navigation.
- Contrast: body and control text at or above 4.5:1 in both schemes; field, checkbox and switch boundaries at or above 3:1; see the token table for the exceptions and how the rules avoid them.
- Touch: 44px targets at phone width and on coarse pointers for icon buttons, row targets and the player button; field font-size rises to 16px at phone width so iOS does not zoom on focus. Checked by reading the stylesheet against the parent's layout audit, not on a physical device.
- Reduced motion honoured as described above.
- No horizontal overflow by construction: grid columns use `minmax(0, 1fr)`, titles truncate or clamp, long words wrap with `overflow-wrap: anywhere` where they can appear.

## Rollout risks

1. **Two reds.** Record is a burnt orange (`#b8431f`) and danger a crimson (`#b02a37`), about 20 degrees apart in hue. They read as different colours side by side on the System screen, but a user with red-weak vision may see one red; the words and glyphs carry the meaning either way.
2. **The serif on Windows.** Charter and Iowan Old Style are Apple fonts. On Windows the stack falls to Sitka Text, Cambria or Georgia. All are fine text faces, but Georgia is wider and the row title line will truncate sooner. The real app should ship a webfont (Source Serif 4 or Literata) or accept the native fallback and test the row at 1280.
3. **Removing the blue.** `--primary` becomes ink. Any component that leaned on `primary/10` tints for hover or open states (menus, ghost buttons, outline `data-active`) needs the `--sunk` and `--selected` fills instead. The mapping table lists them; the sweep is mechanical but wide.
4. **Density.** 13px base and 30px controls are denser than V1's 14px and 32 to 40px. Users on 1280 laptops may like it; users with low vision may not. The scale is in tokens, so a 14px base with 32px controls is a two-line change, but it should be decided before porting.
5. **Field borders at 3:1 look heavier than current fashion.** This is deliberate and documented, but it is the one place a critic is most likely to call the design "old". The alternative is a filled field on `--sunk` with a 1.9:1 border, which fails the non-text rule.
6. **Three-pane editor at 1024.** With no rail, Contents and properties, the sheet is about 450px wide at 1024. Readable, but tight. Below 1024 Contents becomes a menu and properties a drawer.
7. **The page's own theme.** The sheet re-scopes the dark tokens (`.sheet.dark`) to render an "Ink" page theme. This is a neat trick in CSS custom properties but ties the page theme to the tool's palette; the published page renderer would need the same tokens. The sheet also sets `color: var(--ink)` on itself so every descendant resolves inside the re-scoped tokens; without that rule the prose inherits the host's colour, which is what round two found.

## Implementation plan

1. Land the tokens in `index.css` under the existing names, behind a class on `html` (`.v4`) so both systems coexist for a sprint. Delete the glass, halo, marketing and sign-in sky tokens in the same change when the sign-in route is restyled.
2. Rewrite `button.tsx` faces: drop the `surface` compound variants except `bar` and `media`, map variants to the four faces. Rewrite `input.tsx` to one variant plus `.editable`.
3. Replace the home route's shelves with the row table: `FrostStage`, `FrostCardRail`, the mini page and the PDF preview become the 88px poster. Keep the existing `LibraryToolbar` props and swap its menu triggers for the underlined tabs plus a sort menu.
4. Add the Contents pane to the page editor and move the accordion panel to the properties pane, selected-section model as in `app.js`.
5. Restyle the share dialog to the four-part layout; wire the access radios to the existing publish state.
6. Build the System screen as a route behind a flag so the live token table and specimens stay in the app.
7. Verify on real devices: 1280 and 1440 desktops, a 768 tablet, a 390 and a 375 phone, light and dark, with VoiceOver and keyboard. Record the contrast table from the live System screen in the PR.

## Self-critique

- **Nothing here was run.** The sandbox blocked Node and Chrome, so the artifact was checked by reading: braces balance, every icon name resolves, every function is defined once, and each handler path was traced by hand. There will be at least one bug a browser finds in two seconds. The parent's first feedback round should start by opening the file.
- **The posters are diagrams, not thumbnails.** Dark frames with a silhouette, a slide with a face bubble, a paper with lines. They read correctly at 88px and are honest about being mock, but they will not sell the direction the way real frames would. The real app would show real frames inside the same 3px hairline frame.
- **One folder is a thin sample.** The root now shows one level, and the only folder holds images, so the Videos, Pages and Documents tabs read 0 inside it. A second folder with mixed content would show the dossier view better, but it would also put brief items a level down.
- **The System screen is long.** It covers the brief's list but a critic will have to scroll. A sticky in-page index would help.
- **The share dialog simulates latency** on access changes (600ms) to show the busy state. That is useful for review but should not ship as a fake delay.
- **Prose on the page is my invention** and may be too long for a proposal page. The editor is the place to judge density, not copywriting.

## Remaining gaps

- No browser verification, screenshots or axe pass yet.
- No video editor view; the brief lists it as a product surface, and the parent asked for no further screens. The player chrome on the sheet is the only sign of how footage would be treated.
- Analytics beyond the facts in the share dialog is not shown.
- The rail's Contacts, Analytics, Settings and account items are inert with a toast, by design.
- Drag-and-drop reordering of sections is not implemented; move up and down buttons are.
- No print stylesheet, no RTL, no high-contrast mode check.
- Rounds one and two are reflected in the sections below.

## Feedback round 1

The critic read the code and the parent's screenshots; the parent added findings from a browser run. Everything below was done by editing the affected lines. Nothing was run by me afterwards.

### Accepted

1. **Library root says things three times.** The root now lists one level: the brief's six names loose and one folder, Brand assets, holding the six images. The Northstar launch folder is gone because its three items are brief names and belong at the root. The rail's Folders section and its plus are gone; New folder lives in the toolbar only. The Where column is gone everywhere. The standfirst is gone, so the All tab is the only count, and the type tabs add up to it (3 + 2 + 1 = 6). A search from the root spans folders and appends "in Brand assets" to the metadata line.
2. **Editor chrome.** The rail is hidden in the editor, so the exits are the back arrow (the touch target) and the crumb (the path). The properties toggle is gone at 1024 and above; the pane is always open there and stays a drawer below. The Contents pane has one Add section button, in its footer.
3. **Editor contradictions.** The bar's status is the publish word from the library item, with "Edited" appended after the first change. The sheet takes the `light` class for the Paper and Brand themes, so the page no longer inherits the dark tool tokens. The Sharing group left Page settings; engagement facts live in the share dialog only.
4. **Phone rows.** Separators are rendered as " · " with spaces. Phone metadata is two deliberate lines: what the item is, then status, views and age, each truncating at its own end. The Share button hides on phones (it stays in the menu), which gives the line about 45px more. The phone top bar names the screen, so the Library heading and the standfirst are not repeated. The command palette and the top-bar magnifier are gone.
5. **Folder rows.** A 40px row with a folder glyph where the poster would be, the name, the count and the age. Folders sit at the top of the same table, under the same column heads, so names align.
6. **Rendering defects.** The drawer's Close button is now `.btn.rail-close`, so the `.btn` rule no longer wins on desktop. The Selection specimen moved into the full-width Rows section as a second, selected row.
7. **Geist for asset names.** Row titles, folder names, the folder title at page-head scale, the editor crumb, the dialog subtitle and the property fields are Geist. The serif remains on the sheet only. The type scale gains a `title` role (15/20, 500) and loses `content row`.
8. **Share dialog focus when the link is off.** `openDialog` checks that the requested initial-focus target is inside the dialog, enabled and visible; otherwise it falls to the first enabled control, then Close, then the dialog. The share dialog also asks for the checked access radio when the link is off. The app behind a dialog is `inert`.
9. **Host view changes.** `setView`, the `postMessage` handler and `popstate` close open menus, dialogs and the phone drawer before rendering, and the dialog close skips focus restoration in that case.
10. **Optional polish, all taken.** The properties footer legend, the library footer line, the "/" hint on phones and coarse pointers, the uppercase label on the selected section, and the share dialog's require-email switch, link expiry, per-person roles and Open page button are gone.

### Deferred

- **Two exits from the editor, not one.** The back arrow stays beside the crumb because the crumb's 12px text is not a touch target. One of them could go once the real app decides whether crumbs are links on phones. Taken in round two: the crumb is plain text.
- **"Edited" without "saved".** The bar says only "Edited" after a change, as asked. The real app would say what happened to the edit; the prototype saves nothing and says so in the dialogs instead.

## Feedback round 2

The critic read the code, the layout audit and the parent's screenshots; the parent added findings from a browser run across eighteen view, theme and width combinations. Everything below was done by editing the affected lines. Nothing was run by me afterwards; the parent owns the browser and syntax checks.

### Accepted

1. **Page text on the sheet.** The sheet sets `color: var(--ink)` on itself, so prose, headings, bullets, the CTA lead and document names resolve inside the sheet's re-scoped tokens instead of inheriting the tool's ink from `body`. It is the one declaration the critic named, and it covers Paper and Brand in the dark tool and Ink in the light tool alike.
2. **Phone tap targets.** Icon buttons are 44px in the phone and coarse-pointer queries; they were 40. A combined query, phone width or coarse pointer, stretches the row title over the poster and name so the whole row opens the item, with the checkbox and actions columns lifted above it. The player's one button is 44px there. The editor crumb is plain text and the 44px arrow is the one exit. The width condition exists because the parent's viewport test does not emulate a pointer.
3. **Share dialog.** Both open settings write Shared to the row and bar; only Link off does not, so the dialog and the row agree. The link row's status line is gone, since the checked option already says who can view. The 600ms update shows as a spinner and "Updating" in the "Who can view" header, in a polite live region, while the options dim. The hint under the link is gone and the toast says "Copied"; the footer line keeps the one disclaimer. Engagement shows views and last opened only; the invented "watched on average" figure and its bar are deleted.
4. **Player.** Captions, Volume and Full screen are removed. Play, time and track remain, and all three work locally.
5. **Busy buttons.** A busy button keeps the disabled attribute, which blocks keyboard activation, and a specific rule holds its opacity at 1, so the busy specimen and the live Retry render at full strength.
6. **Danger token.** `--danger` (`#b02a37` light, `#f0747f` dark) carries errors, invalid field borders, the failed status word, destructive menu items and the Delete button. The accent keeps Record, live status, progress and the focus ring. The System palette lists the token with its live ratio, and a "Danger, where it is allowed" specimen sits beside the accent one.
7. **Overlays in dark.** Tooltips and toasts use `--overlay`, `--on-overlay` and `--overlay-rule`: the ink pill in light, a raised dark surface with light text and a hairline in dark. They no longer invert to a near-white pill. Primary buttons are untouched. The toast's alert glyph uses one value for both schemes.
8. **Library root.** The long-title stress page left the Library data and lives on the System screen only, so the root is the brief's six entries: five files and the Brand assets folder. The tabs read All 5, Videos 3, Pages 1, Documents 1, which add up; the folder row carries its own count. The stress row's Share and menu still work there because the System list resolves like the Library list.
9. **Phone metadata.** The second line (status, views, age) may wrap once more instead of clipping: a two-line clamp with normal wrapping, so it breaks at the spaced separators and never inside a word.
10. **Polish taken.** Any button with `aria-expanded="true"` takes the selected fill, so Sort, Contents and Add section show their open state. The properties drawer's opener returns to `aria-expanded="false"` when it closes, and the close button and the scrim return focus to it as Escape already did. An inline rename re-renders with the renamed title focused. The tooltip hover rule sits inside a hover media query. The type table no longer says folders use the content heading. The tabs specimen on the System screen adds up.

### Partly taken

- **Share in the row menu.** The critic asked to drop it as a duplicate of the row button. On phones the row button is hidden, so the menu item is the only sharing path there. The menu includes Share at phone width only, by a width check when the menu is built, and omits it where the row button is visible.

### Not taken

- **Captions and mute as real toggles.** The critic offered this or removal; the parent chose removal, which is the honest scope for a prototype with no media. The Captions switch in the properties pane still stores its value; nothing on the sheet shows it.

### Owed to the parent

- The share dialog needs recapturing with the dialog open, in both themes, and once with Link off chosen; the round-two share screenshot showed the editor only.
- The System screen's Buttons section, below the fold in the round-two capture, is where the busy state can be checked.
