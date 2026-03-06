import type { GraphNode, GraphEdge } from '../../../../shared/types/graph';

const LAYER_PATTERNS = {
  ui: /\/(ui|components|views|pages|presentation)\//i,
  app: /\/(app|application|services|hooks)\//i,
  domain: /\/(domain|business|core|models|entities)\//i,
  infra: /\/(infra|infrastructure|data|external|api|db)\//i,
};

export type LayerType = 'ui' | 'app' | 'domain' | 'infra';

/**
 * Check if a node is external (not part of the main project)
 * External nodes are packages that are not local modules
 */
export function isExternalNode(node?: GraphNode): boolean {
  return !!node && node.type === 'package' && !node.path?.startsWith('.');
}

/**
 * Determine layer type from file path
 */
export function getLayer(path?: string): LayerType {
  if (!path) return 'domain';
  if (LAYER_PATTERNS.ui.test(path)) return 'ui';
  if (LAYER_PATTERNS.app.test(path)) return 'app';
  if (LAYER_PATTERNS.infra.test(path)) return 'infra';
  if (LAYER_PATTERNS.domain.test(path)) return 'domain';
  return 'domain'; // Default to middle layer
}

/**
 * Analyze edge directions to determine layer order
 * Returns true if more edges flow from Infra -> UI (bottom-up)
 * Returns false if more edges flow from UI -> Infra (top-down)
 */
export function analyzeEdgeDirection(
  edges: GraphEdge[],
  nodeLayerMap: Map<string, LayerType>,
): boolean {
  const layerOrder: Record<LayerType, number> = {
    infra: 0,
    domain: 1,
    app: 2,
    ui: 3,
  };

  let upwardCount = 0;
  let downwardCount = 0;

  for (const edge of edges) {
    const sourceLayer = nodeLayerMap.get(edge.source);
    const targetLayer = nodeLayerMap.get(edge.target);

    if (sourceLayer && targetLayer) {
      const sourceOrder = layerOrder[sourceLayer];
      const targetOrder = layerOrder[targetLayer];

      if (targetOrder > sourceOrder) {
        upwardCount++;
      } else if (targetOrder < sourceOrder) {
        downwardCount++;
      }
    }
  }

  return upwardCount >= downwardCount; // Default to bottom-up if equal
}
