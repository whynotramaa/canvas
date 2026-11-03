# Native documents and live documents

Native JSON uses `version: 1`, a stable drawing `id`, ordered `elements`, an `assets` metadata map, and optional namespaced `extensions`. Array order defines stacking. Element IDs identify groups, frames, arrow bindings, and drawing links. Asset IDs identify immutable raster blobs. Native imports preserve unknown fields and namespaced extension content; renderers use only validated supported fields. Incompatible versions fail before changing the active drawing.

`packages/schema/document.ts` upgrades the original array-only save and version-1 backups that lack document IDs or asset maps. IDs already present in a document are retained. Version-1 additions are optional. A future incompatible change requires a new version and a migration tested against `packages/schema/fixtures`.

IndexedDB stores workspace metadata, current scene JSON, snapshots, and the local edit journal. OPFS stores image bytes. A native JSON reference does not contain live Yjs merge history. Portable workspace backups also contain base64 image bytes and restore those bytes under fresh asset IDs. An interrupted database transaction leaves the previous committed workspace intact; asset bytes are written and closed before an element references them.

The live representation is a Yjs document with a map of element IDs to field maps, an ordered ID array, and document metadata. Local changes have `LOCAL_ORIGIN`. Sharing a native JSON file is an interchange operation, not a CRDT synchronization operation. Network sessions must persist and exchange Yjs updates separately.

Excalidraw exports include the native scene under `canvasNative` for lossless recovery in Canvas. Supported primitives are converted to Excalidraw elements. Unsupported native shapes use rectangle fallbacks in external editors. Native icons, rich content, and styles can differ in external editors. The original imported external document is retained in workspace backups. Conversion notices must be shown before a lossy export. Image assets and reference mappings must be included when their conversion support is enabled.

## Undo journal paging

The live history retains up to 767 recent deltas per stack. Older deltas move to immutable pages of 256 edits in the same IndexedDB store, keyed by a SHA-256 content hash. Scene metadata and new pages commit in one transaction. Undo and redo fetch an older page only when the in-memory stack is exhausted. A failed fetch leaves the scene and history unchanged. Recording a new local edit clears both the live and archived redo references.

Portable backups and ZIP exports expand referenced history pages before writing JSON, including image assets referenced only by history or snapshots. Raw recovery exports include page records. Unreferenced pages remain on disk so another open tab cannot lose a page it is still reading; coordinated garbage collection is still needed to reclaim those pages. Storage quota failures preserve the last committed workspace and leave an export path available.

## Folder exchange

A ZIP contains `workspace.json` for the folder tree and drawing metadata, `drawings/<encoded-id>.json` for each native drawing, and `assets/<asset-id>` for required raster bytes. Import creates fresh drawing and folder IDs, remaps internal drawing links in current elements, undo history and snapshots, and preserves element IDs within each drawing. External drawing links remain external. Native directory import also accepts nested `.json` and `.excalidraw` drawings and sibling raster files named by asset ID.

## Excalidraw conversion

The adapter follows the [Excalidraw JSON format](https://docs.excalidraw.com/docs/codebase/json-schema) and [element definitions](https://github.com/excalidraw/excalidraw/blob/master/packages/element/src/types.ts). A checked-in version-2 fixture covers externally authored image files, labels, pressure and fixed-point bindings without relying on Canvas recovery metadata.

Raster files are embedded as validated PNG, JPEG or WebP data URLs. Pen points convert between absolute native coordinates and relative interchange coordinates; recorded pressure is preserved. Supported arrowheads and fixed-point anchors convert in both directions. Bound external labels become native container text; export recreates separate bound text elements. Native data remains in `canvasNative` for complete recovery, and the original input remains in workspace metadata.

Expected differences in external editors include font metrics, rich formatting, custom shapes, icons, routing, crops, stroke textures, hidden elements and backdrops. The export panel displays these differences before download. Unsupported custom nodes become labelled rectangle placeholders externally, while native recovery retains the original editable elements. Neither interchange nor a JSON backup contains live CRDT merge history.
