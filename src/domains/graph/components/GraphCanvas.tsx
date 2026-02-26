import { useEffect } from 'react';
import { useGraphStore, calculateNodeWeights, projectFileEdgesToModules, WEIGHT_PRESETS } from '..';
import { useGraph } from '../hooks/useGraph';
import { useCytoscape } from '../hooks/useCytoscape';
import { ViewModeToggle } from './ViewModeToggle';
import { WeightPresetSelector } from './WeightPresetSelector';
import { ExternalModeToggle } from './ExternalModeToggle';
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
  const externalMode = useGraphStore((s) => s.externalMode);
  const setNodeWeights = useGraphStore((s) => s.setNodeWeights);
  const nodeWeights = useGraphStore((s) => s.nodeWeights);
  const allFileEdges = useGraphStore((s) => s.allFileEdges);

  // Calculate node weights — include file edges projected onto modules
  useEffect(() => {
    if (nodes.length === 0 || edges.length === 0) {
      setNodeWeights([]);
      return;
    }

    const moduleNodes = nodes.filter((n) => n.type === 'module' || n.type === 'package');
    const shadowEdges = projectFileEdgesToModules(allFileEdges, moduleNodes);

    const config = WEIGHT_PRESETS[weightPreset];
    const weights = calculateNodeWeights(nodes, edges, config, shadowEdges);
    setNodeWeights(weights);
  }, [nodes, edges, allFileEdges, weightPreset, setNodeWeights]);

  const {
    containerRef,
    addNodeClass,
    removeNodeClass,
  } = useCytoscape({
    nodes,
    edges,
    nodeWeights,
    viewMode,
    externalMode,
    onNodeClick: (nodeId) => {
      selectNode(nodeId);
      // 모듈 노드 클릭 → expand/collapse
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
          <ExternalModeToggle />
        </div>
      )}
    </div>
  );
}
