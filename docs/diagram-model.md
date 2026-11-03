# Diagram model and sync contract

`packages/gen/diagram.ts` parses every supported language into one graph: nodes, edges, containers and an optional fixed layout. Each node maps to a scene element with ID `diagram:<node id>`. Each edge maps to an arrow with ID `diagram:edge:<from>:<to>:<n>`, where `n` counts parallel edges. These IDs stay stable across regenerations, so manual styling and positions survive.

## Coexistence rules

- Code owns structure: which nodes and edges exist, their labels, shapes and containers.
- The canvas owns geometry and style for flowcharts, class, state, ER, mind map, D2 and DSL diagrams. Regeneration keeps a node's position, size and style when its ID survives.
- Sequence and gantt layouts derive from the code (message order, dates). Regeneration keeps their styles and recomputes their positions.
- Elements without a `diagram:` ID (freehand strokes, extra notes, images) never change when code is applied.
- A canvas arrow drawn between two diagram nodes becomes a code edge. When code later declares that edge, the generated arrow replaces the hand-drawn one.

## Canvas-to-code reconciliation

`syncSource` compares the code graph with the canvas graph and patches the source line by line:

- Unchanged lines stay byte-for-byte, including comments and formatting.
- A renamed node or edge label is replaced in place on its defining line.
- In flowchart, D2 and DSL, deleted nodes remove their lines and attached single edges; new nodes and edges are appended.
- An edit the language cannot hold is reported in the panel. The canvas keeps it and the code is left unchanged for it. Nothing is discarded silently.

Code changes apply after a 500 ms pause as one undo step. A flag marks code-driven canvas updates so they do not echo back into the code.

## Representable features

| Language | Nodes | Edges | Containers | Canvas edits written back |
|---|---|---|---|---|
| Mermaid flowchart | id, label, rectangle/round/stadium/circle/diamond/cylinder/hexagon/parallelogram | `-->`, `---`, `-.->`, `==>`, labels, chains | `subgraph … end` | labels, add/remove nodes and edges |
| Mermaid sequence | participant, actor | sync/async/dashed messages | none | message and participant labels |
| Mermaid class | class with members | inheritance, composition, aggregation, association, dependency, realisation | none | edge labels |
| Mermaid state | states, `[*]` start and end | transitions with events | none | labels |
| Mermaid ER | entities with attributes | crow's-foot cardinalities | none | relationship labels |
| Mermaid gantt | tasks, sections | none (dates, durations, `after`) | none | task labels |
| Mermaid mind map | indented nodes with shapes | implied parent links | none | labels |
| D2 | `a: Label`, `a.shape`, dotted paths | `->`, `<-`, `<->`, `--`, labels | `{ … }` blocks | labels, add/remove nodes and edges |
| Native DSL | `id: Label [shape]` | `->`, `<->`, `--`, labels | `group id: Label … end` | labels, add/remove nodes and edges |

Styles, freehand content, images and canvas positions have no code form in any language. They live in the scene and in the saved drawing next to the source text, which is stored as `drawing.source`.

Mermaid export (`Copy drawing as Mermaid`) writes a flowchart from basic shapes and bound arrows, and reports which elements block the export.
