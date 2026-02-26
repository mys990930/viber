import { create } from 'zustand';
import type { GraphNode, GraphEdge, GraphDiff, GraphDepth } from '../../shared/types/graph';
import type { NodeWeight } from './utils/weight';

export type ViewMode = 'overview' | 'architecture';
export type WeightPreset = 'balanced' | 'influence' | 'dependency';
export type ExternalMode = 'hidden' | 'dim' | 'visible';

interface GraphStore {
  // State
  nodes: GraphNode[];
  edges: GraphEdge[];
  allFileEdges: GraphEdge[];  // 전체 파일 엣지 (가중치 계산용)
  depth: GraphDepth;
  expandedModules: Set<string>;
  selectedNode: string | null;
  hoveredNode: string | null;
  hoveredEdge: string | null;
  externalMode: ExternalMode;
  floatingEnabled: boolean;
  nodeClasses: Record<string, string[]>;
  edgeClasses: Record<string, string[]>;

  // View and weight state
  viewMode: ViewMode;
  weightPreset: WeightPreset;
  nodeWeights: NodeWeight[];

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
  setAllFileEdges: (edges: GraphEdge[]) => void;

  // Lazy loading actions
  addExpandedModule: (modulePath: string) => void;
  removeExpandedModule: (modulePath: string) => void;
  mergeFileNodes: (nodes: GraphNode[], edges: GraphEdge[]) => void;
  removeFileNodes: (modulePath: string) => void;

  // View and weight actions
  setViewMode: (mode: ViewMode) => void;
  setWeightPreset: (preset: WeightPreset) => void;
  setNodeWeights: (weights: NodeWeight[]) => void;
  setExternalMode: (mode: ExternalMode) => void;
}

export const useGraphStore = create<GraphStore>((set) => ({
  nodes: [],
  edges: [],
  allFileEdges: [],
  depth: 'modules',
  expandedModules: new Set<string>(),
  selectedNode: null,
  hoveredNode: null,
  hoveredEdge: null,
  externalMode: 'hidden',
  floatingEnabled: false,
  nodeClasses: {},
  edgeClasses: {},

  // View and weight defaults
  viewMode: 'overview',
  weightPreset: 'balanced',
  nodeWeights: [],

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

  toggleExternal: () => set((state) => {
    const modes: ExternalMode[] = ['hidden', 'dim', 'visible'];
    const currentIndex = modes.indexOf(state.externalMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    return { externalMode: nextMode };
  }),
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
  setAllFileEdges: (allFileEdges) => set({ allFileEdges }),

  // Lazy loading
  addExpandedModule: (modulePath) =>
    set((state) => {
      const next = new Set(state.expandedModules);
      next.add(modulePath);
      return { expandedModules: next };
    }),
  removeExpandedModule: (modulePath) =>
    set((state) => {
      const next = new Set(state.expandedModules);
      next.delete(modulePath);
      return { expandedModules: next };
    }),
  mergeFileNodes: (newNodes, newEdges) =>
    set((state) => {
      const existingIds = new Set(state.nodes.map((n) => n.id));
      const existingEdgeIds = new Set(state.edges.map((e) => e.id));
      const addedNodes = newNodes.filter((n) => !existingIds.has(n.id));
      // 추가 후 전체 노드 ID
      const allIds = new Set([...existingIds, ...addedNodes.map((n) => n.id)]);
      // 양쪽 끝이 모두 그래프에 존재하는 엣지만 추가
      const addedEdges = newEdges.filter(
        (e) => !existingEdgeIds.has(e.id) && allIds.has(e.source) && allIds.has(e.target),
      );
      return {
        nodes: [...state.nodes, ...addedNodes],
        edges: [...state.edges, ...addedEdges],
      };
    }),
  removeFileNodes: (modulePath) =>
    set((state) => {
      const prefix = modulePath === '.' ? '' : `${modulePath}/`;
      const isTargetFile = (node: GraphNode) => {
        if (node.type !== 'file') return false;
        if (!node.path) return false;
        if (modulePath === '.') return !node.path.includes('/');
        return node.path.startsWith(prefix) && !node.path.slice(prefix.length).includes('/');
      };
      const removedIds = new Set(state.nodes.filter(isTargetFile).map((n) => n.id));
      return {
        nodes: state.nodes.filter((n) => !removedIds.has(n.id)),
        edges: state.edges.filter((e) => !removedIds.has(e.source) && !removedIds.has(e.target)),
      };
    }),

  setViewMode: (viewMode) => set({ viewMode }),
  setWeightPreset: (weightPreset) => set({ weightPreset }),
  setNodeWeights: (nodeWeights) => set({ nodeWeights }),
  setExternalMode: (externalMode) => set({ externalMode }),
}));

export default useGraphStore;
