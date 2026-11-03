export const baseShapes = ['triangle', 'hexagon', 'parallelogram', 'trapezoid', 'cylinder', 'cloud', 'document', 'multi-document', 'stored-data', 'star', 'callout', 'speech-bubble', 'brace', 'cube', 'person', 'server', 'queue'] as const;
export const umlShapes = ['uml-class', 'uml-interface', 'uml-package', 'uml-component', 'uml-note', 'uml-use-case', 'uml-lifeline', 'uml-activation', 'uml-initial', 'uml-final', 'uml-fork'] as const;
export const bpmnShapes = ['bpmn-start', 'bpmn-end', 'bpmn-intermediate', 'bpmn-task', 'bpmn-subprocess', 'bpmn-gateway', 'bpmn-parallel', 'bpmn-data-object', 'bpmn-data-store', 'bpmn-pool', 'bpmn-message'] as const;
export const shapeNames = [...baseShapes, ...umlShapes, ...bpmnShapes] as const;
export type LibraryShape = typeof shapeNames[number];
