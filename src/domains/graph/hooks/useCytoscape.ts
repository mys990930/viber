import { useEffect, useRef, useCallback } from 'react';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import type { NodeWeight } from '../utils/weight';
import { useGraphStore } from '../store';
import { bindBasicEvents, bindDragEvents } from './cytoscape/events';
import { applyIncrementalLayout, applyFullLayout } from './cytoscape/layout';
import { updateGraphElements } from './cytoscape/elements';
import { bindUndoRedoShortcuts } from './cytoscape/shortcuts';
import { processUndo, processRedo } from './cytoscape/history';
import type { UseCytoscapeOptions } from './cytoscape/types';
import { getCytoscapeStyle } from './cytoscape/style';

// Register cose-bilkent layout
cytoscape.use(coseBilkent);

export type CytoscapeInstance = cytoscape.Core;

export function useCytoscape(options: UseCytoscapeOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const nodeWeightMapRef = useRef<Map<string, NodeWeight>>(new Map());
  const optionsRef = useRef(options);
  const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const isDraggingRef = useRef(false);
  optionsRef.current = options;

  // Access graph store for saved positions
  // Local saveNodePosition function (no store, no re-render)
  const saveNodePosition = useCallback((nodeId: string, pos: { x: number; y: number }) => {
    savedPositionsRef.current.set(nodeId, pos);
  }, []);

  // Undo/Redo actions from store
  const undoStack = useGraphStore((s) => s.undoStack);
  const redoStack = useGraphStore((s) => s.redoStack);
  const undo = useGraphStore((s) => s.undo);
  const redo = useGraphStore((s) => s.redo);
  const pushAction = useGraphStore((s) => s.pushAction);
  const floatingEnabled = useGraphStore((s) => s.floatingEnabled);
  const expandedModules = useGraphStore((s) => s.expandedModules);
  const addExpandedModule = useGraphStore((s) => s.addExpandedModule);
  const removeExpandedModule = useGraphStore((s) => s.removeExpandedModule);
  const removeFileNodes = useGraphStore((s) => s.removeFileNodes);

  // Track stack lengths to detect undo/redo operations
  const undoStackLengthRef = useRef<number>(undoStack.length);
  const redoStackLengthRef = useRef<number>(redoStack.length);
  
  // Local saved positions (not in store to avoid re-renders)
  const savedPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const weightSignatureRef = useRef<string>('');
  const appliedWeightSignatureRef = useRef<string>('');
  const hasInitializedLayoutRef = useRef(false);
  const lastResetVersionRef = useRef(options.resetLayoutVersion ?? 0);
  const lastViewModeRef = useRef(options.viewMode || 'overview');
  const floatingAnchorsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const floatingPhasesRef = useRef<Map<string, number>>(new Map());

  // Build node weight map for quick lookup
  useEffect(() => {
    const map = new Map<string, NodeWeight>();
    const pairs: string[] = [];

    for (const weight of options.nodeWeights ?? []) {
      map.set(weight.nodeId, weight);
      pairs.push(`${weight.nodeId}:${weight.normalizedWeight.toFixed(4)}`);
    }

    nodeWeightMapRef.current = map;
    weightSignatureRef.current = pairs.sort().join('|');
  }, [options.nodeWeights]);

  // Initialize Cytoscape instance
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: getCytoscapeStyle(),
      minZoom: 0.1,
      maxZoom: 3,
      wheelSensitivity: 0.95,
    });

    cyRef.current = cy;

    // Event handlers
    bindBasicEvents(cy, optionsRef);
    bindDragEvents(cy, {
      dragStartPositionsRef,
      isDraggingRef,
      pushAction,
      saveNodePosition,
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, []);

  // ─── Keyboard shortcuts for Undo/Redo ───
  useEffect(() => bindUndoRedoShortcuts({ undo, redo }), [undo, redo]);

  // ─── Undo Handler ───
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    undoStackLengthRef.current = processUndo({
      cy,
      undoStack,
      redoStack,
      prevUndoLength: undoStackLengthRef.current,
      optionsRef,
      expandedModules,
      saveNodePosition,
      removeFileNodes,
      removeExpandedModule,
      addExpandedModule,
    });
  }, [undoStack, redoStack, expandedModules, removeFileNodes, removeExpandedModule, addExpandedModule, saveNodePosition]);

  // ─── Redo Handler ───
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    redoStackLengthRef.current = processRedo({
      cy,
      undoStack,
      redoStack,
      prevRedoLength: redoStackLengthRef.current,
      optionsRef,
      expandedModules,
      addExpandedModule,
      removeFileNodes,
      removeExpandedModule,
    });
  }, [redoStack, undoStack, expandedModules, addExpandedModule, removeFileNodes, removeExpandedModule]);

  // Update elements when nodes/edges change
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const result = updateGraphElements({
      cy,
      nodes: options.nodes,
      edges: options.edges,
      nodeWeightMap: nodeWeightMapRef.current,
      externalMode: options.externalMode,
      savedPositions: savedPositionsRef.current,
    });

    console.log('[layout] isIncremental:', result.isIncremental, {
      toRemove: result.toRemoveCount,
      newNodes: result.newNodesCount,
      totalNodes: options.nodes.length,
      newEdges: result.newEdgesCount,
    });

    const resetVersion = options.resetLayoutVersion ?? 0;
    const resetRequested = resetVersion !== lastResetVersionRef.current;
    const weightReady = (options.nodeWeights?.length ?? 0) > 0;
    const hasGraphData = options.nodes.length > 0;
    const shouldRunInitialFullLayout = !hasInitializedLayoutRef.current && hasGraphData;

    const viewMode = options.viewMode || 'overview';
    const viewModeChanged = viewMode !== lastViewModeRef.current;
    const weightChanged = weightSignatureRef.current !== appliedWeightSignatureRef.current;

    console.log('[layout:gate]', {
      changed: result.changed,
      isIncremental: result.isIncremental,
      resetVersion,
      lastResetVersion: lastResetVersionRef.current,
      resetRequested,
      weightReady,
      weightChanged,
      weightCount: options.nodeWeights?.length ?? 0,
      shouldRunInitialFullLayout,
      viewMode,
      viewModeChanged,
      nodes: options.nodes.length,
      edges: options.edges.length,
    });

    if (viewModeChanged) {
      // reset cross-mode residual state
      savedPositionsRef.current.clear();
      floatingAnchorsRef.current.clear();

      savedPositionsRef.current.clear();
      floatingAnchorsRef.current.clear();
      applyFullLayout({
        cy,
        nodes: options.nodes,
        edges: options.edges,
        viewMode,
        externalModeVal: result.externalModeVal,
        savedPositions: savedPositionsRef.current,
        isCollapse: false,
        nodeWeightMap: nodeWeightMapRef.current,
        onDone: () => optionsRef.current.onInitialLayoutDone?.(),
      });
      hasInitializedLayoutRef.current = true;
      lastResetVersionRef.current = resetVersion;
      lastViewModeRef.current = viewMode;
      appliedWeightSignatureRef.current = weightSignatureRef.current;
      return;
    }

    if (!result.changed) {
      // Avoid post-expand/full-layout snaps from late weight recalculation.
      // Weight-only relayout is allowed only before first initialization.
      const allowWeightOnlyRelayout = !hasInitializedLayoutRef.current && weightReady && weightChanged;
      if (!(resetRequested || shouldRunInitialFullLayout || allowWeightOnlyRelayout || viewModeChanged)) {
        console.log('[layout] No changes, skipping layout');
        return;
      }

      applyFullLayout({
        cy,
        nodes: options.nodes,
        edges: options.edges,
        viewMode,
        externalModeVal: result.externalModeVal,
        savedPositions: savedPositionsRef.current,
        isCollapse: false,
        nodeWeightMap: nodeWeightMapRef.current,
        onDone: () => optionsRef.current.onInitialLayoutDone?.(),
      });

      hasInitializedLayoutRef.current = true;
      lastResetVersionRef.current = resetVersion;
      lastViewModeRef.current = viewMode;
      appliedWeightSignatureRef.current = weightSignatureRef.current;
      return;
    }

    if (result.isIncremental && result.addedEles.length > 0 && !resetRequested) {
      console.log('[layout] Running INCREMENTAL layout with push');
      applyIncrementalLayout({
        cy,
        addedEles: result.addedEles,
        nodeWeightMap: nodeWeightMapRef.current,
        edges: options.edges,
      });
      appliedWeightSignatureRef.current = weightSignatureRef.current;
      console.log('[layout] Incremental layout complete (push only, no re-fit)');
      return;
    }

    if (!resetRequested && !shouldRunInitialFullLayout && !viewModeChanged) {
      // Keep current structure positions stable; only dynamic/incremental behavior is applied.
      // But prevent newly added nodes from collapsing at default origin.
      const addedNodes = result.addedEles.nodes().filter((n) => n.data('type') !== 'file');
      if (addedNodes.length > 0) {
        const existing = cy.nodes().filter((n) => !addedNodes.contains(n));
        const bb = existing.boundingBox();
        const cx = Number.isFinite(bb.x1) && Number.isFinite(bb.x2) ? (bb.x1 + bb.x2) / 2 : 0;
        const cyPos = Number.isFinite(bb.y1) && Number.isFinite(bb.y2) ? (bb.y1 + bb.y2) / 2 : 0;

        let index = 0;
        const total = Math.max(addedNodes.length, 1);
        addedNodes.forEach((node) => {
          const angle = (index / total) * Math.PI * 2;
          const radius = 180 + (index % 5) * 24;
          node.position({
            x: cx + Math.cos(angle) * radius,
            y: cyPos + Math.sin(angle) * radius,
          });
          index += 1;
        });
      }
      return;
    }

    savedPositionsRef.current.clear();
    floatingAnchorsRef.current.clear();
    console.log('[layout] Running FULL layout');
    applyFullLayout({
      cy,
      nodes: options.nodes,
      edges: options.edges,
      viewMode,
      externalModeVal: result.externalModeVal,
      savedPositions: savedPositionsRef.current,
      isCollapse: result.isCollapse,
      nodeWeightMap: nodeWeightMapRef.current,
      onDone: () => optionsRef.current.onInitialLayoutDone?.(),
    });

    hasInitializedLayoutRef.current = true;
    lastResetVersionRef.current = resetVersion;
    lastViewModeRef.current = viewMode;
    appliedWeightSignatureRef.current = weightSignatureRef.current;
    
  }, [options.nodes, options.edges, options.nodeWeights, options.viewMode, options.externalMode, options.resetLayoutVersion, saveNodePosition]);

  // Live floating: subtle idle motion around anchor positions
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !floatingEnabled) return;

    let rafId = 0;
    const start = performance.now();

    const tick = () => {
      const current = cyRef.current;
      if (!current || !floatingEnabled) return;

      const anchors = floatingAnchorsRef.current;
      const phases = floatingPhasesRef.current;
      const liveIds = new Set<string>();

      current.nodes().forEach((n) => {
        const id = n.id();
        liveIds.add(id);
        if (!anchors.has(id)) anchors.set(id, { ...n.position() });
        if (!phases.has(id)) phases.set(id, Math.random() * Math.PI * 2);
      });

      // cleanup removed nodes
      Array.from(anchors.keys()).forEach((id) => {
        if (!liveIds.has(id)) anchors.delete(id);
      });
      Array.from(phases.keys()).forEach((id) => {
        if (!liveIds.has(id)) phases.delete(id);
      });

      const t = (performance.now() - start) / 1000;
      current.batch(() => {
        current.nodes().forEach((n) => {
          const id = n.id();

          // Keep drag/expand/collision-push fully in control.
          if (n.grabbed() || n.animated() || n.hasClass('expanding-file') || n.hasClass('collision-pushed') || n.hasClass('following-drag')) {
            anchors.set(id, { ...n.position() });
            return;
          }

          const anchor = anchors.get(id) ?? n.position();
          const phase = phases.get(id) ?? 0;

          // Hold floating for initial 1s, then ramp-in to avoid one-shot jump.
          if (t < 1.0) {
            anchors.set(id, { ...n.position() });
            return;
          }

          const baseAmp = n.data('type') === 'file' ? 2.5 : 4.5;
          const warmup = Math.min(1, Math.max(0, (t - 1.0) / 0.45));
          let amp = baseAmp * warmup;

          // After collision-push release, ramp floating back in to avoid coordinate jump.
          const now = Date.now();
          const resumeAt = Number(n.data('_floatResumeAt') || 0);
          if (resumeAt > now) {
            const reentry = 1 - (resumeAt - now) / 500;
            amp *= Math.max(0, Math.min(1, reentry));
          }

          const dx = Math.cos(t * 0.8 + phase) * amp;
          const dy = Math.sin(t * 0.6 + phase * 0.7) * amp;

          n.position({ x: anchor.x + dx, y: anchor.y + dy });
        });
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [floatingEnabled]);

  // Fit to viewport
  const fit = useCallback(() => {
    cyRef.current?.fit(undefined, 50);
  }, []);

  // Center on node
  const centerOnNode = useCallback((nodeId: string) => {
    const node = cyRef.current?.getElementById(nodeId);
    if (node && node.length > 0) {
      cyRef.current?.center(node);
      cyRef.current?.zoom({
        level: 1.5,
        position: node.position(),
      });
    }
  }, []);

  // Add/remove classes on nodes/edges (for CSS Class Protocol)
  const addNodeClass = useCallback((nodeId: string, cls: string) => {
    const node = cyRef.current?.getElementById(nodeId);
    node?.addClass(cls);
  }, []);

  const removeNodeClass = useCallback((nodeId: string, cls: string) => {
    const node = cyRef.current?.getElementById(nodeId);
    node?.removeClass(cls);
  }, []);

  const addEdgeClass = useCallback((edgeId: string, cls: string) => {
    const edge = cyRef.current?.getElementById(edgeId);
    edge?.addClass(cls);
  }, []);

  const removeEdgeClass = useCallback((edgeId: string, cls: string) => {
    const edge = cyRef.current?.getElementById(edgeId);
    edge?.removeClass(cls);
  }, []);

  return {
    containerRef,
    cy: cyRef.current,
    fit,
    centerOnNode,
    addNodeClass,
    removeNodeClass,
    addEdgeClass,
    removeEdgeClass,
  };
}
