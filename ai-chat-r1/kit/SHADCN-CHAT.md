# shadcn chat parts (June 2026 release)

Install in the real app later with `pnpm dlx shadcn@latest add message-scroller message bubble attachment marker`. For the lab, reproduce the anatomy in plain HTML with `data-slot` names so a port is mechanical.

- **MessageScroller**: the scroll container. Anchors each new turn, follows a streamed reply, keeps position when history is prepended, offers jump-to-latest. Owns no messages or model state.
- **Message** `align: start | end`. Parts: `MessageGroup` (consecutive messages from one sender), `MessageAvatar` (bottom-aligned), `MessageContent` wrapping `MessageHeader` (sender, always start-aligned), the `Bubble`, and `MessageFooter` (status or actions such as copy, retry; aligns to the message side).
- **Bubble** `variant: default | secondary | muted | tinted | outline | ghost | destructive`, `align: start | end`. Up to 80% of the row; `ghost` is unframed and full width (good for assistant prose). Parts: `BubbleContent` (can render as a button or link), `BubbleReactions`, `BubbleGroup`. Long content collapses with show more.
- **Attachment**: a file or image card with media, metadata, upload state and actions. The whole card is a trigger; its actions stay separately clickable.
- **Marker** `variant: default | border | separator`. Parts: `MarkerIcon` (decorative), `MarkerContent`. Use for status rows, tool activity ("Searched your library"), system notes and labelled separators ("Today"). A running step gets `role="status"`, a spinner icon and the `shimmer` class on its content.
- **shimmer** utility: animated text for live status ("Thinking", "Writing the page").
- **scroll-fade** utility: scroll-aware edge fades on the scroller and on attachment rows.

There is no composer in the release. Vercel's AI Elements has a prompt input; Clarity already has its own composer (`editor/src/components/editor/GenerateComposer.tsx`) with inline pasted-text chips and file drops. Keep that behaviour.
