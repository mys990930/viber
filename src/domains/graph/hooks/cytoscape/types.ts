import type { MutableRefObject } from 'react';
import type { GraphNode, GraphEdge } from '../../../../shared/types/graph';
import type { NodeWeight } from '../../utils/weight';
import type { ViewMode, ExternalMode } from '../../store';

export interface UseCytoscapeOptions {
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodeWeights?: NodeWeight[];
  viewMode?: ViewMode;
  externalMode?: ExternalMode;
  toggleModule?: (modulePath: string) => void;
  onNodeClick?: (nodeId: string) => void;
  onNodeHover?: (nodeId: string | null) => void;
  onEdgeHover?: (edgeId: string | null) => void;
  resetLayoutVersion?: number;
  onInitialLayoutDone?: () => void;
}

export interface DragContext {
  dragStartPositionsRef: MutableRefObject<Map<string, { x: number; y: number }>>;
  isDraggingRef: MutableRefObject<boolean>;
  pushAction: (action: {
    type: 'move';
    nodeIds: string[];
    positions: Record<string, { x: number; y: number }>;
    timestamp: number;
  }) => void;
  saveNodePosition: (nodeId: string, position: { x: number; y: number }) => void;
}
