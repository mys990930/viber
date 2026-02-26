import { useEffect, useRef, useCallback } from 'react';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import type { GraphNode, GraphEdge } from '../../../shared/types/graph';
import type { NodeWeight } from '../utils/weight';
import { getNodeSize } from '../utils/weight';
import type { ViewMode, ExternalMode } from '../store';

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

/**
 * Check if a node is external (not part of the main project)
 * External nodes are packages that are not local modules
 */
function isExternalNode(node?: GraphNode): boolean {
  return !!node && node.type === 'package' && !node.path?.startsWith('.');
}

interface UseCytoscapeOptions {
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodeWeights?: NodeWeight[];
  viewMode?: ViewMode;
  externalMode?: ExternalMode;
  onNodeClick?: (nodeId: string) => void;
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
            'border-width': 1,
            'label': 'data(label)',
            'color': '#e0e0e0',
            'font-size': '12px',
            'text-valign': 'center',
            'text-halign': 'center',
            'shape': 'ellipse',
          },
        },
        // Package nodes (external modules)
        {
          selector: 'node[type="package"]',
          style: {
            'background-color': '#0f3460',
            'border-color': '#e94560',
            'font-size': '14px',
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
        // Group nodes (파일 없는 정리용 폴더 — 옅은 boundary)
        {
          selector: 'node[type="group"]',
          style: {
            'background-color': '#0d0d15',
            'background-opacity': 0.15,
            'border-color': '#444466',
            'border-opacity': 0.4,
            'shape': 'round-rectangle' as any,
            'border-width': 1,
            'border-style': 'dashed' as any,
            'font-size': '11px',
            'color': '#777799',
            'text-background-color': '#0a0a12',
            'text-background-opacity': 0.7,
            'text-background-padding': '3px',
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
            'border-width': 2,
          },
        },
        // Expanded module node
        {
          selector: 'node.expanded',
          style: {
            'border-color': '#00d2ff',
            'border-width': 2,
            'border-style': 'dashed' as any,
          },
        },
        // Changed node (file modified)
        {
          selector: 'node.changed',
          style: {
            'border-color': '#ffc107',
            'border-width': 2,
          },
        },
        // Base edge styles - thinner
        {
          selector: 'edge',
          style: {
            'width': 1,
            'line-color': '#555577',
            'target-arrow-color': '#555577',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1,
          },
        },
        // Package dependency edges
        {
          selector: 'edge[kind="package_dep"]',
          style: {
            'width': 1.5,
            'line-color': '#e94560',
            'target-arrow-color': '#e94560',
          },
        },
        // Module import edges
        {
          selector: 'edge[kind="module_import"]',
          style: {
            'width': 1,
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
        // Contains edges (디렉토리 포함 관계 — undirected, thin)
        {
          selector: 'edge[kind="contains"]',
          style: {
            'width': 0.5,
            'line-color': '#2a2a40',
            'target-arrow-shape': 'none',
            'line-style': 'dotted' as any,
            'opacity': 0.3,
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
            'border-width': 2,
          },
        },
        {
          selector: 'edge.hover',
          style: {
            'width': 2,
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
    const externalModeVal = options.externalMode || 'hidden';

    for (const node of options.nodes) {
      if (!existingNodeIds.has(node.id)) {
        const weight = nodeWeightMapRef.current.get(node.id);
        const isExt = isExternalNode(node);
        const classes: string[] = [node.type];

        if (isExt) {
          classes.push('external');
          if (externalModeVal === 'visible') {
            classes.push('visible');
          }
        }

        newNodeElements.push({
          data: {
            id: node.id,
            label: node.label,
            type: node.type,
            path: node.path,
            language: node.language,
            weight: weight?.normalizedWeight || 0,
            isExternal: isExt,
          },
          classes: classes.join(' '),
        });
      }
    }

    // Add new edges
    const newEdgeElements: any[] = [];
    const nodeMap = new Map(options.nodes.map(n => [n.id, n]));

    for (const edge of options.edges) {
      if (!existingEdgeIds.has(edge.id)) {
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);
        const isExt = isExternalNode(sourceNode) || isExternalNode(targetNode);
        const classes: string[] = [edge.kind];

        if (isExt) {
          classes.push('external');
          if (externalModeVal === 'visible') {
            classes.push('visible');
          }
        }

        newEdgeElements.push({
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            kind: edge.kind,
            isExternal: isExt,
          },
          classes: classes.join(' '),
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

    // Update external classes on existing nodes/edges
    cy.nodes().forEach((n) => {
      if (n.data('isExternal')) {
        n.removeClass('visible');
        if (externalModeVal === 'visible') {
          n.addClass('visible');
        }
      }
    });
    cy.edges().forEach((e) => {
      if (e.data('isExternal')) {
        e.removeClass('visible');
        if (externalModeVal === 'visible') {
          e.addClass('visible');
        }
      }
    });

    // ─── Layout ───
    if (isIncremental && addedEles.length > 0) {
      // Incremental: position new file nodes near their parent module
      // and push nearby nodes to make space (without full re-layout)
      const addedNodes = addedEles.nodes();
      const parentPositions = new Map<string, cytoscape.Position>();

      // First pass: position new nodes and collect parent positions
      addedNodes.forEach((fileNode) => {
        const parentEdge = addedEles.edges().filter((e) => e.target().id() === fileNode.id());
        const parentId = parentEdge.length > 0 ? parentEdge[0].source().id() : null;
        const parentNode = parentId ? cy.getElementById(parentId) : null;

        if (parentNode && parentNode.length > 0) {
          const pos = parentNode.position();
          parentPositions.set(fileNode.id(), pos);

          const parentWeight = parentId ? nodeWeightMapRef.current.get(parentId) : undefined;
          const weightFactor = 0.5 + (parentWeight?.normalizedWeight || 0.5);
          const angle = Math.random() * Math.PI * 2;
          const baseRadius = 80 * weightFactor;
          const radius = baseRadius + Math.random() * 40 * weightFactor;

          fileNode.position({
            x: pos.x + Math.cos(angle) * radius,
            y: pos.y + Math.sin(angle) * radius,
          });
        }
      });

      // Second pass: push nearby existing nodes away from new nodes
      const pushDistance = 60;
      const pushRadius = 120;

      cy.nodes().forEach((existingNode) => {
        if (addedNodes.contains(existingNode)) return;

        const existingPos = existingNode.position();
        let pushX = 0;
        let pushY = 0;

        parentPositions.forEach((parentPos) => {
          const dx = existingPos.x - parentPos.x;
          const dy = existingPos.y - parentPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < pushRadius && dist > 0) {
            const force = (pushRadius - dist) / pushRadius;
            pushX += (dx / dist) * pushDistance * force;
            pushY += (dy / dist) * pushDistance * force;
          }
        });

        if (pushX !== 0 || pushY !== 0) {
          existingNode.animate({
            position: {
              x: existingPos.x + pushX,
              y: existingPos.y + pushY,
            },
            duration: 300,
            easing: 'ease-out',
          });
        }
      });
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

        // Position external nodes outside the project after layout
        layout.on('layoutstop', () => {
          if (externalModeVal === 'hidden') return;
          const projNodes = cy.nodes().filter((n) => !n.data('isExternal'));
          if (projNodes.length === 0) return;
          const bb = projNodes.boundingBox();
          const cx = (bb.x1 + bb.x2) / 2;
          const cy_ = (bb.y1 + bb.y2) / 2;
          const maxR = Math.max(bb.w, bb.h) / 2 + 150;
          const extNodes = cy.nodes().filter((n) => n.data('isExternal'));
          const angleStep = (2 * Math.PI) / Math.max(extNodes.length, 1);
          extNodes.forEach((n, i) => {
            const angle = angleStep * i;
            const r = maxR + 50 + Math.random() * 50;
            n.position({ x: cx + Math.cos(angle) * r, y: cy_ + Math.sin(angle) * r });
          });
        });
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

          // Position external nodes outside the project area
          if (externalModeVal !== 'hidden') {
            const projNodes = cy.nodes().filter((n) => !n.data('isExternal'));
            const extNodes = cy.nodes().filter((n) => n.data('isExternal'));
            if (projNodes.length > 0 && extNodes.length > 0) {
              const bb = projNodes.boundingBox();
              const cx = (bb.x1 + bb.x2) / 2;
              const extY = bb.y2 + 150;
              extNodes.forEach((n, i) => {
                const offsetX = (i - extNodes.length / 2) * 100;
                n.position({ x: cx + offsetX, y: extY + Math.random() * 50 });
              });
            }
          }
        }
      }
    }
  }, [options.nodes, options.edges, options.nodeWeights, options.viewMode, options.externalMode]);


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
