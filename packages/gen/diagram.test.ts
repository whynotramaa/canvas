import { expect, test } from 'bun:test';
import { elementsToMermaid, graphToElements, parseDiagram } from './diagram';
test('flowcharts create editable stable nodes and preserve manual positions', () => {
  const graph = parseDiagram('flowchart LR\n%% keep comments in source\na[Client] -->|request| b[API]');
  const elements = graphToElements(graph); const node = elements.find(e => e.id === 'diagram:a')!; node.x = 777;
  expect(graphToElements(graph, elements).find(e => e.id === node.id)?.x).toBe(777);
  expect(elements.find(e => e.type === 'arrow')?.endBinding).toBe('diagram:b');
  expect(parseDiagram(elementsToMermaid(elements)).nodes).toHaveLength(2);
  expect(parseDiagram('sequenceDiagram\nA->>B: hi').edges).toHaveLength(1);
  expect(() => parseDiagram('a --> [broken')).toThrow('Line 1');
});
