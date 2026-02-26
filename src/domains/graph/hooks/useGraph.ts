import { useCallback, useEffect, useMemo } from 'react';
import { useGraphStore } from '../store';
import { useProjectStore } from '../../project/store';
import { useTauriCommand, useTauriEvent } from '../../shell';
import type { GraphData, GraphDepth } from '../../../shared/types/graph';
import { getMockGraphByDepth, getMockExpandModule, mockEdges } from '../mock/graph';

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
    expandedModules,
    selectedNode,
    hoveredEdge,
    setDepth,
    selectNode,
    hoverEdge,
    toggleExternal,
    toggleFloating,
    setNodes,
    setEdges,
    setAllFileEdges,
    addExpandedModule,
    removeExpandedModule,
    mergeFileNodes,
    removeFileNodes,
  } = useGraphStore();

  const { loading, error, invoke } = useTauriCommand<GraphData>('graph_get');
  const expandCmd = useTauriCommand<GraphData>('graph_expand_module');

  // Subscribe to graph:changed signal — reload filtered graph from BE
  useTauriEvent<void>('graph:changed', () => {
    console.log('[graph] graph:changed event received, reloading...');
    void loadGraph(depth);
  });

  const loadGraph = useCallback(async (d: GraphDepth) => {
    setDepth(d);

    if (!isTauri()) {
      const mock = getMockGraphByDepth(d);
      setNodes(mock.nodes);
      setEdges(mock.edges);
      // 가중치 계산용: 전체 파일 엣지
      setAllFileEdges(mockEdges.filter((e) => e.kind === 'file_import'));
      return;
    }

    const res = await invoke({ depth: d });
    if (res.ok && res.data) {
      setNodes(res.data.nodes);
      setEdges(res.data.edges);
    }
  }, [invoke, setDepth, setEdges, setNodes]);

  const expandModule = useCallback(async (modulePath: string) => {
    if (expandedModules.has(modulePath)) return;

    if (!isTauri()) {
      const mock = getMockExpandModule(modulePath);
      if (mock) {
        mergeFileNodes(mock.nodes, mock.edges);
        addExpandedModule(modulePath);
      }
      return;
    }

    const res = await expandCmd.invoke({ modulePath });
    if (res.ok && res.data && res.data.nodes.length > 0) {
      mergeFileNodes(res.data.nodes, res.data.edges);
      addExpandedModule(modulePath);
    }
  }, [expandCmd, expandedModules, mergeFileNodes, addExpandedModule]);

  const collapseModule = useCallback((modulePath: string) => {
    if (!expandedModules.has(modulePath)) return;
    removeFileNodes(modulePath);
    removeExpandedModule(modulePath);
  }, [expandedModules, removeFileNodes, removeExpandedModule]);

  const toggleModule = useCallback((modulePath: string) => {
    if (expandedModules.has(modulePath)) {
      collapseModule(modulePath);
    } else {
      expandModule(modulePath);
    }
  }, [expandedModules, expandModule, collapseModule]);

  // Browser mode: seed mock graph once
  useEffect(() => {
    if (isTauri()) return;
    const mock = getMockGraphByDepth(depth);
    setNodes(mock.nodes);
    setEdges(mock.edges);
    setAllFileEdges(mockEdges.filter((e) => e.kind === 'file_import'));
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
    expandedModules,
    selectedNode,
    hoveredEdge,
    loading,
    error,
    loadGraph,
    expandModule,
    collapseModule,
    toggleModule,
    selectNode: (id: string | null) => selectNode(id),
    hoverEdge: (id: string | null) => hoverEdge(id),
    toggleExternal: () => toggleExternal(),
    toggleFloating: () => toggleFloating(),
  }), [nodes, edges, depth, expandedModules, selectedNode, hoveredEdge, loading, error, loadGraph, expandModule, collapseModule, toggleModule, selectNode, hoverEdge, toggleExternal, toggleFloating]);

  return api;
}
