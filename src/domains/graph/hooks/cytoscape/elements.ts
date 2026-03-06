import type cytoscape from 'cytoscape';
import type { GraphNode, GraphEdge } from '../../../../shared/types/graph';
import type { NodeWeight } from '../../utils/weight';
import { getNodeSize } from '../../utils/weight';
import { isExternalNode } from './utils';

function arrangeExternalCluster(cy: cytoscape.Core, externalModeVal: string) {
  const extNodes = cy.nodes().filter((n) => n.data('isExternal'));
  if (extNodes.length === 0) return;

  if (externalModeVal === 'hidden') return;

  const projNodes = cy.nodes().filter((n) => !n.data('isExternal'));
  const bb = projNodes.length > 0 ? projNodes.boundingBox() : { x1: 0, x2: 0, y1: 0, y2: 0 } as any;

  // Put externals well outside project area and keep them clustered.
  const clusterX = bb.x2 + 300;
  const clusterY = (bb.y1 + bb.y2) / 2;

  const radius = 110;
  const step = (2 * Math.PI) / Math.max(extNodes.length, 1);

  extNodes.forEach((n, i) => {
    const a = i * step;
    n.animate({
      position: {
        x: clusterX + Math.cos(a) * radius,
        y: clusterY + Math.sin(a) * radius,
      },
      duration: 360,
      easing: 'ease-out',
    });
  });

  // Focus behavior by mode:
  // - visible: show project + external cluster
  // - dim: re-focus to project bounding box
  if (externalModeVal === 'visible') {
    cy.animate({
      fit: { eles: cy.nodes(), padding: 90 },
      duration: 320,
      easing: 'ease-out',
    });
  } else if (externalModeVal === 'dim') {
    const project = cy.nodes().filter((n) => !n.data('isExternal'));
    if (project.length > 0) {
      cy.animate({
        fit: { eles: project, padding: 70 },
        duration: 300,
        easing: 'ease-out',
      });
    }
  }
}


export function updateGraphElements(params: {
  cy: cytoscape.Core;
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodeWeightMap: Map<string, NodeWeight>;
  externalMode?: string;
  savedPositions?: Map<string, { x: number; y: number }>;
}) {
  const { cy, nodes, edges, nodeWeightMap, externalMode, savedPositions } = params;

  const existingNodeIds = new Set<string>();
  const existingEdgeIds = new Set<string>();
  cy.nodes().forEach((n) => { existingNodeIds.add(n.id()); });
  cy.edges().forEach((e) => { existingEdgeIds.add(e.id()); });

  const externalModeVal = externalMode || 'hidden';

  const desiredNodeIds = new Set(
    nodes
      .filter((n) => !(externalModeVal === 'hidden' && isExternalNode(n)))
      .map((n) => n.id),
  );
  const nodeMapForDesired = new Map(nodes.map((n) => [n.id, n]));
  const desiredEdgeIds = new Set(
    edges
      .filter((e) => {
        const sNode = nodeMapForDesired.get(e.source);
        const tNode = nodeMapForDesired.get(e.target);
        const edgeIsExternal = isExternalNode(sNode) || isExternalNode(tNode);
        return !(externalModeVal === 'hidden' && edgeIsExternal);
      })
      .map((e) => e.id),
  );

  const toRemove = cy.elements().filter((ele) => {
    const id = ele.id();
    return ele.isNode() ? !desiredNodeIds.has(id) : !desiredEdgeIds.has(id);
  });

  const newNodeElements: any[] = [];

  for (const node of nodes) {
    if (node.type === 'group') continue;
    // Skip external nodes if mode is hidden (don't create them at all)
    const isExt = isExternalNode(node);
    if (isExt && externalModeVal === 'hidden') continue;
    if (!existingNodeIds.has(node.id)) {
      const weight = nodeWeightMap.get(node.id);
      const classes: string[] = [node.type];

      if (isExt) {
        classes.push('external');
        if (externalModeVal === 'visible') {
          classes.push('visible');
        }
      }

      // Calculate size based on weight
      const size = weight ? getNodeSize(weight.normalizedWeight) : 40;

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
        style: {
          width: size,
          height: size,
        },
      });
    }
  }

  // Group edges by unordered pair to detect bidirectional edges
  const edgePairs = new Map<string, GraphEdge[]>();
  for (const edge of edges) {
    const key = [edge.source, edge.target].sort().join('::');
    if (!edgePairs.has(key)) edgePairs.set(key, []);
    edgePairs.get(key)!.push(edge);
  }

  const newEdgeElements: any[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (const [, pairEdges] of edgePairs) {
    if (pairEdges.length === 2) {
      // Bidirectional: merge into single edge with both arrows
      const base = pairEdges[0];
      const sourceNode = nodeMap.get(base.source);
      const targetNode = nodeMap.get(base.target);
      if (sourceNode?.type === 'group' || targetNode?.type === 'group') continue;
      const isExt = isExternalNode(sourceNode) || isExternalNode(targetNode);
      const classes: string[] = [base.kind, 'bidirectional'];

      if (isExt) {
        classes.push('external');
        if (externalModeVal === 'visible') {
          classes.push('visible');
        }
      }

      newEdgeElements.push({
        data: {
          id: `bi::${base.source}::${base.target}`,
          source: base.source,
          target: base.target,
          kind: base.kind,
          isExternal: isExt,
          originalEdges: pairEdges,
        },
        classes: classes.join(' '),
      });
    } else {
      // Unidirectional: add normally
      for (const edge of pairEdges) {
        if (existingEdgeIds.has(edge.id)) continue;
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);
        if (sourceNode?.type === 'group' || targetNode?.type === 'group') continue;
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
  }

  const hasExistingNodes = existingNodeIds.size > 0;
  const addedNodeTypes = new Set(newNodeElements.map((n) => n.data?.type));
  const onlyFilesAdded = addedNodeTypes.size === 1 && addedNodeTypes.has('file');

  // Incremental layout is for "existing graph + file nodes appended" case.
  const isIncremental =
    hasExistingNodes &&
    newNodeElements.length > 0 &&
    onlyFilesAdded;


  const isCollapse = toRemove.length > 0 && newNodeElements.length === 0;

  if (isCollapse) {
    // Save current positions before collapse
    if (savedPositions) {
      cy.nodes().forEach((node) => {
        const pos = node.position();
        savedPositions.set(node.id(), { x: pos.x, y: pos.y });
      });
    }
    
    // Animate file nodes collapsing back to parent before removing
    const fileNodesToRemove = toRemove.filter((ele) => ele.isNode() && ele.data('type') === 'file');
    if (fileNodesToRemove.length > 0) {
      // Find parent module for each file
      fileNodesToRemove.forEach((fileNode) => {
        const parentEdge = cy.edges().filter((e) => 
          e.data('kind') === 'contains' && e.target().id() === fileNode.id()
        );
        const parentId = parentEdge.length > 0 ? parentEdge[0].source().id() : null;
        const parentNode = parentId ? cy.getElementById(parentId) : null;
        
        if (parentNode && parentNode.length > 0) {
          const parentPos = parentNode.position();
          // Animate to parent center with scale down and fade
          fileNode.animate({
            position: { x: parentPos.x, y: parentPos.y },
            style: {
              width: 1,
              height: 1,
              opacity: 0,
            },
          }, {
            duration: 250,
            easing: 'ease-in',
            complete: () => {
              fileNode.remove();
            },
          });
        } else {
          // No parent found, just fade out
          fileNode.animate({
            style: { opacity: 0 },
          }, {
            duration: 200,
            complete: () => {
              fileNode.remove();
            },
          });
        }
      });
      
      // Remove non-file elements immediately
      const otherToRemove = toRemove.filter((ele) => !fileNodesToRemove.contains(ele));
      otherToRemove.remove();
    } else {
      toRemove.remove();
    }
  } else {
    toRemove.remove();
  }
  const addedEles = cy.add([...newNodeElements, ...newEdgeElements]);

  // Apply weight-based sizes to ALL nodes (both existing and new) using batch for performance
  if (nodeWeightMap.size > 0) {
    cy.batch(() => {
      cy.nodes().forEach((node) => {
        const nodeId = node.id();
        const weight = nodeWeightMap.get(nodeId);
        if (weight) {
          const size = getNodeSize(weight.normalizedWeight);
          node.css({
            width: size,
            height: size,
          });
        }
      });
    });
  }

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

  arrangeExternalCluster(cy, externalModeVal);

  if (newNodeElements.length === 0 && newEdgeElements.length === 0 && toRemove.length === 0) {
    return {
      changed: false,
      isIncremental,
      isCollapse: false,
      addedEles: cy.collection(),
      externalModeVal,
      toRemoveCount: 0,
      newNodesCount: 0,
      newEdgesCount: 0,
    };
  }

  return {
    changed: true,
    isIncremental,
    isCollapse,
    addedEles,
    externalModeVal,
    toRemoveCount: toRemove.length,
    newNodesCount: newNodeElements.length,
    newEdgesCount: newEdgeElements.length,
  };
}
