export function getCytoscapeStyle(): any[] {
  return [
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
        'border-style': 'solid' as any,
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
    // Base edge styles - straight lines
    {
      selector: 'edge',
      style: {
        'width': 1,
        'line-color': '#555577',
        'target-arrow-color': '#555577',
        'target-arrow-shape': 'triangle',
        'curve-style': 'straight',
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
    // Contains edges (module-file, undirected, visible)
    {
      selector: 'edge[kind="contains"]',
      style: {
        'width': 1,
        'line-color': '#8888aa',
        'target-arrow-shape': 'none',
        'line-style': 'solid' as any,
        'opacity': 0.5,
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
    // Bidirectional edges (merged A↔B): 2x thicker with matched head colors
    {
      selector: 'edge.bidirectional',
      style: {
        'width': 2,
        'target-arrow-shape': 'triangle',
        'source-arrow-shape': 'triangle',
        'source-arrow-color': '#555577',
        'target-arrow-color': '#555577',
        'arrow-scale': 1,
      },
    },
    {
      selector: 'edge[kind="package_dep"].bidirectional',
      style: {
        'line-color': '#e94560',
        'source-arrow-color': '#e94560',
        'target-arrow-color': '#e94560',
      },
    },
    {
      selector: 'edge[kind="module_import"].bidirectional',
      style: {
        'line-color': '#533483',
        'source-arrow-color': '#533483',
        'target-arrow-color': '#533483',
      },
    },
    {
      selector: 'edge[kind="file_import"].bidirectional',
      style: {
        'line-color': '#8888aa',
        'source-arrow-color': '#8888aa',
        'target-arrow-color': '#8888aa',
      },
    },
    {
      selector: 'edge[kind="contains"].bidirectional',
      style: {
        'line-color': '#8888aa',
        'source-arrow-color': '#8888aa',
        'target-arrow-color': '#8888aa',
      },
    },
    // Architecture direction cues
    {
      selector: 'edge.arch-forward',
      style: {
        'line-color': '#6d6d90',
        'target-arrow-color': '#6d6d90',
      },
    },
    {
      selector: 'edge.arch-reverse',
      style: {
        'line-color': '#ff9f43',
        'target-arrow-color': '#ff9f43',
        'width': 2,
        'line-style': 'dashed',
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
  ];
}
