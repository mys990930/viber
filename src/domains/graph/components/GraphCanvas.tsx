import { useEffect } from 'react';
import { useGraph } from '../hooks/useGraph';
import { useCytoscape } from '../hooks/useCytoscape';
import styles from './GraphCanvas.module.css';

export function GraphCanvas() {
  const {
    nodes,
    edges,
    error,
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
      console.log('hover node:', nodeId);
    },
    onEdgeHover: (edgeId) => {
      hoverEdge(edgeId);
    },
  });

  useEffect(() => {
    nodes.forEach((node) => {
      removeNodeClass(node.id, 'selected');
    });
    if (selectedNode) {
      addNodeClass(selectedNode, 'selected');
    }
  }, [selectedNode, nodes, addNodeClass, removeNodeClass]);

  const hasRenderableGraph = nodes.some((node) => node.type !== 'module') || edges.length > 0;
  const showOverlay = !!error || !hasRenderableGraph;

  return (
    <div className={styles.wrapper}>
      {/* Cytoscape 전용 — React가 자식을 건드리지 않음 */}
      <div ref={containerRef} className={styles.canvas} />

      {/* React 오버레이 — 별도 레이어 */}
      {showOverlay && (
        <div className={styles.overlay}>
          {error ? (
            <>
              <span className={styles.emptyIcon}>⚠️</span>
              <span className={styles.emptyText}>{error}</span>
            </>
          ) : (
            <>
              <span className={styles.emptyIcon}>⚜️</span>
              <span className={styles.emptyText}>Open a project to see the graph</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
