import { useEffect, useCallback } from 'react';
import { useGraph } from '../hooks/useGraph';
import { useCytoscape } from '../hooks/useCytoscape';
import styles from './GraphCanvas.module.css';

export function GraphCanvas() {
  const {
    nodes,
    edges,
    selectedNode,
    selectNode,
    hoverEdge,
  } = useGraph();

  const {
    containerRef,
    addNodeClass,
    removeNodeClass,
  } = useCytoscape({
    nodes,
    edges,
    onNodeClick: (nodeId) => {
      selectNode(nodeId);
    },
    onNodeHover: (nodeId) => {
      // Could show tooltip here
      console.log('hover node:', nodeId);
    },
    onEdgeHover: (edgeId) => {
      hoverEdge(edgeId);
    },
  });

  // Sync selected node with Cytoscape classes
  useEffect(() => {
    // Remove selected class from all nodes
    nodes.forEach((node) => {
      removeNodeClass(node.id, 'selected');
    });

    // Add selected class to current selection
    if (selectedNode) {
      addNodeClass(selectedNode, 'selected');
    }
  }, [selectedNode, nodes, addNodeClass, removeNodeClass]);

  return (
    <div ref={containerRef} className={styles.canvas}>
      {nodes.length === 0 && (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>⚜️</span>
          <span className={styles.emptyText}>Open a project to see the graph</span>
        </div>
      )}
    </div>
  );
}
