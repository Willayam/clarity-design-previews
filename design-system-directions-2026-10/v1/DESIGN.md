# V1 current baseline

This page is a comparison baseline for Clarity's current visual system. It keeps the blue primary gradient, pale shell, frosted outline actions, inset highlights, and shadowed glass. The library has the current left navigation, Home shelves, compact folder row, toolbar, and media card rail. The editor has a page preview beside a 380px accordion panel. It is intentionally dense in the same places as the app.

The prototype uses the current compiled CSS from `.context/rail-state-review/preview/assets/rail-state-check-QnDxCTN1.css` as `current.css`. Only its font URLs were pointed at the shared local Geist file. `styles.css` recreates the app layout and component assembly for fictional content. The behavior in `app.js` is local and has no backend connection.

## Rules and source mapping

| Rule | Current V1 value | Source mapping |
| --- | --- | --- |
| Font | Geist Variable; 12–14px metadata and controls, 16px section headings, 36px library heading | `index.css`, `PageHeader`, `HomeTreeRoute` |
| Main radius | `0.625rem` (10px) | `index.css --radius`, `Button`, `Input` |
| Spacing | 4, 8, 12, 16, and 24px are the common steps | Existing Tailwind spacing and component classes |
| Sidebar | 272px on desktop, drawer below 800px | `AppSidebar` and sidebar width token |
| Editor panel | 380px beside the preview on desktop; its column collapses when the topbar toggle closes it | `EditorWorkspace` |
| Home layout | Horizontal shelves for Folders, Journey Pages, Videos, Documents; 272px cards; compact folder row | `HomeDashboardShelves`, `HomeTreeRoute` |
| Button faces | Primary gradient and halo; outline glass with top highlight and inset shadow | `button.tsx`, `surface.tsx`, `index.css` |
| Media rail | Dark beveled 34px frame with whole-frame hover and press; 46px on coarse pointer | Current `FrostCardRail.tsx` and media tokens |
| Field | 36px library search, 32px property field, border or muted fill | `input.tsx` |
| Motion | Brief 75–150ms control transitions; disabled when reduced motion is requested | Current button and rail classes |

The shared light tokens are `--background: oklch(0.984 0.003 247.858)`, `--foreground: oklch(0.208 0.042 265.755)`, `--card: oklch(1 0 0)`, `--primary: oklch(0.546 0.215 262.9)`, `--muted: oklch(0.968 0.007 247.896)`, `--border: oklch(0.929 0.013 255.508)`, `--ring: oklch(0.546 0.215 262.9)`, `--glass-bg: oklch(1 0 0 / 0.58)`, `--glass-bg-elevated: oklch(0.99 0.003 255 / 0.74)`, `--glass-border: oklch(0.208 0.042 265.755 / 0.07)`, and `--glass-highlight: oklch(1 0 0 / 0.92)`.

The shared dark tokens are `--background: oklch(0.129 0.042 264.695)`, `--foreground: oklch(0.968 0.007 247.896)`, `--card: oklch(0.208 0.042 265.755)`, `--primary: oklch(0.623 0.17 259.8)`, `--muted: oklch(0.279 0.041 260.031)`, `--border: oklch(1 0 0 / 10%)`, `--ring: oklch(0.623 0.17 259.8)`, `--glass-bg: oklch(0.208 0.042 265.755 / 0.6)`, `--glass-bg-elevated: oklch(0.208 0.042 265.755 / 0.76)`, `--glass-border: oklch(1 0 0 / 0.09)`, and `--glass-highlight: oklch(1 0 0 / 0.16)`. The shell uses the source's light blue or deep slate gradient. Media controls use the current fixed dark tokens in both themes.

Hover changes the glass or gradient fill and shadow. Press moves the whole button or rail frame down 1px. Focus uses a 2px outline at a 2px offset. Disabled controls dim to 50%; busy is shown as a separate labeled sample. Selected tabs use the card face and a small shadow. Error fields use the destructive border and ring. The system screen labels forced hover, press, focus, loading, and error examples as simulated; normal controls still respond to real hover and focus.

## Interaction coverage

The three views work directly through `?view=library|editor|system` and `?theme=light|dark`. The parent can send `{type:'clarity-preview',view,theme}`. The small floating theme switch is labeled Preview and is not product UI. Search and filters alter the sample library. Cards have local menu, open, and share actions; the compact folder has Open and More. The editor topbar has the Journey Pages breadcrumb, save status, Page style icon, AI Generate, Share, Sharing settings, and panel toggle from the current component. The panel toggle removes the 380px column so the preview expands. The page title, section navigation, and properties accordion work locally. Share opens a dialog with a sample link, access setting, copy feedback, and selectable normal, empty, loading, and error examples. Escape closes it, Tab stays inside, and focus returns to the opener. Upload, Record, and other unavailable product operations show explicit demo feedback.

## Fidelity limits and self-critique

The source CSS and tokens are exact, but this is hand-built HTML rather than the React components. The mock card art and page copy are fictional. The page editor's controls show the current arrangement and density, while the full production editing tools, timeline, upload pipeline, permissions, and analytics are outside this static artifact. The current rail is recreated from the source and recent verified state treatment, with no claim of pixel equality across every browser. Sidebar details, card artwork, and some small control spacing are approximations. The system view exposes V1's many highlights and shadows clearly; the stacking of these effects is the main visual concern the comparison is meant to test.

The baseline does not revise the design. I rejected simplifying the glass, flattening buttons, and moving the editor panel because those choices belong to the four alternatives. A production rollout would require implementation in the shared React components, checks across the real library and editors, keyboard and contrast review, and normal deployment verification. This artifact does not establish production readiness.
