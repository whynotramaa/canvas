# Run Canvas locally

Install Bun 1.3 or later. Run these commands in the repository root:

```sh
bun install
bun run dev
```

Open `http://localhost:3000`. Use the workspace button to create folders and drawings. Press Alt+Z for zen mode: only the canvas, driven from the keyboard (Ctrl+K or Cmd+K still opens the command palette). Open the command palette with Ctrl+K or Cmd+K.

Run the checks before making changes:

```sh
bun run typecheck
bun test
bun run smoke
```

The smoke check starts the production server, checks its HTTP routes and assets, and verifies the compressed shell budget. It does not test browser interactions.

## Back up and restore your drawings

Choose **Backup** to download the workspace, undo histories, snapshots, and referenced image bytes as JSON. Keep the file outside browser storage.

Choose **Import** and select the backup to restore it. Workspace import replaces the active workspace after validation and asset writes succeed. Export your current workspace before restoring another backup.

Scenes and metadata use IndexedDB. Images use the Origin Private File System. Clearing site storage removes both. Use the same browser profile and origin to reopen local drawings.

## Deploy

The app runs on Vercel. Live collaboration runs on a Cloudflare Worker. Both free plans work without a credit card.

1. Deploy the collaboration Worker (optional). Set `ALLOWED_ORIGIN` in `collab/wrangler.toml` to your Vercel URL, then run:

   ```sh
   cd collab
   npx wrangler login
   npx wrangler deploy
   ```

   Wrangler prints the Worker URL, for example `https://canvas-collab.<you>.workers.dev`.

2. Import the repository in Vercel. `vercel.json` sets the build. Add this environment variable:

   - `COLLAB_URL` is the Worker URL from step 1. Leave it unset to hide sharing.

## Insert technology and system-design icons

Press `/` to open the icon library. Search by name, alias, or concept, then select an icon to insert it. Hand-drawn rendering is the default. Change to monochrome or original colours in the library or element properties.

Choose **Download for offline** while online to cache the catalogue. Inserted icons carry their artwork inside the drawing and do not need the catalogue to reopen.

Use **Upload SVG / library** for personal artwork. SVG uploads accept paths with a zero-origin viewBox and reject scripts, styles, transforms, and external references. Convert other SVG shapes to paths before upload. Export your personal library as JSON to transfer it.

The library contains 85 entries. AWS/Azure service entries use labelled concept drawings rather than official vendor architecture symbols. Use the source and licence button for provenance. Brand marks identify products; the collection does not grant trademark rights.

To rebuild the catalogue from the checked-in sources and Simple Icons:

```sh
bun run icons:build
```

To select several elements, Shift-click them or drag a box across the canvas. Hold Alt while dragging on empty canvas for lasso selection. Use the palette for group, ungroup, alignment, and distribution. Ctrl+C or Cmd+C copies selected scene data, including referenced images.


## Edit rich content and canvas appearance

Open the command palette and choose **Insert Sticky note**, **Insert Table**, **Insert Code block**, or **Insert Embed**. Select an element and press Enter to edit its content. Double-click text or a shape to open its text editor.

Use Tab to move between table cells. Enter moves to the next row in the same column. Load external embed previews explicitly; loading a preview connects your browser to the supplied HTTPS site.

Choose **Canvas theme, backdrop and snapping** in the palette to change the backdrop, grid, snapping, or high-contrast theme. Hold Ctrl or Cmd while dragging to bypass snapping. Press M to open the minimap.

Use element properties to link a shape to another drawing or element. Choose **Drawing links and backlinks** in the palette to find incoming links. Choose **Save drawing or selection as template** to add a template to the template panel.

DM Sans, Gaegu, and Space Mono are self-hosted Latin subsets with licences in `packages/fonts`. Other scripts use the browser's available fallback fonts.
