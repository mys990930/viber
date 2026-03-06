import type { MutableRefObject } from 'react';
import type cytoscape from 'cytoscape';

export function processUndo(params: {
  cy: cytoscape.Core;
  undoStack: any[];
  redoStack: any[];
  prevUndoLength: number;
  optionsRef: MutableRefObject<{ toggleModule?: (modulePath: string) => void }>;
  expandedModules: Set<string>;
  saveNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
  removeFileNodes: (moduleId: string) => void;
  removeExpandedModule: (moduleId: string) => void;
  addExpandedModule: (moduleId: string) => void;
}) {
  const {
    cy,
    undoStack,
    redoStack,
    prevUndoLength,
    optionsRef,
    expandedModules,
    saveNodePosition,
    removeFileNodes,
    removeExpandedModule,
    addExpandedModule,
  } = params;

  const currentLength = undoStack.length;
  if (currentLength >= prevUndoLength) return currentLength;

  const undoneAction = redoStack[0];
  if (!undoneAction) return currentLength;

  console.log('[undo] Processing action:', undoneAction.type);

  if (undoneAction.type === 'move' && undoneAction.positions && undoneAction.nodeIds) {
    undoneAction.nodeIds.forEach((nodeId: string) => {
      const pos = undoneAction.positions[nodeId];
      if (pos) {
        const node = cy.getElementById(nodeId);
        if (node && node.length > 0) {
          node.animate({
            position: pos,
            duration: 300,
            easing: 'ease-out',
          });
          saveNodePosition(nodeId, pos);
        }
      }
    });
  } else if (undoneAction.type === 'expand' && undoneAction.nodeId) {
    const moduleId = undoneAction.nodeId;
    if (expandedModules.has(moduleId)) {
      cy.nodes().forEach((node) => {
        const pos = node.position();
        saveNodePosition(node.id(), { x: pos.x, y: pos.y });
      });
      removeFileNodes(moduleId);
      removeExpandedModule(moduleId);
    }
  } else if (undoneAction.type === 'collapse' && undoneAction.nodeId) {
    console.log('[undo] Collapse undo - calling toggleModule for:', undoneAction.nodeId);
    if (optionsRef.current.toggleModule) {
      optionsRef.current.toggleModule(undoneAction.nodeId);
    } else {
      addExpandedModule(undoneAction.nodeId);
    }
  }

  return currentLength;
}

export function processRedo(params: {
  cy: cytoscape.Core;
  undoStack: any[];
  redoStack: any[];
  prevRedoLength: number;
  optionsRef: MutableRefObject<{ toggleModule?: (modulePath: string) => void }>;
  expandedModules: Set<string>;
  addExpandedModule: (moduleId: string) => void;
  removeFileNodes: (moduleId: string) => void;
  removeExpandedModule: (moduleId: string) => void;
}) {
  const {
    cy,
    undoStack,
    redoStack,
    prevRedoLength,
    optionsRef,
    expandedModules,
    addExpandedModule,
    removeFileNodes,
    removeExpandedModule,
  } = params;

  void cy;

  const currentLength = redoStack.length;
  if (currentLength >= prevRedoLength) return currentLength;

  const redoneAction = undoStack[undoStack.length - 1];
  if (!redoneAction) return currentLength;

  console.log('[redo] Processing action:', redoneAction.type);

  if (redoneAction.type === 'move' && redoneAction.positions && redoneAction.nodeIds) {
    console.warn('[redo] Move redo not fully supported - positions not stored');
  } else if (redoneAction.type === 'expand' && redoneAction.nodeId) {
    console.log('[redo] Expand redo - calling toggleModule for:', redoneAction.nodeId);
    if (optionsRef.current.toggleModule) {
      optionsRef.current.toggleModule(redoneAction.nodeId);
    } else {
      addExpandedModule(redoneAction.nodeId);
    }
  } else if (redoneAction.type === 'collapse' && redoneAction.nodeId) {
    console.log('[redo] Collapse redo - calling toggleModule for:', redoneAction.nodeId);
    if (optionsRef.current.toggleModule) {
      optionsRef.current.toggleModule(redoneAction.nodeId);
    } else if (expandedModules.has(redoneAction.nodeId)) {
      removeFileNodes(redoneAction.nodeId);
      removeExpandedModule(redoneAction.nodeId);
    }
  }

  return currentLength;
}
