import { create } from 'zustand';
import type { GraphNode, GraphEdge, GraphDiff, GraphDepth } from '../../shared/types/graph';
import { getMockGraphByDepth } from './mock/graph';

// Check if running in Tauri environment
function isTauri(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI__;
}

interface GraphStore {
  // State
  nodes: GraphNode[];
  edges: GraphEdge[];
  depth: GraphDepth;
  selectedNode: string | null;
  hoveredEdge: string | null;
  showExternal: boolean;
  floatingEnabled: boolean;
  nodeClasses: Record<string, string[]>; // nodeId -> classes (for CSS Class Protocol)
  edgeClasses: Record<string, string[]>; // edgeId -> classes

  // Actions
  setDepth: (depth: GraphDepth) => void;
  selectNode: (id: string | null) => void;
  hoverEdge: (id: string | null) => void;
  applyDiff: (diff: GraphDiff) => void;
  toggleExternal: () => void;
  toggleFloating: () => void;

  // CSS Class Protocol (for inter-module communication)
  addNodeClass: (nodeId: string, cls: string) => void;
  removeNodeClass: (nodeId: string, cls: string) => void;
  addEdgeClass: (edgeId: string, cls: string) => void;
  removeEdgeClass: (edgeId: string, cls: string) => void;
  clearClassByPrefix: (prefix: string) => void;

  // Internal setters
  setNodes: (nodes: GraphNode[]) => void;
  setEdges: (edges: GraphEdge[]) => void;
}

export const useGraphStore = create<GraphStore>((set) => ({
  // Initial state: load mock data for browser mode
  nodes: isTauri() ? [] : getMockGraphByDepth('modules').nodes,
  edges: isTauri() ? [] : getMockGraphByDepth('modules').edges,
  depth: 'modules',
  selectedNode: null,
  hoveredEdge: null,
  showExternal: false,
  floatingEnabled: false,
  nodeClasses: {},
  edgeClasses: {},

  setDepth: (depth) => {
    set({ depth });
    // Reload mock data for the new depth in browser mode
    if (!isTauri()) {
      const { nodes, edges } = getMockGraphByDepth(depth);
      set({ nodes, edges });
    }
  },

  selectNode: (id) => set({ selectedNode: id }),

  hoverEdge: (id) => set({ hoveredEdge: id }),

  applyDiff: (diff) =>
    set((state) => {
      // Remove nodes
      const nodesAfterRemove = state.nodes.filter(
        (n) => !diff.removedNodes.includes(n.id)
      );

      // Add new nodes
      const nodesAfterAdd = [...nodesAfterRemove, ...diff.addedNodes];

      // Update existing nodes
      const updatedNodeIds = new Set(diff.updatedNodes.map((n) => n.id));
      const nodesAfterUpdate = nodesAfterAdd.map((n) =>
        updatedNodeIds.has(n.id)
          ? diff.updatedNodes.find((u) => u.id === n.id)!
          : n
      );

      // Remove edges
      const edgesAfterRemove = state.edges.filter(
        (e) => !diff.removedEdges.includes(e.id)
      );

      // Add new edges
      const edgesAfterAdd = [...edgesAfterRemove, ...diff.addedEdges];

      return { nodes: nodesAfterUpdate, edges: edgesAfterAdd };
    }),

  toggleExternal: () => set((state) => ({ showExternal: !state.showExternal })),

  toggleFloating: () => set((state) => ({ floatingEnabled: !state.floatingEnabled })),

  // CSS Class Protocol implementations
  addNodeClass: (nodeId, cls) =>
    set((state) => ({
      nodeClasses: {
        ...state.nodeClasses,
        [nodeId]: [...(state.nodeClasses[nodeId] || []), cls],
      },
    })),

  removeNodeClass: (nodeId, cls) =>
    set((state) => ({
      nodeClasses: {
        ...state.nodeClasses,
        [nodeId]: (state.nodeClasses[nodeId] || []).filter((c) => c !== cls),
      },
    })),

  addEdgeClass: (edgeId, cls) =>
    set((state) => ({
      edgeClasses: {
        ...state.edgeClasses,
        [edgeId]: [...(state.edgeClasses[edgeId] || []), cls],
      },
    })),

  removeEdgeClass: (edgeId, cls) =>
    set((state) => ({
      edgeClasses: {
        ...state.edgeClasses,
        [edgeId]: (state.edgeClasses[edgeId] || []).filter((c) => c !== cls),
      },
    })),

  clearClassByPrefix: (prefix) =>
    set((state) => ({
      nodeClasses: Object.fromEntries(
        Object.entries(state.nodeClasses).map(([id, classes]) => [
          id,
          classes.filter((c) => !c.startsWith(prefix)),
        ])
      ),
      edgeClasses: Object.fromEntries(
        Object.entries(state.edgeClasses).map(([id, classes]) => [
          id,
          classes.filter((c) => !c.startsWith(prefix)),
        ])
      ),
    })),

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
}));

export default useGraphStore;
