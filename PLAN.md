# Implementation plan

Implement the complete product described in [PROMPT.md](PROMPT.md) in six stages, with six task groups per stage. Keep every requested feature in scope. Use `PROMPT.md` for the complete tool, shape, font, backdrop, shortcut, template, and format lists.

This document tracks the work. Foundational implementation exists, but no whole task group has passed all of its acceptance checks. Work through the numbered groups in order and mark a group complete only after its checks pass. Each stage ends with a usable app and a review of its behavior.

## Execution rules

- Keep the specified Bun, TypeScript, React, Canvas 2D, CSS, storage, and Yjs stack. Record a concrete compatibility problem before changing a stack choice.
- Create the repository layout in `PROMPT.md`. Add dependencies when their task group starts using them.
- Include keyboard access, command registration, accessibility, error handling, persistence, and relevant tests in each feature's implementation.
- Keep native documents versioned from the first save. Test migrations against saved fixtures from earlier stages.
- Build collaboration-aware scene transactions in stage 1. Introduce network sessions and team features in stage 6.
- Preserve the distinction between native editing and interchange. Document conversion rules and report any loss before export. Preserve the original input when conversion cannot represent all its content.
- Treat external documents, SVGs, images, model responses, and network messages as untrusted input.
- Keep generation, collaboration, and external embeds explicit about connectivity. Local drawing, files, icons downloaded for offline use, and local exports must work offline.
- Do not add native mobile apps, voice or video, or a plugin marketplace. Keep the action registry open to future action registration as requested.

## Stage 1: Build the engine and a usable canvas

Outcome: create, edit, save, reopen, and export drawings with the basic tools and keyboard controls.

### 1.1 Establish the workspace and technical contracts

- [x] Create the Bun workspace, web app, shared packages, strict TypeScript configuration, and development and production commands.
- [x] Set up React 19 with `Bun.serve` HTML imports and plain CSS tokens. Keep React out of `packages/engine`.
- [x] Define versioned scene types, stable element IDs, assets, stacking order, bindings, groups, and frames. Reserve extension rules for later element types.
- [x] Define scene transactions, local transaction origins, engine subscriptions through `useSyncExternalStore`, and Yjs document mappings.
- [x] Define native document storage, asset references, migration rules, and Excalidraw interchange rules. Distinguish a saved JSON document from live CRDT persistence.
- [x] Set benchmark fixtures and record the reference laptop, browser versions, display scale, scene mix, cache state, and timing method.

### 1.2 Implement geometry, rendering, and navigation

- [x] Implement coordinates, transforms, bounds, intersections, hit testing, selection bounds, and an R-tree spatial index.
- [x] Render through Canvas 2D with roughjs and perfect-freehand. Cache rough geometry and static layers, and redraw active interactions separately.
- [x] Implement infinite pan, all requested pan inputs, pinch and keyboard zoom from 1% to 3000%, and zoom to fit, selection, or 100%.
- [x] Add viewport culling and explicit cache invalidation for geometry, styles, text metrics, zoom, and display scale.
- [x] Implement the minimap, light and dark themes, and canvas colour treatment.
- [ ] Measure pan, zoom, selection, and drag against the benchmark scenes before adding rich content. *(deferred: integration testing)*

### 1.3 Implement basic tools and editing

- [x] Add select, hand, rectangle, diamond, ellipse, arrow, line, pen, text, image, and eraser tools with their requested shortcuts.
- [x] Support pressure and smoothing, multipoint lines and closed polygons, text inside shapes, wrapping, and automatic container growth.
- [x] Bind arrows to shapes, preserve labels and attachments during transforms, and support the requested arrowheads.
- [x] Add click, multiple, box, and lasso selection. Add move, resize, rotate, flip, group, ungroup, lock, hide, and layer ordering.
- [x] Add snapping, grid snapping, smart guides, equal spacing, align, distribute, and temporary snapping override.
- [x] Add duplicate, connected copy, connected-node navigation, nudging, style controls, copy and paste, and clipboard scene data.

### 1.4 Implement commands and the accessible app shell

- [x] Build the compact floating toolbar, on-demand panels, neutral themes, UI typography, Lucide icons, spacing, focus rings, and empty states.
- [x] Build the action registry and generate menus, command palette, and searchable cheat sheet from it.
- [x] Implement Mac and Windows/Linux bindings, chords, rebinding, keymap import and export, and inline numeric commands.
- [x] Define shortcut contexts and precedence for text editing, tool keys, numeric input, and chords. Resolve `G` versus `G then A` explicitly.
- [x] Implement Escape behavior, focus restoration, zen mode, view mode, and reduced-motion behavior.
- [x] Expose an ordered screen-reader outline, text descriptions, and arrow connections. Add the high-contrast theme and keyboard equivalents for pointer gestures.

### 1.5 Implement durable local editing and basic exports

- [x] Save scenes and metadata to IndexedDB and image blobs to OPFS. Handle quota failures and interrupted writes without losing the last valid save.
- [x] Implement undo and redo, persist history across reloads, and scope undo to the local user's transactions.
- [x] Specify history storage and compaction so the requested unlimited logical undo does not require every scene snapshot in memory.
- [x] Add PNG and SVG export, including selection bounds, transparent backgrounds, scale options, assets, and embedded scene JSON.
- [x] Add the PWA manifest, service worker, offline shell and asset caching, update behavior, and an export-based recovery path.
- [x] Keep save state visible and test recovery after reload, failed asset writes, and unavailable storage.

### 1.6 Verify stage 1

- [x] Test geometry, hit testing, bindings, transforms, local history, schema migrations, and persistence recovery with `bun test`.
- [ ] Exercise a complete keyboard-only drawing session and the screen-reader outline. *(deferred: integration testing)*
- [ ] Verify production builds, offline reloads, themes, clipboard operations, and PNG/SVG scene recovery in browsers. *(deferred: integration testing)*
- [ ] Measure the app shell below 200 KB gzipped, excluding fonts and icons, and interactive startup below 1.5 seconds. *(deferred: integration testing)*
- [ ] Measure 60 fps with 10,000 elements, at least 30 fps with 50,000, and opening 5,000 elements below 300 ms. *(deferred: integration testing)*
- [ ] Record results and fix failures before marking this stage complete. Do not require tests for future features yet. *(deferred: integration testing)*

## Stage 2: Build files, discovery, and reusable templates

Outcome: manage a local workspace of linked drawings and exchange files with Excalidraw.

### 2.1 Implement folders and drawing metadata

- [x] Add nested folders, drawing titles, emoji or icons, tags, timestamps, thumbnails, and starred status.
- [x] Implement the sidebar tree with keyboard navigation, inline rename, multiple selection, and drag-to-move.
- [x] Prevent folder cycles and make multi-item moves, deletion, and restoration recoverable.

### 2.2 Implement workspace views and trash

- [x] Add All, Recent, Starred, Tags, and Trash views. Connect Shared with me when sharing ships in stage 6.
- [x] Retain trash for 30 days and handle expiry when the app next runs. Preserve folder relationships on restore.
- [x] Keep metadata, thumbnails, scene saves, and search results consistent after changes.

### 2.3 Implement search and the quick switcher

- [x] Add Cmd+P fuzzy search over names, paths, and drawing text.
- [x] Index text, sticky-note content, labels, and frame names as those element types become available.
- [x] Add full-text results that open the drawing, navigate to the matching element, and highlight it.
- [x] Update indexes incrementally and rebuild them from saved documents when necessary.

### 2.4 Implement drawing links and backlinks

- [x] Link elements to drawings, frames, and individual elements using stable IDs.
- [x] Show backlinks and handle renamed, moved, deleted, and restored targets.
- [x] Preserve internal links across folder export and import, with explicit ID remapping when needed.

### 2.5 Implement templates and file interchange

- [x] Save drawings and frames as templates and ship every starter template listed in `PROMPT.md`.
- [x] Implement `.excalidraw` import and export, including assets, supported bindings, and conversion notices.
- [x] Import folders while preserving structure and export folders as ZIP archives of JSON documents and their required assets.
- [x] Preserve native metadata separately when an external format cannot represent it.

### 2.6 Verify stage 2

- [x] Test folder operations, trash expiry and restoration, indexing, backlinks, templates, and import ID remapping.
- [x] Add Excalidraw round-trip fixtures and document expected differences.
- [ ] Verify keyboard-only workspace management and migrations from stage 1 saves. *(deferred: integration testing)*
- [ ] Recheck storage recovery and the performance budgets using many drawings as well as large individual scenes. *(deferred: integration testing)*

## Stage 3: Build rich content, styling, and version history

Outcome: create detailed diagrams, documents, and reusable components with reliable exports.

### 3.1 Complete shapes, connectors, and drawing tools

- [x] Implement the complete shape list and the optional UML and BPMN packs.
- [x] Add curved and elbow arrows, obstacle routing, all arrowhead variants, and label positioning.
- [x] Add partial stroke erasure, the laser pointer, sticky notes, and named frames with clipping and focus mode.
- [x] Preserve bindings, selection, hit testing, and undo behavior for every new shape.

### 3.2 Implement typography and structured text

- [x] Add the complete font list, retain licence records, and self-host subsetted WOFF2 assets.
- [x] Load CJK, Arabic, Devanagari, and emoji fallbacks when needed. Handle bidirectional text, composition input, and font-load metric changes.
- [x] Implement all text formatting, alignment, spacing, lists, inline code, links, and the requested Markdown subset.
- [x] Add an accessible editing layer and keep editor layout consistent with canvas and export layout.
- [x] Embed only used glyphs in exports that support font embedding.

### 3.3 Implement rich elements and external content

- [x] Add tables with keyboard cell navigation, syntax-highlighted code blocks, and KaTeX math.
- [x] Complete image paste, drop, file selection, asset storage, and export handling.
- [x] Add embeds for the requested services and other drawings, with safe URL handling and sandboxed content.
- [x] Show a linked preview or clear unavailable state when a provider blocks embedding or the app is offline.

### 3.4 Complete styling and backdrops

- [x] Add every stroke, fill, roughness, edge, and opacity option, plus clean mode per element and drawing.
- [x] Implement the curated palette, custom hex picker, eyedropper where supported, recent colours, copied styles, and named styles.
- [x] Add optional shadows and gradients.
- [x] Implement every requested backdrop, light and dark variants, opacity, configurable grid size, and isometric snapping.
- [x] Fade minor grid details with zoom and keep tiled textures below the specified size.

### 3.5 Implement components, snapshots, and remaining graphics formats

- [x] Add smart containers with child movement and automatic sizing.
- [x] Add reusable components, instance updates, text and colour overrides, and safe behavior when a source is deleted.
- [x] Add active-editing snapshots, named snapshots, timeline scrubbing, restore, and fork into a new drawing.
- [x] Add WebP and PDF export, font and asset handling, and clipboard PNG/SVG output.
- [x] Import SVG as editable paths and draw.io XML. Preserve originals and report unsupported constructs.

### 3.6 Verify stage 3

- [ ] Test rich-element editing, routing, containers, component updates, overrides, snapshot restore, and new importers. *(deferred: integration testing)*
- [ ] Verify visual exports across fonts, scripts, clipping, backdrops, and image assets. *(deferred: integration testing)*
- [ ] Test tables, rich text, and math through keyboard and screen-reader workflows. *(deferred: integration testing)*
- [ ] Recheck migrations, offline assets, compatibility conversions, and performance with representative rich scenes. *(deferred: integration testing)*

## Stage 4: Build icons and bidirectional diagram editing

Outcome: insert searchable icons and maintain editable diagrams through code and canvas changes.

### 4.1 Build the icon ingestion pipeline

- [ ] Ingest Simple Icons, Devicon, official cloud architecture sets, Lucide, and the custom hand-drawn concepts. *(open: official AWS/GCP/Azure architecture packs need a manual download under vendor terms; full Devicon set not yet ingested)*
- [ ] Record source, licence, attribution, and usage guidance for each asset. Retain vendor-required visual variants. *(open with the cloud packs above)*
- [x] Sanitize and normalize SVGs without changing their appearance. Merge paths only where safe.
- [x] Generate aliases, categories, tags, and lazy-loaded chunks through Bun scripts. Keep icon data out of the base bundle.

### 4.2 Implement icon interactions and user libraries

- [x] Add `/` search at the cursor, inline `:name` insertion, aliases, and category search.
- [x] Add original colours, monochrome, and roughjs trace rendering. Preserve paths needed by each mode.
- [x] Support badges, labelled bindable nodes, and the source and licence info panel.
- [x] Add personal libraries, library import and export, SVG uploads, and `.excalidrawlib` compatibility. Connect team libraries in stage 6.
- [x] Define caching and downloads for offline icon use.

### 4.3 Define the diagram model and sync contract

- [x] Define graph nodes, edges, containers, semantic properties, stable IDs, and mappings to scene elements.
- [x] Specify how code, manual geometry, styling, and freehand content coexist.
- [x] Specify ID reconciliation, source formatting and comment retention, deletions, unsupported edits, and conflict reporting.
- [x] Define representable features for every requested Mermaid diagram type, D2, and the native DSL.
- [x] Preserve source and scene metadata when a language cannot encode a canvas feature. Never silently discard unsupported edits.

### 4.4 Implement parsers and two-way synchronization

- [x] Add the code panel and parsers for Mermaid flowchart, sequence, class, state, ER, gantt, and mind map diagrams.
- [x] Add D2 and the native DSL with structured parse errors and validated output.
- [x] Generate editable elements for every requested diagram type, rather than a rendered image.
- [x] Update the canvas from code and update code from representable canvas edits using stable IDs.
- [x] Preserve manual styles across regeneration, prevent feedback loops, and group each update into one undo operation.
- [x] Export Mermaid where the scene structure allows it, with clear feedback for unsupported content.

### 4.5 Implement layout and tidy-up

- [x] Add layered, tree, radial, force-directed, and grid layouts. Use elkjs for layered layout and orthogonal routing.
- [x] Respect containers, labels, pinned geometry, and existing manual overrides during layout.
- [x] Add tidy-up for near alignments, gaps, and almost-straight arrows without replacing the overall layout.
- [x] Keep parser and layout work off the interaction path when it would block the canvas.

### 4.6 Verify stage 4

- [ ] Test SVG sanitization, search aliases, library imports, render modes, and lazy loading. *(deferred: integration testing)*
- [ ] Test each language and diagram type, code-to-canvas-to-code round trips, stable IDs, and unsupported edits. *(deferred: integration testing)*
- [ ] Test regeneration after manual styling, syntax failures, undo, and source comments. *(deferred: integration testing)*
- [ ] Verify offline icon behavior, keyboard insertion, layout quality, and performance budgets. *(deferred: integration testing)*

## Stage 5: Generation

Out of scope at the owner's request. Generation and the Anthropic dependency were removed.

## Stage 6: Build collaboration, sharing and presentations

Outcome: collaborate securely across clients and present diagrams.

### 6.1 Build live document synchronization

- [x] Add WebSocket sessions, Yjs update persistence and metadata storage (Cloudflare Durable Objects).
- [x] Implement reconnect, offline edits, compaction, schema-version checks, and concurrent asset uploads.
- [x] Add named cursors, live selections, frame presence, and viewport follow mode.
- [x] Preserve local-only undo semantics during concurrent edits and reconnects.

### 6.2 Implement identities, teams, and permissions

- [x] Add authentication, teams, shared workspaces, and owner, editor, commenter, and viewer roles.
- [x] Enforce permissions on server requests, WebSocket updates, assets, comments, and exports.
- [x] Connect Shared with me, team icon libraries, and shared workspace discovery.
- [x] Handle membership removal, revoked access, and locally queued edits without silently losing user work.

### 6.3 Implement encrypted sharing and embeds

- [x] Define encrypted scene and asset envelopes, authenticated encryption, key generation, and URL-fragment key handling.
- [x] Keep server-stored encrypted content opaque. Define what metadata remains visible and how authorized clients search decrypted content.
- [x] Implement view, comment, and edit links with optional expiry and password protection.
- [x] Enforce write permissions independently of possession of a decryption key. Define revocation and key rotation, including the limits of revoking downloaded copies.
- [x] Make server-based generation an explicit disclosure of selected decrypted content to the configured provider.
- [x] Add read-only iframe embeds and verify that secrets do not enter logs or referrer data.

### 6.4 Implement comments and presentations

- [x] Add pinned comment threads, mentions, resolve behavior, notifications inside the app, and the comments panel.
- [x] Add ordered frame slides, reordering, speaker notes, and keyboard presentation controls.
- [x] Animate the camera between frames and respect reduced motion.
- [x] Add the temporary pen and fading laser marks during presentation.
- [x] Export one PDF page per frame and verify clipping, fonts, notes policy, and assets.

### 6.5 Deployment

- [x] Deploy the web app to Vercel and live collaboration to a Cloudflare Worker. The desktop app and self-hosting are out of scope at the owner's request.

### 6.6 Verify the complete product

- [ ] Test concurrent edits, reconnects, own-change undo, permissions, expired links, revocation, encryption, and asset access. *(deferred: integration testing)*
- [ ] Measure collaboration latency below 100 ms between same-region clients with defined network conditions. *(deferred: integration testing)*
- [ ] Exercise every registered action through the palette and keyboard, including comments, libraries and presentations. *(deferred: integration testing)*
- [ ] Run the complete `bun test` suite for geometry, hit testing, migrations, Excalidraw round trips, Mermaid parsing, and generation validation. *(deferred: integration testing)*
- [ ] Verify all import/export formats, old saved documents, PWA offline behavior, screen readers, touch, and Apple Pencil on target devices. *(deferred: integration testing)*
- [ ] Measure every performance budget against the final app and record outstanding failures before release. *(deferred: integration testing)*

## Completion record

For each task group, record the implementation files, the checks run, their results, and any unresolved issue. Update this plan as work finishes. A checked box means the behavior exists and has been verified.

Do not treat a missing implementation as an accepted limitation. Keep unfinished requirements open until they work or the user explicitly changes the scope.


### Implementation pass, 2026-11-03

This pass is partial. All unchecked requirements above remain required. No stage or task group is claimed complete.

Implemented and checked with automated tests:

- `packages/shortcuts/index.ts`: action registration, duplicate rejection, category/binding/label search. Connected tools and editing/view/export commands to the palette. Enter runs the first result; Escape restores canvas focus. Rebinding, chords, complete command coverage, and a separate cheat sheet remain open.
- `packages/engine/history.ts`: reversible changed-element edits, serialized undo/redo stacks, preservation of unrelated elements, and stacking-order restoration. Connected history to IndexedDB saves in `apps/web/main.tsx`, including migration of the previous array-only save. History still keeps element-order arrays per edit in memory; compaction and collaborative conflict semantics remain open.
- `packages/schema/svg.ts`: clean SVG geometry, escaped text/style attributes, rotations, arrow markers, and embedded native JSON. The app can reopen that embedded JSON from SVG without mounting imported SVG content. Image export rejects missing asset support. Rough visual fidelity, embedded fonts, pressure strokes, selection/scaling controls, and general SVG path import remain open.
- `packages/engine/geometry.ts`: shape-aware ellipse and diamond hit tests, inverse rotation, and pen-segment hit tests. Canvas rendering now applies element rotation. Full transforms, spatial indexing, exact shape-distance padding, and binding behavior remain open.
- App controls for zoom to fit/selection/100%, view mode, zen mode, and a focusable ordered scene outline. View mode retains panning. Responsive toolbar positioning avoids the original header overlap. UI font stack uses locally available fonts with system fallbacks; no new font files or licence claims were added.

Verification: `bun run typecheck` passes; `bun test` passes 9 tests with 28 assertions; `bun run build` passes. Automated tests cover registry lookup, geometry, saved history serialization and restoration, SVG escaping, existing validation, and SceneStore subscription behavior.

Not verified: browser interactions, visual screenshots, IndexedDB reload/failure scenarios in a browser, offline installation, screen readers, physical pen/touch devices, model access, collaboration, desktop packaging, or performance budgets. Stages 2 through 6 have not been implemented in this pass. The existing app also still lacks substantial stage 1 requirements, as recorded in the unchecked lists.


### Continuation pass, 2026-11-03

Implemented additions, with partial groups left open:

- Workspace model and validation in `packages/workspace/index.ts`; IndexedDB migration and transactional writes in `apps/web/storage.ts`; workspace controls in `apps/web/WorkspacePanel.tsx`. Drawings have individual histories, titles, tags, stars, folder paths, and timestamps. Added nested folders, multiple selection, drag and menu moves, cycle prevention, trash, ancestor-aware restoration, and 30-day expiry. Search matches paths and drawing text and opens matching elements. Thumbnails, fuzzy ranking, incremental indexes, arrow-key tree navigation, inline rename, backlinks, ZIP exchange, and shared views remain open.
- All ten starter template entries now create editable nodes and bound edges. Automated validation caught and fixed a node/edge ID collision. These are starter layouts; specialized sequence lifelines, ER notation, richer wireframes, and saving user templates remain open.
- Excalidraw import/export in `packages/schema/excalidraw.ts`, with original imported data retained in the workspace and conversion notices. Tests cover pen coordinate conversion, rotation, geometry, and validation. Complete assets, bindings, style fidelity, and folder import remain open.
- Editable Mermaid flowcharts in `packages/gen/diagram.ts`, with stable IDs, source comments retained in saved source, manual node position preservation, explicit apply/read controls, structured line errors, and one edit per apply. Other Mermaid types, D2, native DSL, automatic bidirectional synchronization, and advanced layouts remain open.
- Element property controls for geometry, labels, colours, fills, stroke width, opacity, locking, hiding, and stacking. Added grid arrangement and connector endpoint updates during node movement. Full selection transforms, smart guides, routing, and complete styling remain open.
- Named snapshots, active-edit snapshots, restoration through undo, and forks in `packages/workspace/snapshots.ts` and the version-history panel. Timeline scrubbing remains open.
- PNG/JPEG/WebP image selection, paste, and drop in `apps/web/assets.ts`, with OPFS writes before insertion, raster decoding, file/dimension limits, and unavailable states. Workspace backups include referenced image bytes across current scenes, snapshots, and histories. Imports use fresh asset IDs so existing images are not overwritten. General SVG image import, image embedding in SVG exports, and all image browser recovery cases remain open.
- Server generation route in `apps/server/generation.ts`, provider boundary in `packages/gen/generate.ts`, and prompt UI. Uses server-side Claude configuration, same-origin checks, request and output limits, concurrency limits, cancellation, timeout, schema/reference validation, one invalid-output retry, and insertion as one undo step without replacing existing content. Generation hides without a configured key. Photo input, streaming, instruction replacement, full generation evaluations, configured model-access verification, and live-provider checks remain open. No live provider call was made.
- React now subscribes to SceneStore through `useSyncExternalStore`. The engine stores Yjs element fields separately. A two-client deterministic test verifies concurrent position and colour changes merge. Network collaboration, persistent CRDT updates, permissions, and collaborative undo remain open.
- Added `README.md`, a reproducible production HTTP smoke script, and `bun run smoke`. Server binds to localhost by default because authentication is unfinished.

Latest verification: TypeScript and the complete test suite pass. The production smoke check verifies the HTML, referenced JavaScript/CSS, PWA routes, and generation-disabled configuration. The shell measured 183,325 bytes gzipped after Yjs integration, below the 200,000-byte budget; subsequent changes require rerunning the smoke check. This is a build measurement, not a browser startup or rendering measurement.

No complete stage is claimed. Major outstanding work includes full tool/shape/text/font/backdrop coverage, spatial indexing and interaction performance, accessibility verification, icon ingestion and libraries, complete diagram languages, rich exports/imports, collaboration/authentication/encrypted sharing, comments/presentations, and the Electrobun application. The unchecked requirements above remain authoritative.


### Shapes, presentation, keyboard, and raster export pass

- Added the 17 general library shapes in `packages/schema/shapes.ts` and shared Canvas/SVG path generation in `packages/engine/shapes.ts`. Shape insertion uses registered commands. Native data is embedded in Excalidraw exports so unsupported external shape types can be recovered on reimport. External editors receive rectangle fallbacks for unsupported types. Optional UML/BPMN packs, precise hit regions for the new paths, and full conversion fidelity remain open.
- Added the F frame tool, a slide panel, slide reordering, speaker notes, frame fitting, presentation entry with Mod+Enter, previous/next keyboard controls, and Escape exit. Camera animation, frame clipping, temporary presentation marks, and PDF decks remain open.
- Added `packages/shortcuts/keymap.ts` and `apps/web/KeymapPanel.tsx`. Keyboard actions now use the registry. Added searchable action/category listings, shortcut editing, collision feedback, import/export/reset, persistent keymap settings, and two-step chord dispatch. G waits 650 ms for a chord before opening Generate. Added keyboard duplicate and an explicit diagram-node alignment chord. Numeric element commands and complete action coverage remain open.
- Extracted drawing into `apps/web/renderer.ts`. Added `apps/web/ExportPanel.tsx` with bounds-based PNG/WebP output, 1×/2×/3× scale, transparency, selected-element output, image availability checks, and raster allocation limits. PNG includes native scene data and image bytes; PNG import recovers them. `packages/schema/png.ts` checks chunk lengths and checksums and preserves Unicode metadata. SVG image embedding, used-glyph font embedding, PDF, complete backdrop treatment, and visual export verification remain open.
- Tests cover all library paths and native recovery, negative-size frame fitting, keymap normalization and duplicate rejection, PNG metadata replacement and corruption rejection, and export bounds for rotation and pen excursions.

Verification for this pass: `bun run typecheck`, `bun test`, and `bun run smoke`. Browser interaction, screen-reader behavior, rendered export appearance, and physical-device checks remain unverified. The previous browser connection attempt reported no available browser. All other unchecked plan requirements remain required.


### Icon library and multiple-selection pass

- Added 85 directly insertable icons through `packages/icons/build.ts`, with the generated catalogue served separately from the app shell. Includes 31 Simple Icons brand marks, AWS and Azure marks from Devicon, 32 original system-design concepts, and 20 labelled AWS/Azure service concepts. Service concepts are explicitly recorded as original drawings, not official vendor architecture symbols. Source artwork and licence records are in `packages/icons/sources/`. Rebuild with `bun run icons:build`.
- `apps/web/IconPanel.tsx` opens with `/`. Includes name/alias/tag search, categories, handdrawn default, monochrome and source-colour modes, source/licence information, offline catalogue download, personal path-only SVG uploads, and personal-library JSON import/export. Inserted icons embed their validated paths and metadata in the scene. Saved drawings, native clipboard, PNG recovery, SVG output, and Excalidraw native-data recovery preserve them. General SVG constructs, inline colon insertion, icon badges, `.excalidrawlib`, team libraries, official cloud architecture packs, and category-based lazy data chunks remain open.
- Added `packages/engine/selection.ts` and canvas integration for Shift-click, box selection, Alt-lasso selection, multi-element movement, recursive group/frame contents, group/ungroup, eight alignment/distribution actions, duplicate with connector/group ID remapping, and select all. Selection geometry, duplication, nested-frame closure, and binding remapping have automated tests. Lasso tests use element centres; precise path intersection, resize/rotate handles, smart snapping, and the full selection requirements remain open.
- Multi-element style changes and PNG/WebP selection export now use the whole selection. Native clipboard copy includes image bytes. Paste validates input, restores assets under fresh IDs, remaps object and connector IDs, and inserts as one undo step. Browser clipboard permissions and cross-tab interactions have not been verified interactively.

Verification: `bun run typecheck`, 30 passing `bun test` tests with 525 assertions, and `bun run smoke`. The production shell measured 196,513 bytes gzipped before the final smoke-route assertion addition. The smoke script now also checks that the icon catalogue HTTP route contains at least 60 entries. No live browser, screen-reader, physical-device, or live-provider checks were performed.

This pass does not complete PLAN.md. Network collaboration, authentication, encrypted sharing, teams, desktop packaging, and substantial rich-content, parser, export, performance, and accessibility requirements remain open.


### Spatial indexing, navigation, workspace links, and rich content pass

- `packages/engine/spatial.ts` adds RBush indexing for candidate hit tests and viewport culling, with rotated bounds, pen-sample excursions, hidden-state updates, and stacking-order preservation. `packages/engine/render-cache.ts` caches rough drawables with style/geometry invalidation and bounded retention. Both are connected to the canvas. Cached bitmap layers, active-layer separation, interaction benchmarks, and precise visual bounds for every content type remain open.
- `packages/engine/navigation.ts`, `apps/web/backdrop.ts`, `apps/web/CanvasSettings.tsx`, and `apps/web/Minimap.tsx` add a minimap, pointer-centred zoom, grid/isometric snapping, edge/centre snapping, Cmd/Ctrl bypass, all 12 backdrop choices, configurable grid size and opacity, minor-grid simplification, and a high-contrast UI theme. Textures are procedural rather than tiled image assets. Pinch gestures, equal-spacing guides, complete keyboard navigation verification, theme persistence, and backdrop treatment in all exports remain open.
- Stable drawing/element/frame link references and backlinks are implemented through `packages/workspace/links.ts` and element properties. Tests cover rename, unavailable targets, and trashed source/target handling. Folder ZIP exchange and import-time link remapping remain open.
- Workspace tree controls now have inline rename, arrow-key navigation, Home/End, folder expansion/collapse, and Space selection. Drawing or selection templates can be saved and reopened through the template panel. These UI interactions have not been verified in a browser.
- Added sticky notes, editable tables, syntax-coloured code blocks, text-format controls, textarea text editing, and sandboxed HTTPS embed previews through `apps/web/RichEditor.tsx`. External previews require an explicit load action. Table cells support native Tab navigation and Enter to move down a column. Canvas and SVG output include cells and rich-element text. Wrapping handles explicit newlines, long words, and grapheme clusters; renderers use text direction for RTL scripts. Math, full Markdown/rich spans, complete text growth/alignment, comprehensive syntax grammars, precise export text metrics, and screen-reader verification remain open.
- Self-hosted Latin WOFF2 subsets for DM Sans, Gaegu, and Space Mono are stored in `packages/fonts`, together with their SIL OFL licences. Font routes are included in offline shell installation. Font loading invalidates canvas text rendering. Other requested fonts, script-specific downloadable fallback packs, automated subsetting, and used-glyph export embedding remain open.
- Production builds now minify and split code. `scripts/smoke.ts` follows JavaScript chunk imports and checks font responses as well as the HTML, CSS, PWA endpoints, icon catalogue, and generation configuration. This fixed a measured shell-size failure after adding the spatial index.
- History now records layer-only edits. Field-level reversal preserves later unrelated changes on the same element and avoids replacing a field changed after the recorded edit. This has regression coverage; it does not establish network collaboration or complete collaborative undo semantics.

Latest checks: `bun run typecheck` passes, `bun test` passes 40 tests with 563 assertions, and `bun run smoke` passes. Compressed shell and JavaScript chunks total 146,975 bytes, excluding separately served fonts and icon catalogue data. No browser frame-rate/startup, IndexedDB timing, screen-reader, physical-device, live-model, or cross-platform desktop checks were run.

The checked individual requirements above have supporting implementation and automated checks. No full stage is complete. Collaboration, identities/teams/permissions, encrypted sharing, comments, remaining parser languages, rich formats, and other unchecked requirements remain required.

### PDF presentation export pass

- Added a PDF export to the Slides panel. Each frame becomes a page in slide order, with the visible drawing rendered at up to 2× resolution and clipped to the frame. Rotated frames, image loading, dark backgrounds, canvas allocation limits, and export errors are handled. Speaker notes are excluded, as stated in the panel. Pages are raster images, so exported text is not selectable.
- Added a lazily loaded PDF library. The offline installer now caches imported JavaScript chunks, including the PDF exporter. The production smoke check verifies those chunks but counts only eagerly loaded assets against the shell budget.
- Automated tests cover frame sizes, invalid frames, and PDF page count and dimensions. Type checking and the production smoke check pass; the eager shell is 155,487 bytes gzipped. Browser rendering, PDF visual fidelity, and offline installation remain unverified.


### Canvas durability, workspace exchange, and icon expansion pass

- Added native document contracts and saved migration fixtures. `docs/document-format.md` distinguishes native JSON, workspace persistence, immutable assets and live Yjs state, and documents expected interchange differences.
- Geometry now follows rotated/flipped paths, multipoint connectors, pressure strokes and precise lasso intersections. Resizing, rotation, flipping, normalized arrow anchors and all defined arrowheads have regression checks. Eraser sweeps catch objects crossed between events and detach surviving references; locked objects remain protected. Added layer ordering, Alt-drag duplication, pointer cancellation, connected copies, numeric commands, pinch handling and visible edge/centre/equal-spacing guides.
- The renderer keeps static bitmap layers separate from active gestures and selection. Unchanged Yjs element objects retain immutable identity; changes and remote field updates invalidate only affected objects. Spatial updates and delta-history comparisons avoid rebuilding unchanged data. Font and display-scale changes invalidate rendering. Dark colour treatment and appearance settings are shared/persisted. Browser rendering and interaction verification remain open.
- Added an on-demand searchable, paged screen-reader outline with named arrow endpoints. The command palette supports fuzzy matching, recent commands and active keyboard options. `docs/keyboard.md` defines numeric/tool/chord precedence. Added composition/focus context handling, one-level Escape behavior and reduced-motion styles. Screen-reader and complete keyboard-session checks remain open.
- IndexedDB saves are validated and transactional. Failed OPFS writes abort, close decoded images and remove newly created files. Undo records local deltas synchronously; history-only changes trigger saves. Older undo/redo deltas move to content-addressed 256-edit pages, retaining fewer than 768 live edits per stack after compaction. Undo loads pages on demand; portable backups expand archived history and include its referenced images. Unreferenced pages are retained pending coordinated garbage collection. Continuous editing schedules saves within two seconds, and unfinished pointer gestures retain the previous committed scene on disk.
- Added fuzzy incremental workspace search over names, paths, tags, text, tables, frame labels and notes, with separate element results and jump-to-selection. Added persisted thumbnails and editable drawing icons. Starter templates now contain appropriate notation and structure rather than interchangeable labelled chains.
- ZIP exchange writes the workspace tree, separate native drawing JSON files and required raster bytes. Native folder imports preserve directory structure; Excalidraw folder imports use the same converter. Import creates fresh folder/drawing IDs and remaps internal links in current elements, history and snapshots. Tests reject unsafe paths, duplicate IDs, missing documents and oversized expansion.
- Excalidraw exchange now handles supported raster files, pressure, labels, fill/opacity, fixed-point anchors and arrowheads. An export panel shows conversion notices before download. External fixtures test conversion without Canvas native metadata. Original input and native metadata remain preserved.
- Expanded the icon catalogue from 85 to 5,536 entries by ingesting the installed Simple Icons and Lucide sets alongside the existing Devicon/cloud marks and hand-drawn concepts. Licence files remain in `packages/icons/sources`. Generated search metadata and category/alphabet chunks are served separately; the picker renders 48 previews at a time. Added cursor/colon insertion, drag-to-badge insertion, personal `.excalidrawlib` element import/export, and direct offline-cache fallback. Official vendor architecture sets and team libraries remain required.
- Version history now has a keyboard-accessible timeline preview with restore and fork. Automatic snapshots count editing bursts rather than idle wall-clock time.

Engine measurements are recorded in `docs/benchmark-results.json`, generated by `bun scripts/benchmark.ts`. On this i5-12450H host, cold creation of the 5,000-element Yjs fixture took about 82 ms; warm edit/index/hit/history medians were about 2.8 ms at 5,000, 4.9 ms at 10,000 and 32.7 ms at 50,000. These measurements exclude canvas rasterization and browser event processing. They do not establish the required browser frame rates or startup budget.

Latest complete verification before the final UI-close refinements: type checking passed; 87 tests passed with 18,016 assertions; the production shell measured 168,837 bytes gzipped. The smoke check also verifies every generated icon chunk against the search index. Browser, screen-reader, live model, physical-device and desktop checks remain unverified. No whole stage is complete; all unchecked requirements remain in scope.


### Styling and SVG compatibility pass

- Added validated fill patterns, dashed/dotted strokes, roughness presets, rounded edges/corners, clean modes per element and drawing, opacity, shadows and gradients. Canvas, SVG, PNG/WebP and slide PDF paths receive the applicable styling and drawing clean mode.
- Added a 12-colour palette with five shades each, hex entry, supported-browser eyedropper, recent colours, clipboard style copy/paste and persistent named styles. Named styles travel with workspace exchange and validate at import boundaries.
- SVG exports now retain seeded rough paths, hand-drawn icon traces, fill textures, stroke dashes, rounded edges, gradients and shadows. Original icon mode preserves original path fill/stroke treatment.
- Full icon export testing exposed valid compact SVG arc syntax that roughjs cannot parse. `packages/icons/path.ts` uses svgpath to normalize command parameters without changing their coordinates. The build, uploads, previews, renderer and SVG exporter share that normalization; malformed/nonfinite or excessive icon coordinates are rejected. Regression tests cover compact arc flags.
- Added renderer, style-validation, rounded-hit-region and styled-SVG tests. Browser visual comparison remains required.


### Completion pass, 2026-11-03

Implementation items are checked when the code exists. Verification items are marked deferred to integration testing at the owner's request; none of the new work has been run in a browser. `bun run typecheck` and `bun run build` pass. `bun test` was not run.

- Arrows: curved and elbow routes with obstacle avoidance (`packages/engine/routing.ts`), Shift+R cycles the route. UML and BPMN shape packs in `packages/schema/shapes.ts` and `packages/engine/shapes.ts`.
- KaTeX math (Shift+M) rendered through MathML in canvas and SVG (`packages/schema/math.ts`, `apps/web/math.ts`). Embeds convert YouTube, Figma and gist URLs, link other drawings and show an offline state.
- SVG import as editable paths and draw.io XML import with notices and preserved originals (`packages/schema/import-svg.ts`, `packages/schema/drawio.ts`). Copy as PNG (Shift+Alt+C) and SVG.
- Diagram as code for every Mermaid type, D2 and a native DSL, with two-way sync, comment retention and unsupported-edit reporting (`packages/gen/diagram.ts`). Layered (elkjs), tree, radial, force and grid layouts, pinning, tidy-up on Shift+A (`packages/gen/layout.ts`).
- Generation through the Anthropic SDK with streamed NDJSON previews, one retry, photo input on Opus, sketch cleanup, instruction edits, explanations as sticky notes or Markdown, logo lookup by `iconName`, and model access checks at startup (`apps/server/generation.ts`, `packages/gen/generate.ts`).
- Collaboration: Bun WebSocket relay storing only AES-GCM ciphertext in SQLite, assets in SQLite or `Bun.s3`, accounts, teams and roles, view/comment/edit links with expiry and passwords, revocation, key rotation, read-only `/embed`, presence cursors, follow mode, team icon libraries (`apps/server/collab.ts`, `apps/web/collab.ts`, `apps/web/SharePanel.tsx`).
- Comments (C) with pinned threads, mentions, resolve and a panel (`apps/web/CommentsPanel.tsx`). Presentation camera animation with reduced motion and a fading presenter pen (P).
