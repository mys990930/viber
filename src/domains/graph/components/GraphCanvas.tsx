import { useEffect } from 'react';
import { useGraphStore, calculateNodeWeights, WEIGHT_PRESETS } from '..';
import { useGraph } from '../hooks/useGraph';
import { useCytoscape } from '../hooks/useCytoscape';
import { ViewModeToggle } from './ViewModeToggle';
import { WeightPresetSelector } from './WeightPresetSelector';
import styles from './GraphCanvas.module.css';

export function GraphCanvas() {
  const {
    nodes,
    edges,
    error,
    expandedModules,
    selectedNode,
    selectNode,
    hoverEdge,
    toggleModule,
  } = useGraph();

  // Get view and weight state from store
  const viewMode = useGraphStore((s) => s.viewMode);
  const weightPreset = useGraphStore((s) => s.weightPreset);
  const setNodeWeights = useGraphStore((s) => s.setNodeWeights);
  const nodeWeights = useGraphStore((s) => s.nodeWeights);

  // Calculate node weights when nodes, edges, or preset changes
  useEffect(() => {
    if (nodes.length === 0 || edges.length === 0) {
      setNodeWeights([]);
      return;
    }

    const config = WEIGHT_PRESETS[weightPreset];
    const weights = calculateNodeWeights(nodes, edges, config);
    setNodeWeights(weights);
  }, [nodes, edges, weightPreset, setNodeWeights]);

  const {
    containerRef,
    addNodeClass,
    removeNodeClass,
  } = useCytoscape({
    nodes,
    edges,
    nodeWeights,
    viewMode,
    onNodeClick: (nodeId) => {
      selectNode(nodeId);
    },
    onNodeDoubleClick: (nodeId) => {
      // 모듈 노드 더블클릭 → expand/collapse
      const node = nodes.find((n) => n.id === nodeId);
      if (node?.type === 'module' && node.path) {
        toggleModule(node.path);
      }
    },
    onNodeHover: (_nodeId) => {
      // tooltip placeholder
    },
    onEdgeHover: (edgeId) => {
      hoverEdge(edgeId);
    },
  });

  // Sync selected + expanded classes
  useEffect(() => {
    nodes.forEach((node) => {
      removeNodeClass(node.id, 'selected');
      removeNodeClass(node.id, 'expanded');
    });
    if (selectedNode) {
      addNodeClass(selectedNode, 'selected');
    }
    for (const modulePath of expandedModules) {
      const moduleId = `module:${modulePath}`;
      addNodeClass(moduleId, 'expanded');
    }
  }, [selectedNode, expandedModules, nodes, addNodeClass, removeNodeClass]);

  const hasRenderableGraph = nodes.some((node) => node.type !== 'module') || edges.length > 0;
  const showOverlay = !!error || !hasRenderableGraph;

  return (
    <div className={styles.wrapper}>
      <div ref={containerRef} className={styles.canvas} />

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

      {!showOverlay && (
        <div className={styles.controls}>
          <ViewModeToggle />
          <WeightPresetSelector />
        </div>
      )}
    </div>
  );
}
