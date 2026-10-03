# Clarity V2: Refined current

The current Clarity with its depth budget cut. The structure stays: sidebar and content, 16:9 media cards, the page editor with a right-hand properties panel, the dark bar over video. What goes is the stacking: bevels on buttons, outlines on everything, hover states that add a second fill on top of the first, and three or four kinds of frosted surface where one will do.

This is a review prototype, not production code. This document records the state after the author pass and two critique rounds (see Feedback round 1 and Feedback round 2 at the end).

## Files

- `index.html`, `styles.css`, `app.js`: the candidate. Open `index.html` from disk; nothing is fetched from the network. The font is `../assets/geist.woff2`, declared as a variable face.
- `DESIGN.md`: this document.
- `reference/`: snapshots the parent supplied (brief, the current theme stylesheet, button, surface, input, dialog, dropdown menu, the frost card rail and stage, the page header and library toolbar). The mapping section below reads from these, not from the repository.

## Driving the prototype

- `?view=library|editor|system` chooses the screen. `home`, `recorder`, `public` and `settings` are extra screens, reachable by URL and from in-app links only; `share` opens the Library with the share dialog already open. Without a parameter the Library shows.
- `?theme=light|dark` chooses the scheme. Without it, the tab's own session memory applies, then the OS preference. The page writes the resolved view and theme back into the URL so a host can read them.
- `postMessage({type: "clarity-preview", view, theme})` from a parent frame switches both and updates the URL.
- The dark bar at the top is prototype chrome, never part of the design. It holds only the preview controls: three tabs for the required screens and the scheme switch. The share dialog opens from the product itself (a card's More menu, the selection bar, the editor's Share button) or from `?view=share`.
- Small dark pills bottom right on the Public page and the Recorder switch demo states (Ready, Portrait, Processing, Locked; Idle, Recording, Done). The same dark recipe, docked under the Share dialog's footer and inside the dialog element so it works while the dialog is modal, switches the views list (List, Loading, Empty, Error).
- On the System sheet, a green "Live" chip marks a control that responds to the real pointer and keyboard. An amber "Sim" chip marks a class that paints hover, pressed or focus so states can be compared side by side.
- Every action does something local and reversible. Copy writes a sample link to the clipboard and says so. Upload, publish, delete and send are labelled as demo behaviour in their toasts and hints. Delete, duplicate, rename and the demo upload offer Undo.

## What stays, what changes

Stays:

- The shell: a 256px sidebar with workspace switcher and main navigation; content on the right under a page head with the title and its actions. Folders are tiles at the top of the Library, as in the current product's shelves, not a second list in the sidebar.
- A Library with folders first, then a grid of 16:9 thumbnails with a duration chip, a list view, search, type filter and sort.
- The editor as canvas plus right-hand properties panel. No separate section-tree rail, as in the current editor.
- A dark, translucent control bar over video; a dark dock over the recorder preview.
- Public pages in the rep's brand colour, with a call to action and a lead form.
- OS colour scheme through a `.dark` class on `<html>`.

Changes:

- Four edge treatments, one per surface (see Depth). Translucency on one level only: things that float over content or media.
- Buttons are flat fills. Four variants, one primary per view. Hover changes the fill and nothing else.
- Fields carry one hairline. No inset shadow, no inner highlight, no second ring on focus. Errors turn the hairline red and add one line of text.
- Media cards lose their frosted container. The thumbnail is the surface; title and meta sit under it. Two chips on the image at most, and one More button on hover or focus, always on touch. Share is in the menu; the select box appears once a selection has started.
- The Library's header actions become Record (primary), Upload (secondary) and New (quiet; a menu with Page, From a template and Folder) instead of three buttons of similar weight. Record as primary is a proposed product priority, not the current one: today the primary is New Journey Page, which V1 keeps. The parent kept Record for this comparison because all four alternatives made the same call; the user has not decided it. The toolbar row gains a visible type filter and loses New folder, which lives in the New menu.
- No Home stage. The `FrostStage` snapshot is the card's frosted container, not a Home hero, and in the current product Home is the library tree, so the sidebar has one entry for the library and no Insights item. An extra Home screen with card rails remains at `?view=home`, outside the navigation, for the parent's use.
- The editor's properties panel is an accordion whose open row is the selected section, so section navigation and properties are one control instead of two.
- Portrait video gets a 9:16 frame on a blurred copy of its own colours in cards and a 9:16 player on the public page.

## Design rationale

The direction asked to keep recognisable structure and some optical depth while cutting repeated bevels, outlines and layered hover fills, and to simplify the action hierarchy and card chrome. The decisions that follow from that:

1. Depth is assigned per surface, once. The current theme stacks a gradient, an edge, a top highlight, a halo and an inset shade on one button. Here a surface gets tone, a hairline, a shadow or glass, and nothing else. The System sheet shows the four and the removed stack side by side.
2. Glass is reserved for chrome that floats over something else: the player bar, the recorder dock, the section toolbar, the selection bar, chips and buttons over thumbnails. It is the one translucent level the direction allows, and it keeps the recognisable dark bar over video.
3. Hover is one property. Fills step from `--fill-1` to `--fill-4`; nothing lifts, scales or gains an outline.
4. One primary per view. Record is the Library's primary because recording starts the product's loop; Upload is the next action; New steps down to quiet because pages are more often made from a recording than from scratch, and it holds the folder action too so the toolbar row carries no creation control. This order is a proposal, see Changes. Publish is the editor's primary and Share sits next to it as the secondary.
5. Cards show the object. The frosted stage behind every item is gone; page and document cards keep a small window or sheet of paper on a tone surface so their kind reads at a glance. Hover reveals one More button, so the rail never unfurls; Share and Select live in its menu.
6. Density comes from rows, not boxes. The properties panel uses 48px accordion rows and 16px padding, hairlines between sections and no nested cards.

## Choices rejected

- Keeping a frosted container around every card with less blur. It still puts two surfaces (stage and thumbnail) behind one object and leaves the rail problem unsolved.
- Yellow trim handles (`--timeline-range` in the current theme). The range is the only yellow in the app; the accent does the same job and keeps one accent.
- Shadows on buttons for "some depth". Depth lives in surfaces (raised menus, paper in document cards, glass over media), so buttons can stay flat without the page going flat.
- A separate section list beside the canvas. The current editor has none, and an accordion gives the same navigation in the panel that already exists.
- Lightening the dark-mode accent on hover. White text would fall under 4.5:1, so hover darkens instead.
- A segmented sort control. Sort has three options people rarely change; a menu behind an icon keeps the toolbar row to search, filter, sort and layout, as the current `LibraryToolbar` does.
- Share settings in the editor's Page settings. The first draft repeated the public link, the password switch and the notify switch there; the Share dialog is one click away on the toolbar and is now the only place for access and alerts.

## Depth

| Level | What sits there | Treatment |
|---|---|---|
| Canvas | Page background, sidebar, page head, properties panel, editor canvas (deeper tone) | none |
| Surface | Cards' thumbnails, folder tiles, the page on the canvas, the lead form card, dropzones, the stage on the extra Home screen | tone (surface on canvas) |
| Raised | Menus, dialogs, toasts, tooltips, the paper inside document and page cards | shadow in light; hairline in dark |
| Float | Player bar, recorder dock, section toolbar, selection bar, chips and buttons over media | glass: tint, blur, one edge |

Treatments:

1. Tone. Surface on canvas. Light `#ffffff` on `#f4f5f7`; dark `#171a1f` on `#0e1013`. No border, no shadow.
2. Hairline. 1px at 10% alpha (`--hairline`), 18% for field borders and checkboxes (`--hairline-strong`). Used where tone cannot separate two areas of the same colour: the sidebar edge, list rows, table rows, accordion rows, form fields, tabs.
3. Shadow. `--shadow-raised` for menus and toasts, `--shadow-dialog` for dialogs, a small paper shadow inside document and page thumbnails. Light mode only. Dark mode sets both shadow tokens to `none` and gives raised surfaces a hairline through `--raised-edge`; toasts and tooltips follow the same recipe.
4. Glass. Two tints at one level. `--glass` follows the scheme and sits over content (selection bar, section toolbar). `--glass-media` is always dark and sits over video (player bar, recorder dock, duration chip, card actions, play glyph). Both blur 20px with 140% saturation and carry a 1px edge at 8 to 12% alpha, because glass over varied media needs an edge to read. No inner highlight. `prefers-reduced-transparency` swaps both for opaque fills.

A surface never combines two of these. Two exceptions are states, not surfaces: the focus ring (`--focus`, a 2px accent ring offset by 2px of canvas) and the 2px accent selection ring on cards and canvas sections.

## Tokens

All values live at the top of `styles.css`. Contrast ratios were computed with the WCAG 2 formula from these hex values; they were not measured in a browser this session.

### Colour, light

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--canvas` | `#f4f5f7` | page, sidebar, page head, panel | |
| `--surface` | `#ffffff` | cards, menus, fields, the page on the canvas | |
| `--surface-2` | `#eceef2` | lead form inside the editor, the mini browser bar inside a page thumbnail | |
| `--surface-3` | `#e2e5ea` | page, document and image thumbnail backgrounds; one step deeper than `--surface-2` so the slot separates from the canvas | |
| `--canvas-deep` | `#e9ebef` | editor canvas, recorder stage | |
| `--fill-1` to `--fill-4` | ink at 5 / 8 / 12 / 16% | hover, secondary buttons, pressed; alpha so they work on canvas and surface alike | |
| `--hairline` | ink at 10% | dividers | |
| `--hairline-strong` | ink at 18% | field borders, checkboxes, swatch outlines | 1.5:1 against surface, see Accessibility |
| `--text` | `#15181e` | | 17.8:1 on surface |
| `--text-2` | `#4f5864` | secondary copy, nav items, ghost buttons | 7.2:1 surface, 6.6:1 canvas |
| `--text-3` | `#666e7b` | meta lines, placeholders, labels on the System sheet | 5.2:1 surface, 4.7:1 canvas |
| `--text-disabled` | `#a3aab5` | disabled field text | 2.3:1, intentionally below the floor |
| `--ink` / `--on-ink` | `#15181e` / `#f4f5f7` | toasts and tooltips | 16.3:1 |
| `--accent` | `#2563eb` | primary button, switches, selection, the brand blue of the current theme | 5.2:1 with white |
| `--accent-hover` / `--accent-active` | `#1d4ed8` / `#1e40af` | | 6.7:1 / 8.6:1 with white |
| `--accent-text` | `#1d4ed8` | links, the Live chip, open accordion glyph | 6.7:1 surface, 6.1:1 canvas |
| `--accent-tint` | accent at 10% | Live chip, stage wash, selected list row, drag-over dropzone | |
| `--control-off` | `#aab1bc` | the off track of a switch | 2.2:1 against surface |
| `--danger` / `--danger-text` | `#d23b3b` / `#b32e2e` | solid Delete / text Delete and inline errors | 4.7:1 white on fill, 6.3:1 text |
| `--success-text` / `--warning-text` | `#15733f` / `#8a5408` | chips | 5.9:1 / 6.3:1 |
| `--record` | `#e5484d` | the record dot and the Stop button | |
| `--scrim` | ink at 48% | dialog backdrops, the drawer scrim | |

### Colour, dark

| Token | Value | Contrast |
|---|---|---|
| `--canvas` / `--surface` | `#0e1013` / `#171a1f` | |
| `--surface-2` / `--surface-3` / `--canvas-deep` | `#1f232a` / `#282d35` / `#0a0b0e` | |
| `--fill-1` to `--fill-4` | white at 6 / 9 / 13 / 17% | |
| `--hairline` / `--hairline-strong` | white at 8 / 16% | |
| `--text` / `--text-2` / `--text-3` | `#eceef2` / `#a2a9b5` / `#7e8694` | 15.0 / 7.4 / 4.8 on surface; 8.1 and 5.2 for the lower two on canvas |
| `--accent` | `#3d6fe8` | 4.5:1 with white; the light accent would fall to 3.7:1 |
| `--accent-hover` / `--accent-active` | `#3463d6` / `#2d57c0` | 5.4:1 / 6.3:1; darker, not lighter, so the label never drops under 4.5 |
| `--accent-text` | `#8fb0ff` | 8.2:1 |
| `--control-off` | `#4b525d` | |
| `--danger-text` / `--success-text` / `--warning-text` | `#f08080` / `#6fd59b` / `#f0b85a` | 6.7 / 9.7 / 9.7 |
| `--ink` / `--on-ink` | `--surface` / `--text` | 15.0, with `--raised-edge`; the menu recipe, not the white pill the user rejected |
| `--shadow-raised` / `--shadow-dialog` | none | raised surfaces take `--raised-edge: var(--hairline)` |
| `--glass` | `rgba(23,26,31,.74)` | `--glass-media` does not change between schemes |

Over media, text is always `--on-media` (white). `--on-media-2` (white at 82%) is for icons and dividers only, because 72% white over the dark tint on a light scene measured 3.7:1. White on `--glass-media` over the lightest thumbnail colour (`#eceef2`) is 5.4:1; over a mid scene 5.8:1.

Public pages set `--brand`, `--brand-hover` and `--on-brand` on their root. Only `.btn-brand`, the value-point icons and the lead form's focus ring read them. The app never uses the brand colour.

### Type

Geist, three weights (400, 500, 600). Sizes in px / line-height:

| Token | Size | Use |
|---|---|---|
| `--text-display` | 28/34 600, tracking -0.02em | page titles (Library, Settings, Home greeting), System heading |
| `--text-h1` | 22/28 600, tracking -0.01em | page titles on phones, call-to-action heading on the page |
| `--text-h2` | 17/24 600 | section heads, dialog titles |
| `--text-h3` | 15/22 600 | lead form title, settings sections, empty-state titles |
| `--text-body` / `--text-body-md` | 14/20 400 / 500 | default; labels on buttons, cards, nav, accordion rows |
| `--text-small` / `--text-small-md` | 13/18 | hints, nav counts, small buttons, table meta |
| `--text-micro` / `--text-micro-rg` | 12/16 500 / 400 | chips, card meta, table heads, timers |

The page on the canvas and the public page are larger: 30/36 or 32/38 headline, 16/26 or 17/27 body. Durations, counts, timers and money are tabular.

### Radius, size, space, motion

- Radius: 6px chips and menu items, `--r-ctl` 8px for buttons, fields and nav items, 10px for thumbnails and menus, `--r-card` 12px for the player, stage card and alerts, `--r-panel` 16px for the stage, dialogs and the recorder preview, `--r-pill` for chips over media and the record button. Small buttons, small fields and the card's More button share the 8px; there is no 5 or 7.
- Heights: `--h-sm` 28, `--h-md` 36, `--h-lg` 44, `--h-row` 32 for nav and menu items. On a coarse pointer, and at 720px and under, they become 44, 44, 48 and 44, so there is no small control on touch; labels and glyphs keep their size. Segment buttons are 40 inside their 44 track, the trim handles are 22 wide, switches and checkboxes get an invisible 44px hit area, and swatches are 36 with 16px gaps. The 720px condition exists because phones are touch devices and the parent's preview cannot emulate a coarse pointer.
- Space: 4px grid. Card grid gap 24 by 16, rails 16, content gutter 32 (24 on tablets, 16 on phones), page head 24 above and 28 below.
- Motion: `--t-fast` 120ms for fills and opacity, `--t-base` 180ms for things that move (toast, player bar, drawer, accordion chevron). One easing. `prefers-reduced-motion` zeroes both and stops the skeleton shimmer and the recording dot.

## State rules

Buttons (`.btn` plus one variant; 36px, padding 14, radius 8, 14/500 label, 16px icon with an 8px gap):

| Variant | Rest | Hover | Active | Where |
|---|---|---|---|---|
| `.btn-primary` | `--accent`, white | `--accent-hover` | `--accent-active` | the one primary of the view |
| `.btn-secondary` | `--fill-2` | `--fill-3` | `--fill-4` | the next action: Upload, Share, Open editor, Copy in a field row |
| `.btn-ghost` | transparent, `--text-2` | `--fill-1`, `--text` | `--fill-2` | New, Add section, Save to, Preview, Cancel, Done, Record again |
| `.btn-danger` | transparent, `--danger-text` | `--danger-tint` | `--danger` text | Delete before confirmation |
| `.btn-danger-solid` | `--danger`, white | `--danger-hover` | | the confirming Delete |
| `.btn-brand` | `--brand`, `--on-brand` | `--brand-hover` | | public pages only; `.quiet` is an outlined variant |
| `.btn-media` | white 12% | white 20% | white 30% | labels inside the dock or player bar |

- A menu trigger carries `aria-expanded`, and every variant paints its active fill while that is true, so New, Add section and Save to look pressed while their menus are open, as icon buttons already did.
- Disabled is 45% opacity and no pointer events.
- Busy (`aria-busy="true"`) adds a spinner before the label and keeps the label. The label never changes while a request is in flight. Labels change between stages only when the press does something different: Publish becomes Update, Record becomes Stop.
- Focus is `--focus` on everything, including custom checkboxes, the inline title field, trim handles (with a surface-coloured gap) and the player's seek bar (white ring over media).
- `.icon-btn` is a 36px square with ghost behaviour; `.sm` is 28; `.media` is the white version for glass-media; `.chip-btn` is the 28px glass-media square for the card's More button. On a coarse pointer, and at 720px and under, all of them are 44, as visible squares rather than invisible extensions. Hover on glass-media buttons is one token, `--glass-media-hover`.

Fields (`.input`, 36px, 1px `--hairline-strong` on `--surface`):

- Focus turns the border accent and adds a 1px accent spread so the ring is 2px, nothing else.
- Error (`aria-invalid="true"`) turns the border `--danger`, keeps the same 2px ring logic on focus, and pairs with `.hint.error-text` under the field. The editor validates the call-to-action link live this way.
- Disabled fills `--fill-1`, drops the border and greys the text.
- Read-only greys the text and pairs with a Copy button in a `.field-row`.
- The toolbar search is tonal (`--fill-2`, no border) because it sits among tonal controls, and becomes a surface with a hairline on focus. Its clear button appears when there is text.
- Inline title (`.doc-title`) looks like text until hovered (`--fill-1`) or focused (surface and the focus ring).

Selection controls:

- `.switch`: 36 by 20 track in `--control-off`, accent when on, 16px white knob, no shadow. Disabled is 45%.
- `.check`: 16px box, 1.5px `--hairline-strong`, accent fill with a white check. Over media the box is glass-media with a white border.
- `.seg`: 2px padded `--fill-2` track; the pressed segment is `--surface`. `.seg.media` is the white-fill version in the recorder dock.
- `.tabs`: 38px, 2px underline in `--text` on the selected tab, a hairline under the row.
- `.chip`: 20px, 12/500, radius 6. Neutral, `.accent` (Live in the editor toolbar and the share footer), `.success`, `.warning`, `.danger`, `.media` (glass-media, the only chip used over a thumbnail: duration, Draft, Live, PDF). `.live` and `.sim` exist only on the System sheet.

Raised:

- `.menu`: surface, radius 10, 4px padding, shadow in light, hairline in dark. Items 32px (44 on touch), hover and keyboard focus `--fill-1`, danger items red, radio items show a check. Triggers carry `aria-haspopup` and `aria-expanded`; Escape closes and returns focus to the trigger; arrow keys, Home and End move between items.
- `dialog.dialog`: 480px (720 for the file preview), radius 16, dialog shadow, scrim backdrop. Native `showModal()` traps focus; the opener is remembered and focused on close. Escape and a backdrop click close. The first focus goes to the primary control, or to Cancel in the confirm dialog.
- `.toast`: `--ink` with `--on-ink` text and a `--raised-edge` border, bottom centre, 2.4s, 6s when it carries an Undo. `role="status"`. In dark that is the menu's own recipe (surface plus hairline), so no white pill appears over dark glass.
- Tooltips (`data-tip`) use the same recipe at 12/500, on hover and keyboard focus, hidden while a menu is open from the same button.

Cards:

- The thumbnail is the only surface. On it, always the duration chip (bottom right) and, when needed, one status or type chip (bottom left: Draft, Live, PDF). Every chip over a thumbnail is the glass-media chip, white on the dark tint, which computes to 5.7:1 over the lightest slot colour; the grey neutral chip used for Draft and PDF in the first draft computed to about 4.4:1 in dark mode. Processing covers the image with glass-media and a spinner.
- On hover or focus-within: a 44px glass-media play glyph (pencil for pages, eye for files) in the centre and one More button top right. Share, Select, Rename, Move to, Duplicate and Delete are in its menu. On a coarse pointer, and at 720px and under, More is always visible at 44px and nothing else sits on the image.
- The select box, top left, appears once a selection has started (More, then Select) or when it has keyboard focus; from then on every card in the grid shows its box. Hidden chrome takes no pointer events, so it cannot catch a tap.
- Selected: a 2px accent ring around the thumbnail, offset by 2px of canvas. In list view the row takes `--accent-tint` instead.
- Title at 14/500 clamped to two lines; one meta line at 12/400 `--text-3` with the kind glyph. Each meta value is its own segment (a document's page count and size are two), so phones under 400px drop trailing segments whole instead of ending in an ellipsis.
- Rename turns the title into a field in place. Enter saves, Escape cancels, blur saves.

Loading, empty, error:

- Skeletons hold the card's shape (thumbnail block, two text bars) with a slow shimmer; no spinners in the middle of lists. The share dialog's views list has a skeleton state.
- Empty states name what happened and offer the next step with a secondary button: the Library search's "No results for …" with Clear search and filter; the share dialog's "No one has opened it yet".
- Errors are inline alerts on `--danger-tint` with a bold line of what failed, a plain line of what it means, and a Retry button that goes busy, then resolves. Field errors are the red hairline plus a line of text.

## Screens

Library. Page head with the title and the three actions (New menu, Upload, Record), then one toolbar row: tonal search with a clear button, a segmented type filter (All, Videos, Pages, Documents), the sort menu and the grid or list toggle. Under 720px the actions wrap under the title, right-aligned, as the current PageHeader page variant does; New becomes an icon-only plus with the same menu, so a phone can still make a page or a folder, and the layout toggle hides so sort sits on the filter row. The sort icon takes `--accent-text` while the sort is not Last edited. Folders come first as 44px surface tiles at the card column's width; the root shows one, Brand assets. Then the grid with the brief's five cards (Northstar launch walkthrough, Welcome to your proposal, Product overview, Project brief.pdf, Follow-up for Maya), which with the folder are the six agreed entries. The long-titled processing upload appears only in the System sheet's card anatomy. Search and filter work together and reorder nothing; sort reorders. Selecting a card shows the glass selection bar with Move to, Share (enabled for exactly one item, because one link belongs to one item) and Delete.

Editor. A 52px toolbar: back, the inline title field, the Draft or Live chip and the save state on the left; Desktop and Phone preview widths in the centre; Preview (quiet), Share (secondary) and Publish (primary) on the right. The canvas holds the page at 760px (390 in phone width) with three sections: intro video with the player, the value section with headline, text and three points, and the call to action with its heading, brand button and quiet email link. A hovered section shows a 1px hairline ring; the selected one a 2px accent ring and a glass toolbar above it. The 360px properties panel is an accordion with one row per section plus Page settings; the open row follows the selected section and vice versa. Fields in the panel write into the canvas as you type. Move up and down reorder both the canvas and the accordion. Page settings holds the title and the brand colour only; who can open the page and view alerts are set in the Share dialog, so one setting has one place. Section toolbars hold move, replace, trim and duplicate; there is no Delete section, because the prototype cannot delete one and a control that only says so would be a dead button.

The video Source field switches among three local samples. Aspect changes the canvas player between landscape and portrait; Auto follows the selected sample. Source changes reset playback and trim to the new duration. Upload is disabled because the prototype has no file ingest.

Share. One dialog from the Library's card menu, the selection bar, the file preview, the Home stage, the editor and `?view=share`. The title and the public link come from the item: `/p/` for pages, `/w/` for videos, `/f/` for files, then the title as a slug. Copy link is the primary, with a hint that says it is a sample link; who can open it (anyone, password, paused) with a password field when needed and a status chip in the footer; a notify switch; the views list, labelled Demo data. Its four states are switched by the dark prototype bar docked under the footer, inside the dialog element so it stays interactive while the dialog is modal and never reads as a product filter. Open page goes to the public page; Done closes. Escape and the backdrop close; focus returns to the opener.

System. Depth tiles, the token swatches read live from the stylesheet, a contrast table, the type ramp, space and radius scales, the button matrix with live rest and simulated hover, pressed and focus columns, media controls on a scene, fields in every state, selection controls, tabs, a live menu and a static dialog, toasts and tooltips, loading, empty and error examples, the card anatomy with the long title, the action hierarchy and a table.

Extras (Home, Recorder, Public page, Settings) use the same fixtures. They are reachable by `?view=` and from in-app links (Record opens the recorder, a video card opens the public page, Settings sits in the sidebar), not from the prototype bar or the main navigation. They show the shell, the dense forms and the glass dock, and they can be removed without touching the three required screens.

## Action hierarchy

One primary per view, never two of the same weight next to each other.

| View | Primary | Secondary | Quiet |
|---|---|---|---|
| Library | Record | Upload | New (page, template, folder), sort, layout, card More, selection bar |
| Editor | Publish, then Update | Share | Preview, section toolbar, Add section |
| Share dialog | Copy link | | Open page, Done |
| Home | Record | Open editor | Preview, Share, Library link |
| Recorder | Record, then Stop, then Copy link | Put it on a page | Record again, devices, Save to |
| Public page | the rep's call to action (brand) | lead form submit (brand, inside its card) | player controls, the email link |
| Settings | Save, per section | Change password, Manage billing | Cancel, Delete… |

## Mapping to the current Clarity primitives

Read from the snapshots in `reference/`. Names and paths should be checked against the repository before any change.

- Tokens. The current theme's `--primary` (`oklch(0.546 0.215 262.9)`, the brand blue) is `--accent` here, kept at `#2563eb`. `--background` and `--card` map to `--canvas` and `--surface`; `--muted` to `--surface-2`; `--border` to `--hairline`; `--ring` to the focus ring. `--radius: 0.625rem` (10px) stays the thumbnail and menu radius; controls use 8px, the current `--radius-md`. The `--btn-*` stack (gradient, edge, halo, shadow, lift) and `--glass-highlight`, `--glass-shadow` and the `@utility glass` light-catch gradient are what this direction deletes.
- `Surface` altitudes (`surface.tsx`). `hero` and `panel` collapse into one flat face, because a panel's controls and a page's controls no longer differ. `bar` maps to `--glass` (selection bar, section toolbar). `media` maps to `--glass-media` plus `--on-media`; `--cg-ink-dim` should become icon-only, as `--on-media-2` is here. `ChromeSegmented` is `.seg.media`; `ChromeSeparator` is `.vr`.
- `Button` (`button.tsx`). `default` is `.btn-primary`, `outline` is `.btn-secondary` (tonal, no border), `ghost` is `.btn-ghost`, `destructive` is `.btn-danger` with `.btn-danger-solid` for the confirming step, `link` is `.link`. `plain` survives as the icon inside the search field. `dashed` becomes the Add section ghost button. `gold` and `ink` are marketing faces and out of scope. The `paint: none` escape hatch and the `data-active` tint go away because there is no painted face to escape from. Sizes: `default` 32px becomes 36 (`--h-md`); `lg` 40 becomes 44; `sm` 28 stays; `toolbar` and `icon-toolbar` (36, 44 on coarse) are `.btn` and `.icon-btn` with the coarse-pointer heights.
- `Input` (`input.tsx`). `default` is `.input`; `panel` (filled, no outline) is not used, the panel takes the same hairline field as a form; `inline` is `.doc-title`; `glass` is out of scope (sign-in). The invalid ring maps to `aria-invalid` here. `h-8` becomes 36.
- `Dialog` (`dialog.tsx`). `DialogPopup` maps to `dialog.dialog`: radius 16 instead of `rounded-lg`, no border in light, `--shadow-dialog`, the same 150ms fade. The portal's `SurfaceProvider surface="hero"` becomes unnecessary once faces are flat.
- `DropdownMenu` (`dropdown-menu.tsx`). `rounded-lg bg-popover p-1 shadow-md ring-1 ring-foreground/10` becomes radius 10, `--shadow-raised` in light, `--raised-edge` hairline in dark, items 32px with `--fill-1` on highlight instead of `bg-primary/10`. Radio and checkbox items keep the trailing check.
- `FrostStage` and `FrostCardRail` (`home/`). The stage (`bg-card/55 backdrop-blur-sm inset-ring`) is removed; `FrostPageWindow` survives as the page thumbnail's small window (`.thumb-page`), `PAPER` as the document thumbnail (`.thumb-doc`). The rail's column of three beveled controls with an unfurl becomes `.card-actions` (one More button, shown on hover, focus-within and always on `hover: none`) plus `.card-check` (shown once a selection exists or on its own focus), with a `data-tip` tooltip on More.
- `PageHeader` (`PageHeader.tsx`). `page` variant: `text-4xl` (36px) becomes 28px display; actions stay on the same row and keep the right alignment; under 720px the title shrinks to 22px, the actions wrap under it right-aligned as the variant does below md, and the quiet New menu becomes an icon-only plus. `compact` and `toolbar` variants are the editor and recorder `.toolbar`.
- `LibraryToolbar` (`LibraryToolbar.tsx`). Search, filter and sort stay in one row; the trailing New folder action moves into the page head's New menu. The filter changes from an icon menu to a visible segmented control; sort stays an icon menu; `searchFill` is the phone behaviour here.
- Editor split. `--grid-template-columns-editor: minmax(0,1fr) 380px` becomes `minmax(0,1fr) 360px`, 320 under 1180px, 300 under 900, stacked under 720. The player letterbox `--player: #020617` maps to the player matte `#0c0e12`.
- Sequence for a port: tokens first (they can coexist with the current scale), then buttons and fields, then cards, then the three glass surfaces, then the editor panel. Each step deletes its sculpted predecessor in the same change.

## Accessibility

- Text colours meet 4.5:1 on the surfaces they sit on in both schemes, including card meta on canvas (4.7:1 light). White on the accent is 5.2:1 light and 4.5:1 dark; dark hover goes darker to stay above that. Disabled text is below the floor on purpose.
- Field borders at 18% alpha are 1.5:1 against surface, under the 3:1 non-text guidance. Fields are also identified by their label and placeholder, and focus and error states are 2px and coloured. Raising the border to meet 3:1 would make every field heavy; this is a known trade-off, listed under gaps.
- One focus ring everywhere. Menus, dialogs and the drawer manage focus: into the first control, back to the opener on close.
- Menus set `aria-haspopup` and `aria-expanded`, items use `menuitem` or `menuitemradio` with `aria-checked`; switches use `role="switch"` and `aria-checked`; segmented controls use `aria-pressed`; tabs use `aria-selected` with a roving tabindex and move with the arrow keys; the accordion uses `aria-expanded` and `aria-controls`; busy buttons set `aria-busy`; the seek bar and the trim handles are `role="slider"` with min, max, now and valuetext, operable with the arrow keys. Escape closes the phone drawer as well as menus and dialogs.
- Touch targets: on a coarse pointer, and at 720px and under, small and medium controls are 44 and large ones 48, icon buttons and the card's More included; switches and checkboxes keep an invisible 44px hit area; segments are 40 in a 44 track; swatches are 36 with 16px gaps. None of this was verified on a touch device or with coarse-pointer emulation; see gaps.
- Reduced motion zeroes transitions and stops the shimmer and the record pulse. Reduced transparency swaps glass for opaque fills.
- Captions, processing and locked states are plain text, not icons alone. Toasts are a polite live region.

## Responsive behaviour

- 1440 and 1280: full sidebar, three or four card columns, editor panel 360px.
- 1180 and under: the Home stage is one column; editor panel 320px.
- 1024 to 721: the sidebar becomes a 64px icon rail with tooltips to the right; content gutter 24px.
- 900 and under: the editor's preview-width control and save state hide; forms stack; editor panel 300px.
- 720 and under (768 tablets in portrait share this with phones at 390 and 375): the sidebar is a drawer behind a menu button in the page head, with a scrim; the Library header puts New (icon only), Upload and Record on a second row under the title; search fills the row, the layout toggle hides and sort sits on the filter row; controls take the touch heights; the card's More button is always visible; cards go two across; the editor stacks canvas over panel and the page scrolls as a whole instead of per column; the toolbar wraps to two rows; dialogs tighten their padding; the recorder dock shows icons only; the System sheet's wide tables and the button matrix scroll inside their own container, not the page.

No layout should scroll the page sideways. This was reasoned from the stylesheet, not observed; see gaps.

## Rollout risks

- Containerless cards change the Home rail's look more than any other surface. If the team wants a visible card body, the fallback is a `--surface` container at 12px radius with no border and the thumbnail at 8px inside it; the rest of the system is unaffected.
- Flat secondary buttons on `--fill-2` can read as disabled next to a primary when the canvas is very light. The System sheet shows them side by side; if it is a problem in use, `--fill-2` can rise to 10% without touching anything else.
- Dark-mode raised surfaces rely on a hairline only. Menus over dark video may want one soft shadow; adding it means removing the hairline to keep the one-treatment rule.
- Moving the filter from a menu to a segmented control costs toolbar width. Under 720px the segment labels shorten to fit; if more types are added, the control should return to a menu.
- The accordion panel ties section navigation to properties. Pages with many sections will scroll the panel; a sticky header row for the selected section would be the next step.
- Removing `Surface` altitudes from `Button` touches every call site that sets `surface="panel"`; the port must keep `bar` and `media` behaviour for the chrome that stays glass.

## Implementation plan

1. Tokens: add the new scale beside the current one in `index.css`; map `--primary` and friends to it; no visual change yet.
2. Buttons and fields: replace the painted faces with the four flat variants and the one-hairline field; delete the `--btn-*` stack and the `glass` highlight gradient; keep `bar` and `media` as the two glass tints.
3. Cards: replace `FrostStage` with the thumbnail surface and the kind windows; replace `FrostCardRail` with the two-button actions and the select box; carry the processing scrim.
4. Shell: page head with title and actions, the toolbar row with the segmented filter, sidebar rail and drawer.
5. Editor: accordion panel bound to canvas selection, section toolbar on glass, inline title field, live validation on the link field.
6. Share dialog and feedback: the views list states, inline alerts, skeletons and empty states as shared components.
7. Cleanup: remove the unused altitudes, the `paint` escape hatch, `data-active` and the yellow timeline token.

Each step ships on its own and deletes what it replaces.

## Self-critique

- The share dialog is dense. Link, access, password, notify and a views list sit in one 480px dialog, with a four-way demo bar under its footer. In production the views list belongs on the page's analytics, and the demo bar would not exist. The dialog is this busy so critics can judge the states in one place.
- The Library's New page as a quiet button may be too quiet for teams that start from templates. The hierarchy follows the direction's "simplify"; the brief's own emphasis on Record and Upload decided the order.
- The value section's three points add a component (`.jp-values`) the brief did not ask for. It is there so the editor has something to edit in the value section besides two text fields.
- The page thumbnail's small browser window carries a paper shadow, which is a second raised object inside a tone surface. It follows the rule (the paper is raised, the thumbnail is tone), but it is the one place a critic may read two treatments on one card.
- The System sheet uses sentence-length captions. They explain intent for the comparison; a production sheet would be terser.

## Remaining gaps and what was not verified

- No browser verification this session. Running Chrome, node or python needed an approval nobody was present to give, so screenshots at 1440, 1280, 768, 390 and 375, the horizontal-overflow check (`?selfcheck` writes the page's scroll width onto `<html>`), the focus order and the postMessage contract were reasoned from the code and not observed. The parent's browser pass should check these first.
- Contrast ratios are computed from hex values with the WCAG formula, not measured.
- Touch behaviour is not verified. The round-two capture at 375 used a fine pointer, so the coarse-pointer rules never ran, and the parent's tool cannot emulate a coarse pointer. The 720px condition now applies the same sizes by viewport, which a plain resize can capture, but nothing was tested on a touch device or with pointer emulation.
- Field borders are under the 3:1 non-text guidance, as in the current theme.
- The duration chip over very light portrait thumbnails sits on blurred colour; 5.4:1 is the computed floor for the lightest fixture, not for arbitrary uploads.
- Drag reorder, multi-select with Shift, keyboard shortcuts and the Move to submenu are not built; the menu items say so.
- The recorder preview is drawn, not a camera. The chip in its toolbar says so.
- The Home, Recorder, Public page and Settings screens have had less attention than the three required screens.
- Tooltips use a CSS pseudo-element and are not announced to screen readers; the buttons carry `aria-label`s, so nothing is lost, but a production tooltip should be a described-by element.

## Open questions for the feedback rounds

1. Containerless cards versus a bare `--surface` container. Which does the team want to see at the rail scale?
2. Should Record be the Library's primary, or should New page keep that place as it does today? For this comparison the parent kept Record, since all four alternatives chose it; it stays a proposal until the user decides.
3. Accordion panel versus a separate section list. The accordion matches the current editor; a list would match the brief's description of a left structure.
4. Dark-mode raised surfaces: hairline only, or one soft shadow with the hairline removed?
5. Should the value points stay in the sample page, or should the value section be headline and text only to match the other directions more closely?

## Feedback round 1

Applied on 3 October 2026 from the independent critique and the parent's code review. No browser ran in this session; the parent owns screenshots and syntax checks, so every claim below is read from the files.

Accepted:

- Invented structure (finding 1). The stats strip and the Insights item are gone, the Home stage lost its radial wash, and the sidebar has one entry for the library. The Home screen stays in the file at `?view=home`, outside the navigation, as the parent asked. The "stays" list no longer claims a Home stage; `FrostStage` is the card's frosted container.
- Page head (finding 2). The hide rule is `.icon-btn.nav-toggle`, so it beats the icon-button rule and the menu button exists only under 720px. There, the actions wrap under the title, right-aligned, as the current PageHeader page variant does below md.
- Card chrome (finding 3). The Share chip is gone; Share stays in the More menu, which gains Select. The select box shows once a selection exists or when it has keyboard focus, not on hover. Touch shows More only, at 44px. Hidden chrome also takes no pointer events: with the box hidden by default, its 44px hit area would otherwise have caught taps on the top-left of every thumbnail.
- Dark tooltips and toasts (finding 4). `--surface-inverse` and `--text-inverse` became `--ink` and `--on-ink`: ink in light, surface plus `--raised-edge` in dark, which is the menu recipe. The toast's Undo button lost its dark-mode variant.
- Card meta (finding 5). The segments are separate spans, the ellipsis sits on the text, and under 400px the third segment is dropped.
- Rules versus CSS (finding 6). Dark `--shadow-dialog` is none. The inspector uses the 28px segment. The 7px radii fold into 8, the file tag is the neutral chip, the sort icon takes `--accent-text` when the sort is not Last edited, and the sheet caption says five radii.
- Parent code review. Opening the share dialog from a card menu records the menu's trigger as the return target. `showView` closes open dialogs before the old screen leaves the layout. The prototype bar holds the three required tabs and the scheme switch and nothing else; the extra screens keep their content.
- Optional polish taken. Page, document and image slots moved from `--surface-2` to `--surface-3`.

Deferred, with reasons:

- Record as the Library primary stays, per the parent's decision, and is marked as a proposal under Changes and in open question 2.
- The quiet New page still hides under 720px. On its own row it would fit at 375 but not at 320, and showing it would risk sideways scroll. Say so if phones need it and it can wrap to a third row.
- Screenshots were not retaken. The 1280 hamburger, the 375 title, the meta clipping and the dark white pill should be rechecked in the parent's browser pass.

## Feedback round 2

Applied on 3 October 2026 from the independent critique and the parent's findings. No browser ran in this session; the parent owns screenshots and syntax checks, so every claim below is read from the files.

Accepted:

- Phone Library and creation path (finding 1, parent). New page and New folder are one New menu (Page, From a template, Folder) in the page head, so the toolbar row holds search, filter, sort and layout. Under 720px New is an icon-only plus with the same menu beside Upload and Record, and the layout toggle hides so sort sits on the filter row. The phone Library has four rows of chrome instead of five and can make a page or a folder. This supersedes the round-one deferral.
- Fixtures (parent). The Library holds the six agreed entries: five cards and the Brand assets folder, which is a folder now rather than a PNG. The Proposals, Onboarding, Templates and Brand tiles are gone, and so is the sidebar's folder list, which repeated them. The long-titled processing upload lives only in the System sheet's card anatomy. The recorder's Save to menu and the upload dialog's folder list offer Library and Brand assets.
- Share settings in one place (finding 2). Page settings keeps Title and Brand colour and says where access and alerts live. The link row, the password switch, the notify switch and the partial sync behind them are gone from the panel.
- Demo switch in the Share dialog (finding 3). The List, Loading, Empty, Error control is the dark prototype bar, docked under the footer inside the dialog element so it works while the dialog is modal. The Demo data chip stays on the heading.
- Touch sizes (finding 4, parent). The coarse-pointer block set `--h-sm` to 36, and most of its component rules lost to later rules of equal specificity, so swatches, pills and trim handles never grew. One condition, coarse pointer or 720px and under, now sets small and medium heights to 44 and large to 48, and the component overrides sit at the end of the stylesheet. Icon buttons, dialog close buttons, the search clear and the card's More are visible 44px squares; segments are 40 in a 44 track. The 720px condition exists because the parent's tool cannot emulate a coarse pointer. This document and the System sheet state the real heights.
- Open state and semantics (finding 5). Every button variant paints its active fill while `aria-expanded` is true. The trim handles are `div` elements with `role="slider"`, min, max, now, valuetext and orientation, because a `button` cannot carry the slider role. Escape closes the phone drawer when no menu has handled it. Settings tabs have a roving tabindex and move with the arrow keys, Home and End.
- Meta and chips (finding 6, parent). A document's page count and size are separate meta segments, so the under-400px rule drops them whole. Every chip over a thumbnail is the glass-media chip, which computes to 5.7:1 over the lightest slot; the grey chip that computed to about 4.4:1 in dark mode no longer appears on images.
- Optional polish taken. Share links derive from the item (`/p/`, `/w/` or `/f/`, then the title as a slug), the selection bar's Share is enabled for exactly one item, and the file preview's Share names the file. Delete section is removed from the section toolbars rather than toasting that it cannot delete. The processing card says Processing in both places. `--glass-media-hover` replaces the two patched hover values.

Deferred, with reasons:

- Duplicate section still toasts. It is the same demo-only pattern as New page and Add section, and the parent asked for no new features. Delete section was removed because it had no reversible local behaviour to describe.
- Record as the Library primary stays, per the parent's decision (open question 2).
- Live on a page card is now the white glass chip, not the accent chip. If the team wants Live to carry colour on the image, that would be a second chip recipe over media; it is left as a question rather than decided here.
- Screenshots were not retaken. The parent should capture 375 and 390 after this pass: the touch heights apply at those widths with a plain resize, so the 44px More button, the icon-only New and the four-row Library head can be checked without pointer emulation. Nothing here was verified on a touch device.
