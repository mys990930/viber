import { useEffect, useRef, useCallback } from 'react';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import type { GraphNode, GraphEdge } from '../../../shared/types/graph';

// Register cose-bilkent layout
cytoscape.use(coseBilkent);

export type CytoscapeInstance = cytoscape.Core;

interface UseCytoscapeOptions {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (nodeId: string) => void;
  onNodeHover?: (nodeId: string | null) => void;
  onEdgeHover?: (edgeId: string | null) => void;
}

export function useCytoscape(options: UseCytoscapeOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  // Initialize Cytoscape instance
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: [
        // Base node styles
        {
          selector: 'node',
          style: {
            'background-color': '#1a1a2e',
            'border-color': '#533483',
            'border-width': 2,
            'width': 40,
            'height': 40,
            'label': 'data(label)',
            'color': '#e0e0e0',
            'font-size': '12px',
            'text-valign': 'center',
            'text-halign': 'center',
            'shape': 'roundrectangle',
          },
        },
        // Package nodes
        {
          selector: 'node[type="package"]',
          style: {
            'background-color': '#0f3460',
            'border-color': '#e94560',
            'width': 60,
            'height': 60,
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
            'width': 50,
            'height': 50,
          },
        },
        // File nodes
        {
          selector: 'node[type="file"]',
          style: {
            'background-color': '#12121a',
            'border-color': '#8888aa',
            'width': 40,
            'height': 40,
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
      ],
      layout: {
        name: 'cose-bilkent',
        animate: true,
        animationDuration: 500,
        randomize: false,
        componentSpacing: 100,
        nodeRepulsion: 4500,
        edgeElasticity: 0.45,
        nestingFactor: 0.1,
        gravity: 0.25,
        numIter: 2500,
        tile: true,
        tilingPaddingVertical: 10,
        tilingPaddingHorizontal: 10,
        gravityRangeCompound: 1.5,
        gravityCompound: 1.0,
        gravityRange: 3.8,
        initialEnergyOnIncremental: 0.5,
      } as any,
      minZoom: 0.1,
      maxZoom: 3,
      wheelSensitivity: 0.3,
    });

    cyRef.current = cy;

    // Event handlers
    cy.on('tap', 'node', (evt) => {
      const nodeId = evt.target.id();
      options.onNodeClick?.(nodeId);
    });

    cy.on('mouseover', 'node', (evt) => {
      const nodeId = evt.target.id();
      evt.target.addClass('hover');
      options.onNodeHover?.(nodeId);
    });

    cy.on('mouseout', 'node', (evt) => {
      evt.target.removeClass('hover');
      options.onNodeHover?.(null);
    });

    cy.on('mouseover', 'edge', (evt) => {
      const edgeId = evt.target.id();
      evt.target.addClass('hover');
      options.onEdgeHover?.(edgeId);
    });

    cy.on('mouseout', 'edge', (evt) => {
      evt.target.removeClass('hover');
      options.onEdgeHover?.(null);
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, []);

  // Update elements when nodes/edges change
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    // Build elements array
    const nodeElements = options.nodes.map((node) => ({
      data: {
        id: node.id,
        label: node.label,
        type: node.type,
        path: node.path,
        language: node.language,
      },
      classes: node.type,
    }));

    const edgeElements = options.edges.map((edge) => ({
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        kind: edge.kind,
      },
      classes: edge.kind,
    }));

    // Replace all elements
    cy.elements().remove();
    cy.add([...nodeElements, ...edgeElements]);

    // Run layout
    (cy.layout({
      name: 'cose-bilkent',
      animate: true,
      animationDuration: 500,
      randomize: false,
      fit: true,
      padding: 50,
    } as any).run());
  }, [options.nodes, options.edges]);

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
