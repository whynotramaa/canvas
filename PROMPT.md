# Build prompt: a keyboard-first infinite whiteboard on Bun

Paste everything below this line into the coding agent. Replace `[Name]` with the product name once you pick one.

---

## Role and goal

You are building `[Name]`, an infinite-canvas whiteboard for sketching diagrams. It starts from everything Excalidraw does and goes further in five places:

1. A real file system with nested folders, search, tags, backlinks and trash.
2. A large searchable icon library, including logos for well-known products (Kafka, Redis, Postgres, Netflix, Prime Video, AWS services and so on), insertable by typing.
3. Keyboard-first control. Every action has a shortcut, and a command palette reaches all of them.
4. A gen mode that turns text, code, Mermaid, or a photo of a whiteboard into an editable diagram.
5. Diagram-as-code that syncs both ways with the canvas.

The visual direction is minimal. The canvas is the product. Chrome stays out of the way until the user calls for it.

Build it in TypeScript on Bun. Do not copy Excalidraw's name, logo or branding. Excalidraw is MIT licensed, so you may read its source for reference and reuse code with its license notice kept intact. Its scene format is the import and export target for compatibility.

## Stack

Use these unless a phase below gives a concrete reason to change. Do not add a dependency for something a few lines of code or the platform already does.

- Runtime, package manager, bundler, dev server and test runner: Bun. Use `Bun.serve` with HTML imports for the frontend, `bun build` for production, `bun test` for tests, and Bun workspaces for the monorepo. No Vite, no Webpack, no Node-only tooling.
- UI: React 19 with TypeScript in strict mode. The canvas engine has no React dependency. React subscribes to engine state through `useSyncExternalStore`.
- Rendering: Canvas 2D. Use `roughjs` for the hand-drawn style and `perfect-freehand` for pen strokes. Render static layers to a cached bitmap and redraw only the active layer during interaction.
- Local storage: IndexedDB for scenes and metadata, the Origin Private File System for image blobs. The app works fully offline as a PWA.
- Server: `Bun.serve` with WebSockets for live collaboration, `bun:sqlite` for metadata, and `Bun.s3` for blobs when self-hosted with object storage.
- Sync: Yjs for the scene document, so offline edits merge cleanly when a client reconnects.
- Styling: plain CSS with custom properties as design tokens. No CSS-in-JS runtime.
- Desktop app (later phase): Electrobun, so the desktop build stays on Bun.

## Repository layout

```
apps/
  web/            React app, Bun.serve dev server, PWA manifest
  server/         collab relay, share links, file API, auth
  desktop/        Electrobun shell (phase 6)
packages/
  engine/         scene model, geometry, hit testing, renderer, history
  schema/         element types, file format, migrations, .excalidraw import/export
  ui/             toolbar, panels, palette, tokens
  icons/          icon index, search, SVG normalisation build script
  fonts/          self-hosted woff2 files, subsetting script, font metrics
  gen/            prompt templates, model client, Mermaid/D2 parsers, layout
  shortcuts/      keymap registry, chord parser, cheat sheet data
```

## Files and folders

- A workspace holds folders. Folders nest to any depth. Folders hold drawings.
- The sidebar shows a tree with drag-to-move, multi-select, rename in place (F2 or Enter), and keyboard navigation with arrow keys.
- Each drawing has a title, emoji or icon, tags, created and modified times, a thumbnail, and a starred flag.
- Views: All, Recent, Starred, Shared with me, Tags, Trash. Trash keeps items for 30 days.
- Quick switcher on Cmd+P with fuzzy search over file names, folder paths and the text inside drawings.
- Full-text search across every drawing: text elements, sticky notes, labels and frame names. Results jump to the matching element and highlight it.
- Links between drawings. Any element can link to another drawing, a frame inside a drawing, or a single element. Each drawing lists its backlinks.
- Templates: save any drawing or frame as a template. Ship starter templates for system architecture, flowchart, sequence diagram, ER diagram, mind map, user journey, kanban, retro board, wireframe kit and sprint planning.
- Import a folder of `.excalidraw` files and keep the structure. Export a folder as a zip.
- Each drawing is one JSON document with a version field. Write migrations in `packages/schema` from the first release.

## Canvas

- The canvas is infinite in every direction. Pan with Space+drag, middle mouse, two-finger scroll or the hand tool. Zoom with Cmd+scroll, pinch, or keys, from 1% to 3000%.
- Zoom to fit (Shift+1), zoom to selection (Shift+2), reset to 100% (Shift+0), plus a minimap toggled with M.
- Keep 60 fps with 10,000 elements on a mid-range laptop. Use a spatial index (an R-tree such as `rbush`) for hit testing and viewport culling, cache each element's rough shape, and only regenerate it when its geometry or style changes.
- Smart guides and snapping to other elements' edges, centres and equal spacing. Snap to grid when a grid backdrop is on. Hold Cmd to turn snapping off for one drag.
- Selection by click, Shift+click, box select, and lasso (hold Alt while box-selecting, or the lasso tool).
- Group, ungroup, lock, hide, align, distribute, flip, rotate, and layer order.
- Infinite undo and redo with history that survives a reload. Collaborative undo only undoes your own changes.
- Version history: automatic snapshots every few minutes of active editing plus named snapshots. A timeline slider scrubs through them, and any snapshot can be restored or forked into a new drawing.
- Zen mode (hide all UI), view mode (read only), and focus mode (dim everything outside the selected frame).

## Elements and tools

| Tool | Key | Notes |
|---|---|---|
| Select | V or 1 | Lasso with Alt |
| Hand | H | Space holds it temporarily |
| Rectangle | R or 2 | Corner radius control |
| Diamond | D or 3 | |
| Ellipse | O or 4 | |
| Arrow | A or 5 | Straight, curved or elbow |
| Line | L or 6 | Multi-point, closable into a polygon |
| Pen | P or 7 | Pressure-sensitive, smoothing slider |
| Text | T or 8 | Double-click on canvas also creates text |
| Image | I or 9 | Paste, drop or pick a file |
| Eraser | E | Erases whole elements, or partial strokes with Alt |
| Laser pointer | K | Fading trail for presenting |
| Frame | F | Named, clips content, becomes a slide |
| Sticky note | N | Auto-grows with text |
| Icon | / | Opens icon search at the cursor |
| Table | Shift+T | Rows and columns, Tab moves between cells |
| Code block | Shift+C | Syntax highlighting, language picker |
| Math | Shift+M | LaTeX rendered with KaTeX |
| Embed | Shift+E | Web pages, YouTube, Figma, GitHub gists, other drawings |
| Comment | C | Pinned threads on the canvas |

Shape library beyond the basics: triangle, hexagon, parallelogram, trapezoid, cylinder (database), cloud, document, multi-document, stored data, star, callout, speech bubble, brace, cube, person, server, queue, and the full UML and BPMN sets as an optional pack.

Arrows:
- Bind to shapes at any point and stay attached when shapes move.
- Elbow arrows route around obstacles automatically, like orthogonal connectors in diagram tools.
- Arrowheads: none, arrow, triangle, bar, dot, diamond, circle, crow's foot one, crow's foot many, crow's foot one-or-many, and outlined variants.
- Labels sit on the arrow and move with it.
- Cmd+Arrow on a selected shape creates a connected copy in that direction, so a flowchart can be built without the mouse. Tab and Shift+Tab move between connected shapes.

Any shape can hold text. Text wraps to the container and the container can grow to fit.

## Styling

- Stroke colour, fill colour, fill style (none, hachure, cross-hatch, solid, zigzag, dots), stroke width, stroke style (solid, dashed, dotted), sloppiness (architect, artist, cartoonist), edge style (sharp, round), opacity.
- A clean mode that turns off the rough style per element or per drawing, so the same diagram works for a whiteboard session and a design doc.
- A curated palette of 12 colours with 5 shades each, a custom colour picker with hex input and eyedropper, and recent colours.
- Copy styles (Cmd+Alt+C) and paste styles (Cmd+Alt+V).
- Named styles that can be saved and applied, like text styles in a design tool.
- Shadows and gradient fills, off by default.

## Text and fonts

Self-host every font as subsetted woff2 in `packages/fonts`. Check each licence before adding it. Prefer SIL Open Font License fonts.

- Hand-drawn: Excalifont and Virgil (both OFL, from Excalidraw), Caveat, Kalam, Patrick Hand, Architects Daughter, Gochi Hand.
- Sans: Inter, Geist, Nunito, Manrope, IBM Plex Sans.
- Serif: Source Serif, Fraunces, Lora.
- Mono: Geist Mono, JetBrains Mono, Comic Shanns Mono, IBM Plex Mono.
- Display: Lilita One, Bricolage Grotesque.
- Fallbacks for CJK, Arabic, Devanagari and emoji, loaded only when the text needs them.

Text features: font size presets plus custom size, bold, italic, underline, strikethrough, alignment (left, centre, right, vertical top, middle, bottom), line height, letter spacing, bulleted and numbered lists, inline code, links, and a small Markdown subset typed directly (`**bold**`, `- list`, `` `code` ``). Exports embed only the glyphs used.

## Backdrops

All backdrops are subtle by default and have an opacity slider. Each one has a light and a dark version.

- Plain
- Dot grid
- Line grid
- Graph paper with major and minor lines
- Isometric grid, with snapping along its axes
- Ruled notebook paper
- Blueprint (blue ground, white lines)
- Chalkboard
- Kraft paper and warm paper textures, as tiled images under 50 KB
- Light film grain over a flat colour
- A soft radial vignette

Backdrops scale with zoom and fade their minor lines out when zoomed far out, so the screen never fills with noise. The grid size is configurable, and snapping follows it.

## Icons and logos

This is the feature that sets `[Name]` apart, so give it real depth.

Sources, in priority order, each with its licence recorded in the icon index:
- Simple Icons for brand logos (Kafka, Redis, PostgreSQL, MongoDB, Netflix, Prime Video, Spotify, Stripe, GitHub, Docker, Kubernetes, and about 3,000 more).
- Devicon for programming languages and developer tools.
- The official AWS, Google Cloud and Azure architecture icon sets, which the vendors publish for use in architecture diagrams.
- Lucide for general UI icons.
- A small custom set drawn in the hand-drawn style for generic concepts: database, cache, queue, load balancer, CDN, user, mobile, browser, server, function, bucket, API gateway, cron, webhook, email, payment.

Brand logos are trademarks. Use them only to identify the product in a diagram, follow each vendor's guidelines, and show the source and licence in the icon's info panel.

Behaviour:
- Press `/` or type `:` inside any text to open icon search at the cursor. `:redis` inserts the Redis logo. `:pg` matches Postgres through aliases.
- Search covers names, aliases, categories and tags. "database" returns Postgres, MySQL, Mongo, DynamoDB, the generic cylinder and more.
- Every icon has three render modes: original brand colours, monochrome in the current stroke colour, and a hand-drawn trace made with roughjs from the SVG paths.
- An icon dropped on a shape becomes that shape's badge. An icon with a label becomes a node that arrows can bind to.
- Users can upload their own SVG icons into personal or team libraries. Libraries import and export as files and accept `.excalidrawlib`.
- Build step: a Bun script in `packages/icons` normalises every SVG (viewBox, single path where possible, no embedded styles), generates the search index, and splits icons into lazy-loaded chunks by category. The base app bundle carries no icon data.

## Diagrams

- Diagram-as-code panel (Cmd+Shift+D). Supports Mermaid (flowchart, sequence, class, state, ER, gantt, mind map), D2, and a small native DSL. Editing the code updates the canvas, and editing the canvas updates the code. Elements created by code keep a stable ID so manual styling survives a regeneration.
- Auto-layout for any selection: layered (top-down or left-right), tree, radial, force-directed and grid. Use `elkjs` for layered and orthogonal routing.
- Tidy up (Shift+A) aligns nearly-aligned shapes, equalises gaps, and straightens almost-straight arrows without changing the layout.
- Smart containers. A frame or large rectangle that holds other shapes moves them with it and can auto-size to its content, like a group of services inside a VPC.
- Components. Turn a selection into a reusable component. Instances update when the main component changes, and each instance can override its text and colours.

## Gen mode

Press G or Cmd+K then "Generate". Gen mode opens a prompt bar at the bottom of the canvas. Output is always plain, editable elements, never a flat image.

Capabilities:
- Text to diagram. "Event-driven checkout with Kafka, Redis cache, Postgres, Stripe" produces a laid-out architecture diagram with the right logos.
- Code to diagram. Paste a SQL schema to get an ER diagram, an OpenAPI file to get an endpoint map, or a Terraform or docker-compose file to get an infrastructure diagram.
- Photo to diagram. Upload a photo of a whiteboard or a hand sketch and get clean elements back.
- Sketch cleanup. Select rough pen strokes and convert them into rectangles, ellipses, arrows and text.
- Edit by instruction. Select part of a diagram and type "add a read replica" or "make this left to right".
- Explain. Generate a written summary of the selected diagram as a sticky note or as Markdown on the clipboard.
- Text to wireframe. "Settings page with sidebar and two forms" produces a low-fidelity wireframe.

Implementation:
- The model returns structured JSON that matches the schema in `packages/schema`, or Mermaid that runs through the existing parser. Validate the response before it touches the scene. On invalid output, retry once with the validation error, then show the error.
- Stream results onto the canvas as nodes arrive.
- The whole generation is one undo step.
- Use the Claude API with `claude-sonnet-5-5` by default and `claude-opus-5-5` for photo-to-diagram and large edits. The provider sits behind one small interface so a local model can replace it.
- Requests go through the Bun server. The API key never reaches the browser. Self-hosters can set their own key, and gen mode hides itself when no key is set.

## Keyboard-first control

- Command palette on Cmd+K. It lists every action with its shortcut, supports fuzzy search, and remembers recent commands.
- `?` opens a cheat sheet grouped by category, searchable, and generated from the keymap registry so it is never out of date.
- Every action in the app is registered in `packages/shortcuts` with an ID, a default binding, a label and a category. The toolbar, the menus, the palette and the cheat sheet all read from that registry.
- Chords are supported (for example `G then A` to align left).
- Users can rebind any shortcut in settings and export or import their keymap.
- Mac and Windows/Linux bindings are both defined, using Cmd and Ctrl respectively.
- Inline number entry. With a shape selected, typing `w 240` sets width, `r 45` rotates, `x 100 y 200` moves.
- Arrow keys nudge 1px, Shift+Arrow nudges 10px or one grid step.
- Focus never gets trapped. Escape always steps back one level (exit text editing, then clear selection, then close panels).

Default keymap beyond the tools table:

| Action | Shortcut |
|---|---|
| Command palette | Cmd+K |
| Quick switcher | Cmd+P |
| New drawing | Cmd+Alt+N |
| Toggle sidebar | Cmd+\ |
| Gen mode | G |
| Diagram-as-code | Cmd+Shift+D |
| Duplicate | Cmd+D, or Alt+drag |
| Group / ungroup | Cmd+G / Cmd+Shift+G |
| Lock | Cmd+Shift+L |
| Bring forward / to front | Cmd+] / Cmd+Shift+] |
| Send backward / to back | Cmd+[ / Cmd+Shift+[ |
| Flip horizontal / vertical | Shift+H / Shift+V |
| Copy as PNG | Shift+Alt+C |
| Toggle grid | Cmd+' |
| Toggle snapping | Alt+S |
| Zen mode | Alt+Z |
| View mode | Alt+R |
| Presentation | Cmd+Enter |
| Dark mode | Alt+Shift+D |
| Cheat sheet | ? |

## Collaboration and sharing

- Live sessions over WebSockets on the Bun server, with Yjs for merging. Show cursors with names, live selections, and who is viewing which frame.
- Follow mode. Click a collaborator's avatar to follow their viewport.
- Share links with view, comment or edit rights, optional expiry and optional password.
- End-to-end encryption for shared links. The key lives in the URL fragment so the server stores only ciphertext, the same model Excalidraw uses.
- Comments pinned to elements or canvas points, with threads, mentions, resolve, and a comments panel.
- Teams and shared workspaces with roles (owner, editor, commenter, viewer).
- Read-only embeds for docs sites and wikis through an iframe URL.

## Presentation

- Frames become slides in order. Reorder them in a slide panel.
- Presentation mode animates the camera between frames. Arrow keys and Space advance.
- The laser pointer and a temporary pen work during the presentation and their marks fade away.
- Speaker notes per frame.
- Export the deck as PDF with one page per frame.

## Import and export

- Export PNG (1x, 2x, 3x, transparent or with backdrop), SVG with embedded fonts, PDF, and WebP.
- Embed the scene JSON inside exported PNG and SVG files so they can be dropped back in and edited.
- Copy to clipboard as PNG, SVG, or scene JSON. Pasting scene JSON from another `[Name]` or Excalidraw tab works.
- Import `.excalidraw`, `.excalidrawlib`, Mermaid, D2, draw.io XML, and SVG (converted into editable paths).
- Export a drawing as Mermaid where the structure allows it.
- Export a whole folder as a zip of JSON files.

## Design direction

- Minimal. The canvas takes the full window. The toolbar is one compact floating row, panels slide in on demand and close on Escape.
- Neutral greys with one accent colour. Light and dark themes, and dark mode inverts the canvas colours sensibly instead of leaving black strokes on a dark ground.
- Inter or Geist for UI text at 13px, with tabular numbers in inputs.
- 4px spacing scale, 8px radius for panels, 6px for controls, 1px hairline borders, one soft shadow level for floating panels.
- Motion is short (120 to 180ms) and only explains a change of state. Respect `prefers-reduced-motion`.
- Icons in the UI are Lucide at 16px with 1.5px strokes.
- Empty states show three actions with their shortcuts: new drawing, open template, generate.
- All tokens live as CSS custom properties in `packages/ui/tokens.css`. Themes only change token values.

## Accessibility

- Every control works by keyboard and has a visible focus ring.
- Screen reader support. The scene exposes a hidden, ordered outline of elements and their text, and arrows read as "A connects to B".
- Colour contrast meets WCAG AA for the UI.
- A high-contrast theme.

## Performance budgets

- First load of the app shell under 200 KB gzipped, excluding fonts and icons.
- Time to interactive under 1.5 seconds on a mid-range laptop over a fast connection.
- 60 fps pan and zoom with 10,000 elements. 30 fps minimum with 50,000.
- Opening a drawing from IndexedDB with 5,000 elements under 300 ms.
- Collaboration latency under 100 ms between two clients in the same region.

## Phases

Build in this order. Each phase ends with a working, usable app.

1. **Engine and canvas.** Infinite canvas, the basic shapes, arrows with binding, pen, text, selection, transform, undo and redo, local save to IndexedDB, PNG and SVG export, light and dark themes, and the shortcut registry with the command palette.
2. **Files.** Nested folders, sidebar tree, quick switcher, full-text search, tags, starred, recent, trash, templates, `.excalidraw` import and export.
3. **Rich content.** Full shape library, elbow arrows with routing, fonts, backdrops, sticky notes, tables, code blocks, math, images, embeds, frames, components, version history.
4. **Icons and diagrams.** Icon pipeline and search, `:name` inline insert, the three render modes, diagram-as-code with two-way sync, auto-layout, tidy up.
5. **Gen mode.** Text, code and photo to diagram, sketch cleanup, edit by instruction, explain.
6. **Collaboration and desktop.** Bun server with live sessions, share links, end-to-end encryption, comments, teams, presentation mode, and the Electrobun desktop app.

## Acceptance criteria per phase

A phase is done when:
- Every listed feature works by keyboard alone.
- Every action appears in the command palette and the cheat sheet.
- Files saved in this phase still open after the next phase's schema changes.
- The performance budgets above hold.
- `bun test` passes for the engine geometry, hit testing, schema migrations, `.excalidraw` round trip, Mermaid parsing and gen-mode output validation.

## Out of scope for now

- Native mobile apps. The PWA handles touch and Apple Pencil.
- Real-time voice or video.
- A plugin marketplace. Design the action registry so plugins can register actions later, and stop there.
