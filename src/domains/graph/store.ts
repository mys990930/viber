import { create } from 'zustand';
import type { GraphNode, GraphEdge, GraphDiff, GraphDepth } from '../../shared/types/graph';

interface GraphStore {
  // State
  nodes: GraphNode[];
  edges: GraphEdge[];
  depth: GraphDepth;
  selectedNode: string | null;
  hoveredNode: string | null;
  hoveredEdge: string | null;
  showExternal: boolean;
  floatingEnabled: boolean;
  nodeClasses: Record<string, string[]>;
  edgeClasses: Record<string, string[]>;

  // Actions
  setDepth: (depth: GraphDepth) => void;
  selectNode: (id: string | null) => void;
  hoverNode: (id: string | null) => void;
  hoverEdge: (id: string | null) => void;
  applyDiff: (diff: GraphDiff) => void;
  toggleExternal: () => void;
  toggleFloating: () => void;

  addNodeClass: (nodeId: string, cls: string) => void;
  removeNodeClass: (nodeId: string, cls: string) => void;
  addEdgeClass: (edgeId: string, cls: string) => void;
  removeEdgeClass: (edgeId: string, cls: string) => void;
  clearClassByPrefix: (prefix: string) => void;

  setNodes: (nodes: GraphNode[]) => void;
  setEdges: (edges: GraphEdge[]) => void;
}

export const useGraphStore = create<GraphStore>((set) => ({
  nodes: [],
  edges: [],
  depth: 'modules',
  selectedNode: null,
  hoveredNode: null,
  hoveredEdge: null,
  showExternal: false,
  floatingEnabled: false,
  nodeClasses: {},
  edgeClasses: {},

  setDepth: (depth) => set({ depth }),

  selectNode: (id) => set({ selectedNode: id }),
  hoverNode: (id) => set({ hoveredNode: id }),
  hoverEdge: (id) => set({ hoveredEdge: id }),

  applyDiff: (diff) =>
    set((state) => {
      const nodesAfterRemove = state.nodes.filter((n) => !diff.removedNodes.includes(n.id));
      const nodesAfterAdd = [...nodesAfterRemove, ...diff.addedNodes];

      const updatedNodeIds = new Set(diff.updatedNodes.map((n) => n.id));
      const nodesAfterUpdate = nodesAfterAdd.map((n) =>
        updatedNodeIds.has(n.id) ? diff.updatedNodes.find((u) => u.id === n.id)! : n,
      );

      const edgesAfterRemove = state.edges.filter((e) => !diff.removedEdges.includes(e.id));
      const edgesAfterAdd = [...edgesAfterRemove, ...diff.addedEdges];

      return { nodes: nodesAfterUpdate, edges: edgesAfterAdd };
    }),

  toggleExternal: () => set((state) => ({ showExternal: !state.showExternal })),
  toggleFloating: () => set((state) => ({ floatingEnabled: !state.floatingEnabled })),

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
        ]),
      ),
      edgeClasses: Object.fromEntries(
        Object.entries(state.edgeClasses).map(([id, classes]) => [
          id,
          classes.filter((c) => !c.startsWith(prefix)),
        ]),
      ),
    })),

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
}));

export default useGraphStore;
