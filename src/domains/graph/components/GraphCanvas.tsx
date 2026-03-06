import { useEffect, useState } from 'react';
import { useGraphStore, calculateNodeWeights, projectFileEdgesToModules, WEIGHT_PRESETS } from '..';
import { useGraph } from '../hooks/useGraph';
import { useCytoscape } from '../hooks/useCytoscape';
import { ExternalModeToggle } from './ExternalModeToggle';
import { FloatingToggle } from './FloatingToggle';
import { UndoRedoButtons } from './UndoRedoButtons';
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
  const externalMode = useGraphStore((s) => s.externalMode);
  const setNodeWeights = useGraphStore((s) => s.setNodeWeights);
  const nodeWeights = useGraphStore((s) => s.nodeWeights);
  const allFileEdges = useGraphStore((s) => s.allFileEdges);
  const pushAction = useGraphStore((s) => s.pushAction);
  const resetLayoutVersion = useGraphStore((s) => s.resetLayoutVersion);
  const requestLayoutReset = useGraphStore((s) => s.requestLayoutReset);

  // Calculate node weights — include file edges projected onto modules
  useEffect(() => {
    if (nodes.length === 0 || edges.length === 0) {
      setNodeWeights([]);
      return;
    }

    const moduleNodes = nodes.filter((n) => n.type === 'module' || n.type === 'package');
    const shadowEdges = projectFileEdgesToModules(allFileEdges, moduleNodes);

    const config = WEIGHT_PRESETS['balanced'];
    const weights = calculateNodeWeights(nodes, edges, config, shadowEdges);
    setNodeWeights(weights);
  }, [nodes, edges, allFileEdges, setNodeWeights]);

  const [layoutBootstrapped, setLayoutBootstrapped] = useState(false);
  const [initialLayoutApplied, setInitialLayoutApplied] = useState(false);
  const isWeightReady = nodes.length > 0 && nodeWeights.length === nodes.length;

  useEffect(() => {
    if (!layoutBootstrapped && isWeightReady) {
      setLayoutBootstrapped(true);
    }
  }, [layoutBootstrapped, isWeightReady]);

  useEffect(() => {
    if (!layoutBootstrapped) {
      setInitialLayoutApplied(false);
    }
  }, [layoutBootstrapped, nodes.length, edges.length]);

  const layoutNodes = layoutBootstrapped ? nodes : [];
  const layoutEdges = layoutBootstrapped ? edges : [];
  const layoutWeights = layoutBootstrapped ? nodeWeights : [];

  const {
    containerRef,
    addNodeClass,
    removeNodeClass,
  } = useCytoscape({
    nodes: layoutNodes,
    edges: layoutEdges,
    nodeWeights: layoutWeights,
    viewMode,
    externalMode,
    toggleModule,
    onNodeClick: (nodeId) => {
      selectNode(nodeId);
      // 모듈 노드 클릭 → expand/collapse
      const node = nodes.find((n) => n.id === nodeId);
      if (node?.type === 'module' && node.path) {
        const isExpanding = !expandedModules.has(node.path);
        // Record action before toggling
        if (isExpanding) {
          pushAction({
            type: 'expand',
            nodeId: node.path,
            timestamp: Date.now(),
          });
        } else {
          // For collapse, also save the file nodes that will be removed
          const modulePrefix = node.path === '.' ? '' : `${node.path}/`;
          const fileNodes = nodes.filter((n) => 
            n.type === 'file' && 
            n.path && 
            n.path.startsWith(modulePrefix) &&
            !n.path.slice(modulePrefix.length).includes('/')
          );
          const fileNodeIds = fileNodes.map((n) => n.id);
          pushAction({
            type: 'collapse',
            nodeId: node.path,
            nodeIds: fileNodeIds,
            positions: fileNodes.reduce((acc, n) => {
              acc[n.id] = { x: 0, y: 0 }; // Will be filled from cytoscape
              return acc;
            }, {} as Record<string, { x: number; y: number }>),
            timestamp: Date.now(),
          });
        }
        toggleModule(node.path);
      }
    },
    onNodeHover: (_nodeId) => {
      // tooltip placeholder
    },
    onEdgeHover: (edgeId) => {
      hoverEdge(edgeId);
    },
    resetLayoutVersion,
    onInitialLayoutDone: () => setInitialLayoutApplied(true),
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

  const isPreparingInitialLayout = (!layoutBootstrapped || !initialLayoutApplied) && nodes.length > 0;
  const hasRenderableGraph = layoutNodes.some((node) => node.type !== 'module') || layoutEdges.length > 0;
  const showOverlay = !!error || isPreparingInitialLayout || !hasRenderableGraph;

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
          ) : isPreparingInitialLayout ? (
            <>
              <span className={styles.emptyIcon}>⏳</span>
              <span className={styles.emptyText}>Loading graph + weights...</span>
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
          <div className={styles.historyRow}>
            <div className={styles.controlBlock}>
              <span className={styles.controlLabel}>History</span>
              <UndoRedoButtons />
            </div>

            <div className={styles.controlBlock}>
              <span className={styles.controlLabel}>Reset</span>
              <div className={styles.resetContainer}>
                <button className={styles.resetIconButton} onClick={requestLayoutReset} title="Reset Layout" type="button">
                  ↻
                </button>
              </div>
            </div>
          </div>



          <div className={styles.controlBlock}>
            <span className={styles.controlLabel}>External Modules</span>
            <ExternalModeToggle />
          </div>

          <div className={styles.controlBlock}>
            <span className={styles.controlLabel}>Floating</span>
            <FloatingToggle />
          </div>
        </div>
      )}
    </div>
  );
}
