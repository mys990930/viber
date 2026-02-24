import { useCallback, useEffect, useMemo } from 'react';
import { useGraphStore } from '../store';
import { useProjectStore } from '../../project/store';
import { useTauriCommand, useTauriEvent } from '../../shell';
import type { GraphData, GraphDepth, GraphDiff } from '../../../shared/types/graph';
import { getMockGraphByDepth } from '../mock/graph';

function isTauri(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return Boolean(w.__TAURI__ || w.__TAURI_INTERNALS__);
}

export function useGraph() {
  const isProjectOpen = useProjectStore((s) => s.isOpen);

  const {
    nodes,
    edges,
    depth,
    selectedNode,
    hoveredEdge,
    setDepth,
    selectNode,
    hoverEdge,
    toggleExternal,
    toggleFloating,
    setNodes,
    setEdges,
    applyDiff,
  } = useGraphStore();

  const { loading, error, invoke } = useTauriCommand<GraphData>('graph_get');

  // Subscribe to graph:updated events in Tauri mode and apply diffs
  useTauriEvent<GraphDiff>('graph:updated', (diff) => {
    applyDiff(diff);
  });

  const loadGraph = useCallback(async (d: GraphDepth) => {
    setDepth(d);

    if (!isTauri()) {
      const mock = getMockGraphByDepth(d);
      setNodes(mock.nodes);
      setEdges(mock.edges);
      return;
    }

    // Tauri: invoke command
    const res = await invoke({ depth: d });
    if (res) {
      setNodes(res.nodes);
      setEdges(res.edges);
    }
  }, [invoke, setDepth, setEdges, setNodes]);

  // Browser mode: seed mock graph once
  useEffect(() => {
    if (isTauri()) return;
    const mock = getMockGraphByDepth(depth);
    setNodes(mock.nodes);
    setEdges(mock.edges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tauri mode: load graph when project open state changes
  useEffect(() => {
    if (!isTauri()) return;

    if (!isProjectOpen) {
      setNodes([]);
      setEdges([]);
      return;
    }

    void loadGraph(depth);
  }, [depth, isProjectOpen, loadGraph, setEdges, setNodes]);

  const api = useMemo(() => ({
    nodes,
    edges,
    depth,
    selectedNode,
    hoveredEdge,
    loading,
    error,
    loadGraph,
    selectNode: (id: string | null) => selectNode(id),
    hoverEdge: (id: string | null) => hoverEdge(id),
    toggleExternal: () => toggleExternal(),
    toggleFloating: () => toggleFloating(),
  }), [nodes, edges, depth, selectedNode, hoveredEdge, loading, error, loadGraph, selectNode, hoverEdge, toggleExternal, toggleFloating]);

  return api;
}
