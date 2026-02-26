import { useEffect, useRef, useCallback } from 'react';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import type { GraphNode, GraphEdge } from '../../../shared/types/graph';
import type { NodeWeight } from '../utils/weight';
import { getNodeSize } from '../utils/weight';
import type { ViewMode } from '../store';

// Register cose-bilkent layout
cytoscape.use(coseBilkent);

export type CytoscapeInstance = cytoscape.Core;

// Layer detection patterns for architecture mode
const LAYER_PATTERNS = {
  ui: /\/(ui|components|views|pages|presentation)\//i,
  app: /\/(app|application|services|hooks)\//i,
  domain: /\/(domain|business|core|models|entities)\//i,
  infra: /\/(infra|infrastructure|data|external|api|db)\//i,
};

type LayerType = 'ui' | 'app' | 'domain' | 'infra';

interface UseCytoscapeOptions {
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodeWeights?: NodeWeight[];
  viewMode?: ViewMode;
  onNodeClick?: (nodeId: string) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
  onNodeHover?: (nodeId: string | null) => void;
  onEdgeHover?: (edgeId: string | null) => void;
}

/**
 * Determine layer type from file path
 */
function getLayer(path?: string): LayerType {
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
function analyzeEdgeDirection(
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

export function useCytoscape(options: UseCytoscapeOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const nodeWeightMapRef = useRef<Map<string, NodeWeight>>(new Map());
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Build node weight map for quick lookup
  useEffect(() => {
    const map = new Map<string, NodeWeight>();
    if (options.nodeWeights) {
      for (const weight of options.nodeWeights) {
        map.set(weight.nodeId, weight);
      }
    }
    nodeWeightMapRef.current = map;
  }, [options.nodeWeights]);

  // Initialize Cytoscape instance
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: [
        // Base node styles - width/height will be set dynamically
        {
          selector: 'node',
          style: {
            'background-color': '#1a1a2e',
            'border-color': '#533483',
            'border-width': 2,
            'label': 'data(label)',
            'color': '#e0e0e0',
            'font-size': '12px',
            'text-valign': 'center',
            'text-halign': 'center',
            'shape': 'ellipse',
          },
        },
        // Package nodes
        {
          selector: 'node[type="package"]',
          style: {
            'background-color': '#0f3460',
            'border-color': '#e94560',
            'font-size': '14px',
            'font-weight': 'bold',
          },
        },
        // Module nodes
        {
          selector: 'node[type="module"]',
          style: {
            'background-color': '#1a1a2e',
            'border-color': '#533483',
          },
        },
        // File nodes
        {
          selector: 'node[type="file"]',
          style: {
            'background-color': '#12121a',
            'border-color': '#8888aa',
            'font-size': '10px',
          },
        },
        // Selected node
        {
          selector: 'node.selected',
          style: {
            'border-color': '#e94560',
            'border-width': 4,
          },
        },
        // Expanded module node
        {
          selector: 'node.expanded',
          style: {
            'border-color': '#00d2ff',
            'border-width': 3,
            'border-style': 'dashed' as any,
          },
        },
        // Changed node (file modified)
        {
          selector: 'node.changed',
          style: {
            'border-color': '#ffc107',
            'border-width': 3,
          },
        },
        // Base edge styles
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#555577',
            'target-arrow-color': '#555577',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.2,
          },
        },
        // Package dependency edges
        {
          selector: 'edge[kind="package_dep"]',
          style: {
            'width': 3,
            'line-color': '#e94560',
            'target-arrow-color': '#e94560',
          },
        },
        // Module import edges
        {
          selector: 'edge[kind="module_import"]',
          style: {
            'width': 2,
            'line-color': '#533483',
            'target-arrow-color': '#533483',
          },
        },
        // File import edges
        {
          selector: 'edge[kind="file_import"]',
          style: {
            'width': 1,
            'line-color': '#8888aa',
            'target-arrow-color': '#8888aa',
          },
        },
        // Flow path edges (dashed red)
        {
          selector: 'edge.flow-path',
          style: {
            'line-style': 'dashed',
            'line-color': '#e94560',
            'target-arrow-color': '#e94560',
            'width': 3,
          },
        },
        // Hover states
        {
          selector: 'node.hover',
          style: {
            'border-color': '#e94560',
            'border-width': 3,
          },
        },
        {
          selector: 'edge.hover',
          style: {
            'width': 4,
            'line-color': '#e94560',
            'target-arrow-color': '#e94560',
          },
        },
        // External nodes - dimmed state (default)
        {
          selector: 'node.external',
          style: {
            'background-color': '#2a2a3e',
            'border-color': '#444466',
            'color': '#666688',
            'opacity': 0.4,
          },
        },
        // External edges - dimmed state
        {
          selector: 'edge.external',
          style: {
            'line-color': '#444466',
            'target-arrow-color': '#444466',
            'opacity': 0.3,
          },
        },
        // External nodes - visible state
        {
          selector: 'node.external.visible',
          style: {
            'background-color': '#3a3a5e',
            'border-color': '#666699',
            'color': '#aaaacc',
            'opacity': 0.9,
          },
        },
        // External edges - visible state
        {
          selector: 'edge.external.visible',
          style: {
            'line-color': '#666699',
            'target-arrow-color': '#666699',
            'opacity': 0.7,
          },
        },
      ],
      minZoom: 0.1,
      maxZoom: 3,
      wheelSensitivity: 0.3,
    });

    cyRef.current = cy;

    // Event handlers
    cy.on('tap', 'node', (evt) => {
      const nodeId = evt.target.id();
      optionsRef.current.onNodeClick?.(nodeId);
    });

    cy.on('dbltap', 'node', (evt) => {
      const nodeId = evt.target.id();
      optionsRef.current.onNodeDoubleClick?.(nodeId);
    });

    cy.on('mouseover', 'node', (evt) => {
      const nodeId = evt.target.id();
      evt.target.addClass('hover');
      optionsRef.current.onNodeHover?.(nodeId);
    });

    cy.on('mouseout', 'node', (evt) => {
      evt.target.removeClass('hover');
      optionsRef.current.onNodeHover?.(null);
    });

    cy.on('mouseover', 'edge', (evt) => {
      const edgeId = evt.target.id();
      evt.target.addClass('hover');
      optionsRef.current.onEdgeHover?.(edgeId);
    });

    cy.on('mouseout', 'edge', (evt) => {
      evt.target.removeClass('hover');
      optionsRef.current.onEdgeHover?.(null);
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, []);

  // Update elements when nodes/edges change

  // Update elements when nodes/edges change
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    // ─── Diff-based element update ───
    const existingNodeIds = new Set<string>();
    const existingEdgeIds = new Set<string>();
    cy.nodes().forEach((n) => { existingNodeIds.add(n.id()); });
    cy.edges().forEach((e) => { existingEdgeIds.add(e.id()); });

    const desiredNodeIds = new Set(options.nodes.map((n) => n.id));
    const desiredEdgeIds = new Set(options.edges.map((e) => e.id));

    // Remove nodes/edges that are no longer desired
    const toRemove = cy.elements().filter((ele) => {
      const id = ele.id();
      return ele.isNode() ? !desiredNodeIds.has(id) : !desiredEdgeIds.has(id);
    });

    // Add new nodes
    const newNodeElements: any[] = [];
    for (const node of options.nodes) {
      if (!existingNodeIds.has(node.id)) {
        const weight = nodeWeightMapRef.current.get(node.id);
        newNodeElements.push({
          data: {
            id: node.id,
            label: node.label,
            type: node.type,
            path: node.path,
            language: node.language,
            weight: weight?.normalizedWeight || 0,
          },
          classes: node.type,
        });
      }
    }

    // Add new edges
    const newEdgeElements: any[] = [];
    for (const edge of options.edges) {
      if (!existingEdgeIds.has(edge.id)) {
        newEdgeElements.push({
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            kind: edge.kind,
          },
          classes: edge.kind,
        });
      }
    }

    const isIncremental = toRemove.length === 0 && newNodeElements.length > 0
      && newNodeElements.length < options.nodes.length;

    toRemove.remove();
    const addedEles = cy.add([...newNodeElements, ...newEdgeElements]);

    // Apply dynamic sizes to ALL nodes (weights may have changed)
    if (options.nodeWeights && options.nodeWeights.length > 0) {
      options.nodes.forEach((node) => {
        const weight = nodeWeightMapRef.current.get(node.id);
        if (weight) {
          const size = getNodeSize(weight.normalizedWeight);
          cy.getElementById(node.id).style({
            width: size,
            height: size,
          });
        }
      });
    }

    // ─── Layout ───
    if (isIncremental && addedEles.length > 0) {
      // Incremental: position new file nodes near their parent module
      const addedNodes = addedEles.nodes();
      addedNodes.forEach((fileNode) => {
        const parentEdge = addedEles.edges().filter((e) => e.target().id() === fileNode.id());
        const parentId = parentEdge.length > 0 ? parentEdge[0].source().id() : null;
        const parentNode = parentId ? cy.getElementById(parentId) : null;

        if (parentNode && parentNode.length > 0) {
          const pos = parentNode.position();
          const parentWeight = parentId ? nodeWeightMapRef.current.get(parentId) : undefined;
          const weightFactor = 0.5 + (parentWeight?.normalizedWeight || 0.5);
          const angle = Math.random() * Math.PI * 2;
          const baseRadius = 100 * weightFactor;
          const radius = baseRadius + Math.random() * 60 * weightFactor;

          fileNode.position({
            x: pos.x + Math.cos(angle) * radius,
            y: pos.y + Math.sin(angle) * radius,
          });
        }
      });

      // Local layout on added nodes + neighborhood
      const neighborhood = addedNodes.neighborhood().union(addedNodes);
      neighborhood.layout({
        name: 'concentric',
        concentric: (node: any) => {
          const weight = nodeWeightMapRef.current.get(node.id());
          return weight?.normalizedWeight || 0;
        },
        levelWidth: () => 0.8,
        animate: true,
        animationDuration: 400,
        padding: 20,
        fit: false,
      } as any).run();
    } else if (!isIncremental) {
      // Full layout (initial load or depth change)
      const viewMode = options.viewMode || 'overview';

      if (viewMode === 'overview') {
        const layout = cy.layout({
          name: 'cose-bilkent',
          animate: true,
          animationDuration: 500,
          randomize: true,
          componentSpacing: 120,
          nodeRepulsion: 8000,
          edgeElasticity: 0.3,
          nestingFactor: 0.8,
          gravity: 0.1,
          numIter: 2500,
          tile: false,
          gravityRange: 4,
          initialEnergyOnIncremental: 0.5,
          fit: true,
          padding: 50,
        } as any);
        layout.run();
      } else {
        // Architecture mode: Grid + layer-based Y
        const nodeLayerMap = new Map<string, LayerType>();
        options.nodes.forEach((node) => {
          nodeLayerMap.set(node.id, getLayer(node.path));
        });

        const isBottomUp = analyzeEdgeDirection(options.edges, nodeLayerMap);
        const layerYPositions = isBottomUp
          ? { ui: 100, app: 300, domain: 500, infra: 700 }
          : { infra: 100, domain: 300, app: 500, ui: 700 };

        if (cy.nodes().length > 0) {
          cy.layout({ name: 'grid', fit: true, padding: 30, animate: false }).run();

          (cy.nodes() as any).positions((node: any) => {
            const layer = getLayer(node.data('path'));
            const currentPos = node.position();
            return { x: currentPos.x, y: layerYPositions[layer] };
          });

          cy.animate({ fit: { eles: cy.nodes(), padding: 50 }, duration: 500 });
        }
      }
    }
  }, [options.nodes, options.edges, options.nodeWeights, options.viewMode]);


  // Fit to viewport
  const fit = useCallback(() => {
    cyRef.current?.fit(undefined, 50);
  }, []);

  // Center on node
  const centerOnNode = useCallback((nodeId: string) => {
    const node = cyRef.current?.getElementById(nodeId);
    if (node && node.length > 0) {
      cyRef.current?.center(node);
      cyRef.current?.zoom({
        level: 1.5,
        position: node.position(),
      });
    }
  }, []);

  // Add/remove classes on nodes/edges (for CSS Class Protocol)
  const addNodeClass = useCallback((nodeId: string, cls: string) => {
    const node = cyRef.current?.getElementById(nodeId);
    node?.addClass(cls);
  }, []);

  const removeNodeClass = useCallback((nodeId: string, cls: string) => {
    const node = cyRef.current?.getElementById(nodeId);
    node?.removeClass(cls);
  }, []);

  const addEdgeClass = useCallback((edgeId: string, cls: string) => {
    const edge = cyRef.current?.getElementById(edgeId);
    edge?.addClass(cls);
  }, []);

  const removeEdgeClass = useCallback((edgeId: string, cls: string) => {
    const edge = cyRef.current?.getElementById(edgeId);
    edge?.removeClass(cls);
  }, []);

  return {
    containerRef,
    cy: cyRef.current,
    fit,
    centerOnNode,
    addNodeClass,
    removeNodeClass,
    addEdgeClass,
    removeEdgeClass,
  };
}
