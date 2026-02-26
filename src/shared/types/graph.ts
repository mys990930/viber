import type { Language } from './project';

// ─── Node ───

export type GraphNodeType = 'package' | 'module' | 'group' | 'file';

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  path?: string;
  language?: Language;
}

// ─── Edge ───

export type EdgeKind = 'package_dep' | 'module_import' | 'file_import' | 'side_effect_import' | 'contains';

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
}

// ─── Diff ───

export interface GraphDiff {
  addedNodes: GraphNode[];
  removedNodes: string[];
  addedEdges: GraphEdge[];
  removedEdges: string[];
  updatedNodes: GraphNode[];
}

// ─── Depth ───

export type GraphDepth = 'packages' | 'modules';

// ─── Graph Data ───

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
