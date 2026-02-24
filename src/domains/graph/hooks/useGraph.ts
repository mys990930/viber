import { useCallback, useEffect, useMemo } from 'react';
import { useGraphStore } from '../store';
import { useTauriCommand, useTauriEvent } from '../../shell';
import type { GraphData, GraphDepth, GraphDiff } from '../../../shared/types/graph';
import { getMockGraphByDepth } from '../mock/graph';

function isTauri(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI__;
}

export function useGraph() {
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

  const { data, loading, error, invoke } = useTauriCommand<GraphData>('graph_get');

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

  // Ensure initial load in browser mode (store already seeded in store, but keep safe)
  useEffect(() => {
    if (!isTauri()) {
      const mock = getMockGraphByDepth(depth);
      setNodes(mock.nodes);
      setEdges(mock.edges);
    }
    // In Tauri mode we don't auto-load here; caller should call loadGraph when appropriate
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
