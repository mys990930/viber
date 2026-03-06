import type cytoscape from 'cytoscape';
import type { GraphNode, GraphEdge } from '../../../../shared/types/graph';
import type { NodeWeight } from '../../utils/weight';
import { getNodeSize } from '../../utils/weight';
import { resolveCollisions, animateCollisionResolution } from './collision';
import { analyzeEdgeDirection, getLayer, type LayerType } from './utils';

function calculateFileWeight(fileNodeData: any, edges: GraphEdge[], nodeWeightMap: Map<string, NodeWeight>): { normalizedWeight: number } {
  // Use node weight from map if available, otherwise calculate from edges
  const weight = nodeWeightMap.get(fileNodeData.id);
  if (weight) {
    return { normalizedWeight: weight.normalizedWeight };
  }
  // Fallback: count connected edges
  const degree = edges.filter(e => e.source === fileNodeData.id || e.target === fileNodeData.id).length;
  const maxDegree = Math.max(5, degree);
  return { normalizedWeight: Math.min(1, degree / maxDegree) };
}

function computeFileTargetPosition(
  parentPos: { x: number; y: number },
  graphCenter: { x: number; y: number },
  fileNodeData: any,
  edges: GraphEdge[],
  nodeWeightMap: Map<string, NodeWeight>,
  index: number,
): { x: number; y: number } {
  const fileWeight = calculateFileWeight(fileNodeData, edges, nodeWeightMap);
  const weightFactor = 0.3 + fileWeight.normalizedWeight * 0.7; // 0.3..1.0

  // High weight files stay closer, low weight files go farther.
  const baseRadius = 94; // ~1.7x
  const maxRadius = 289; // ~1.7x
  const radius = baseRadius + (1 - weightFactor) * (maxRadius - baseRadius);

  // Always spread outward from graph center.
  let dx = parentPos.x - graphCenter.x;
  let dy = parentPos.y - graphCenter.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 1) {
    // If parent is exactly at center, pick a deterministic fallback direction.
    const fallbackAngle = (index % 12) * (Math.PI / 6);
    dx = Math.cos(fallbackAngle);
    dy = Math.sin(fallbackAngle);
  } else {
    dx /= dist;
    dy /= dist;
  }

  // Slight fan-out around the outward direction.
  const spread = ((index % 5) - 2) * 0.18;
  const cos = Math.cos(spread);
  const sin = Math.sin(spread);
  const dirX = dx * cos - dy * sin;
  const dirY = dx * sin + dy * cos;

  return {
    x: parentPos.x + dirX * radius,
    y: parentPos.y + dirY * radius,
  };
}

function countEdgeCrossings(positions: Map<string, { x: number; y: number }>, edges: cytoscape.EdgeCollection): number {
  const segments: Array<{ a: { x: number; y: number }; b: { x: number; y: number } }> = [];

  edges.forEach((e) => {
    const s = positions.get(e.source().id());
    const t = positions.get(e.target().id());
    if (!s || !t) return;
    segments.push({ a: s, b: t });
  });

  const ccw = (p1: any, p2: any, p3: any) => (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
  const intersects = (s1: any, s2: any) => ccw(s1.a, s2.a, s2.b) !== ccw(s1.b, s2.a, s2.b) && ccw(s1.a, s1.b, s2.a) !== ccw(s1.a, s1.b, s2.b);

  let crossing = 0;
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      if (intersects(segments[i], segments[j])) crossing++;
    }
  }
  return crossing;
}



function buildAdj(edges: cytoscape.EdgeCollection): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  edges.forEach((e) => {
    const a = e.source().id();
    const b = e.target().id();
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
  });
  return adj;
}

function collinearPenalty2Hop(
  positions: Map<string, { x: number; y: number }>,
  adj: Map<string, Set<string>>,
): number {
  let penalty = 0;

  // For each center node v, check 2-hop pairs (u-v-w)
  adj.forEach((nbrs, v) => {
    const n = Array.from(nbrs);
    if (n.length < 2) return;
    const pv = positions.get(v);
    if (!pv) return;

    for (let i = 0; i < n.length - 1; i++) {
      for (let j = i + 1; j < n.length; j++) {
        const u = n[i], w = n[j];
        const pu = positions.get(u);
        const pw = positions.get(w);
        if (!pu || !pw) continue;

        // area ~ 0 => near collinear
        const ax = pu.x - pv.x;
        const ay = pu.y - pv.y;
        const bx = pw.x - pv.x;
        const by = pw.y - pv.y;
        const area2 = Math.abs(ax * by - ay * bx);

        // normalize by edge lengths to avoid over-penalizing tiny local edges
        const la = Math.max(1, Math.sqrt(ax * ax + ay * ay));
        const lb = Math.max(1, Math.sqrt(bx * bx + by * by));
        const norm = area2 / (la * lb);

        // only penalize near-collinear configurations
        if (norm < 0.2) {
          penalty += (0.2 - norm);
        }
      }
    }
  });

  return penalty;
}

function optimizeAnglesByCrossings(
  ordered: any[],
  center: { x: number; y: number },
  radiusFor: (n: any) => number,
  edges: cytoscape.EdgeCollection,
): any[] {
  if (ordered.length < 4) return ordered;

  const arr = [...ordered];
  const maxIter = Math.min(48, arr.length * 4); // lightweight cap
  const adj = buildAdj(edges);

  const makePositions = (nodes: any[]) => {
    const map = new Map<string, { x: number; y: number }>();
    nodes.forEach((n, i) => {
      const a = (i / Math.max(1, nodes.length)) * Math.PI * 2;
      const r = radiusFor(n);
      map.set(n.id(), { x: center.x + Math.cos(a) * r, y: center.y + Math.sin(a) * r });
    });
    return map;
  };

  const scoreFn = (nodes: any[]) => {
    const pos = makePositions(nodes);
    const crossing = countEdgeCrossings(pos, edges);
    const collinear = collinearPenalty2Hop(pos, adj);
    // lightweight blended objective
    return crossing + collinear * 0.75;
  };

  let best = arr;
  let bestScore = scoreFn(best);

  for (let iter = 0; iter < maxIter; iter++) {
    let improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const candidate = [...best];
        [candidate[i], candidate[j]] = [candidate[j], candidate[i]];
        const score = scoreFn(candidate);
        if (score + 1e-6 < bestScore) {
          best = candidate;
          bestScore = score;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }

  return best;
}

function adjustGroupNodeSizes(cy: cytoscape.Core) {
  const groupNodes = cy.nodes().filter((n) => n.data('type') === 'group');
  groupNodes.forEach((groupNode) => {
    const groupId = groupNode.id();
    const childEdges = cy.edges().filter((e) => e.data('kind') === 'contains' && e.data('source') === groupId);
    const childNodes = childEdges.targets();

    if (childNodes.length > 0) {
      const bb = childNodes.boundingBox();
      const padding = 40;
      const width = Math.max(bb.w + padding * 2, 100);
      const height = Math.max(bb.h + padding * 2, 60);

      groupNode.style({ width, height });
      groupNode.animate({
        position: { x: (bb.x1 + bb.x2) / 2, y: (bb.y1 + bb.y2) / 2 },
        duration: 300,
      });
    }
  });
}

export function applyIncrementalLayout(params: {
  cy: cytoscape.Core;
  addedEles: cytoscape.CollectionReturnValue;
  nodeWeightMap: Map<string, NodeWeight>;
  edges?: GraphEdge[];
}) {
  const { cy, addedEles, nodeWeightMap, edges = [] } = params;

  const DEBUG_EXPAND_TRACE = false;

  const addedNodes = addedEles.nodes();
  const parentPositions = new Map<string, cytoscape.Position>();

  if (DEBUG_EXPAND_TRACE) {
    const startAt = Date.now();
    const base = new Map<string, { x: number; y: number }>();
    cy.nodes().forEach((n) => {
      base.set(n.id(), { ...n.position() });
    });

    const timer = setInterval(() => {
      const moved: Array<{ id: string; type: string; d: number; x: number; y: number }> = [];
      cy.nodes().forEach((n) => {
        const b = base.get(n.id());
        if (!b) return;
        const p = n.position();
        const dx = p.x - b.x;
        const dy = p.y - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 2) {
          moved.push({ id: n.id(), type: n.data('type'), d: Number(d.toFixed(2)), x: Number(p.x.toFixed(1)), y: Number(p.y.toFixed(1)) });
        }
      });

      moved.sort((a, b) => b.d - a.d);
      console.log('[expand:trace]', {
        tMs: Date.now() - startAt,
        movedCount: moved.length,
        top: moved.slice(0, 8),
      });

      if (Date.now() - startAt > 1400) {
        clearInterval(timer);
      }
    }, 80);
  }
  const bb = cy.nodes().filter((n) => !addedNodes.contains(n)).boundingBox();
  const graphCenter = {
    x: Number.isFinite(bb.x1) && Number.isFinite(bb.x2) ? (bb.x1 + bb.x2) / 2 : 0,
    y: Number.isFinite(bb.y1) && Number.isFinite(bb.y2) ? (bb.y1 + bb.y2) / 2 : 0,
  };

  console.log('[expand] start', {
    addedNodeCount: addedNodes.length,
    graphCenter,
  });

  // Lightweight objective optimization for expanded file nodes only.
  const fileRadiusFor = (n: any) => {
    const fw = calculateFileWeight(n.data(), edges, nodeWeightMap).normalizedWeight;
    const weightFactor = 0.3 + fw * 0.7;
    const baseRadius = 94;
    const maxRadius = 289;
    return baseRadius + (1 - weightFactor) * (maxRadius - baseRadius);
  };
  const optimizedFileOrder = optimizeAnglesByCrossings(addedNodes.toArray(), graphCenter, fileRadiusFor, cy.edges());
  const indexMap = new Map<string, number>();
  optimizedFileOrder.forEach((n: any, i: number) => indexMap.set(n.id(), i));

  // Animate file nodes expanding from parent center
  let addedIndex = 0;
  addedNodes.forEach((fileNode) => {
    const parentEdge = addedEles.edges().filter((e) => e.target().id() === fileNode.id());
    const parentId = parentEdge.length > 0 ? parentEdge[0].source().id() : null;
    const parentNode = parentId ? cy.getElementById(parentId) : null;

    if (parentNode && parentNode.length > 0) {
      const parentPos = parentNode.position();
      parentPositions.set(fileNode.id(), parentPos);

      // Compute target position based on file weight (higher weight = closer to parent)
      const targetPos = computeFileTargetPosition(
        parentPos,
        graphCenter,
        fileNode.data(),
        edges,
        nodeWeightMap,
        indexMap.get(fileNode.id()) ?? addedIndex,
      );

      // Prefer pushing the new file itself farther outward on collision,
      // instead of kicking existing nodes away.
      const outward = {
        x: targetPos.x - parentPos.x,
        y: targetPos.y - parentPos.y,
      };
      const outwardLen = Math.max(1, Math.sqrt(outward.x * outward.x + outward.y * outward.y));
      const ux = outward.x / outwardLen;
      const uy = outward.y / outwardLen;

      const adjustedTarget = { ...targetPos };
      const existingNodes = cy.nodes().filter((n) => !addedNodes.contains(n));
      existingNodes.forEach((n) => {
        const p = n.position();
        const dx = adjustedTarget.x - p.x;
        const dy = adjustedTarget.y - p.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const minDist = (n.width() / 2) + 18;
        if (dist < minDist) {
          const push = minDist - dist + 12;
          adjustedTarget.x += ux * push;
          adjustedTarget.y += uy * push;
        }
      });

      // Start at parent center with scale 0 (via tiny width/height) and opacity 0
      fileNode.position({ x: parentPos.x, y: parentPos.y });
      
      // File size is derived from same weight scale but intentionally smaller than modules.
      const fileWeightObj = nodeWeightMap.get(fileNode.id());
      const originalSize = fileWeightObj ? getNodeSize(Math.max(0, Math.min(1, fileWeightObj.normalizedWeight * 0.45))) : 16;

      fileNode.style({
        width: 1,
        height: 1,
        opacity: 0,
      });
      fileNode.addClass('expanding-file');

      // Spread animation: from parent center -> outward target with slight stagger.
      const delayMs = (addedIndex % 8) * 28;
      setTimeout(() => {
        fileNode.animate({
          position: { x: adjustedTarget.x, y: adjustedTarget.y },
          style: {
            width: originalSize,
            height: originalSize,
            opacity: 1,
          },
        }, {
          duration: 420,
          easing: 'ease-out',
          complete: () => {
            fileNode.removeClass('expanding-file');
          },
        });
      }, delayMs);
    } else {
      console.log('[expand:file:no-parent]', {
        fileId: fileNode.id(),
        parentEdgeCount: parentEdge.length,
      });
    }

    addedIndex += 1;
  });

  // TEST: disable post-expand fit to isolate whether final "snap" is camera-only.
  // setTimeout(() => {
  //   cy.animate({
  //     fit: { eles: cy.nodes(), padding: 80 },
  //     duration: 260,
  //     easing: 'ease-out',
  //   });
  // }, 560);

}

export function applyFullLayout(params: {
  cy: cytoscape.Core;
  nodes: GraphNode[];
  edges: GraphEdge[];
  viewMode: 'overview' | 'architecture';
  externalModeVal: string;
  savedPositions: Map<string, { x: number; y: number }>;
  isCollapse: boolean;
  nodeWeightMap?: Map<string, NodeWeight>;
  onDone?: () => void;
}) {
  const { cy, nodes, edges, viewMode, externalModeVal, savedPositions, isCollapse, nodeWeightMap, onDone } = params;
  const getWeight = (id: string) => nodeWeightMap?.get(id)?.normalizedWeight ?? 0;

  const allNodes = cy.nodes();
  let hasSavedPositionsForAll = true;
  allNodes.forEach((node) => {
    if (!savedPositions.has(node.id())) {
      hasSavedPositionsForAll = false;
    }
  });

  if (hasSavedPositionsForAll && isCollapse) {
    cy.nodes().forEach((node) => {
      const savedPos = savedPositions.get(node.id());
      if (savedPos) {
        node.animate({
          position: savedPos,
          duration: 400,
          easing: 'ease-out',
        });
      }
    });

    setTimeout(() => {
      const collisionPositions = resolveCollisions(
        cy.nodes(),
        cy.nodes(),
        18,
        40
      );
      animateCollisionResolution(cy, collisionPositions, 300);
      onDone?.();
    }, 450);

    return;
  }

  if (viewMode === 'overview') {
    console.log('[layout:overview] applyFullLayout overview start', {
      nodeCount: cy.nodes().length,
      edgeCount: cy.edges().length,
      nodeWeightCount: nodeWeightMap?.size ?? 0,
    });
    // Deterministic radial spawn from center:
    // heaviest module stays at center, others spread outward by weight.
    const center = { x: 0, y: 0 };

    cy.nodes().forEach((n) => {
      const w = getWeight(n.id());
      const size = getNodeSize(w);
      n.style({ width: size, height: size });
    });

    const moduleNodes = cy.nodes().filter((n) => !n.data('isExternal') && n.data('type') === 'module');
    const packageNodes = cy.nodes().filter((n) => !n.data('isExternal') && n.data('type') === 'package');

    const DEBUG_OVERVIEW_TRACE = false;
    if (DEBUG_OVERVIEW_TRACE && moduleNodes.length > 0) {
      const t0 = Date.now();
      const base = new Map<string, { x: number; y: number }>();
      moduleNodes.forEach((n) => {
        base.set(n.id(), { ...n.position() });
      });

      const timer = setInterval(() => {
        const moved: Array<{ id: string; d: number; x: number; y: number }> = [];
        moduleNodes.forEach((n) => {
          const b = base.get(n.id());
          if (!b) return;
          const p = n.position();
          const dx = p.x - b.x;
          const dy = p.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > 1.5) moved.push({ id: n.id(), d: Number(d.toFixed(2)), x: Number(p.x.toFixed(1)), y: Number(p.y.toFixed(1)) });
        });
        moved.sort((a, b) => b.d - a.d);
        console.log('[overview:trace]', { tMs: Date.now() - t0, movedCount: moved.length, top: moved.slice(0, 6) });
        if (Date.now() - t0 > 900) clearInterval(timer);
      }, 70);
    }

    if (moduleNodes.length > 0) {
      const sorted = moduleNodes
        .toArray()
        .sort((a, b) => getWeight(b.id()) - getWeight(a.id()));

      const heaviest = sorted[0];
      const others = sorted.slice(1);

      console.log('[layout:overview] radial spread', {
        moduleCount: sorted.length,
        heaviestId: heaviest?.id?.(),
        heaviestWeight: heaviest ? getWeight(heaviest.id()) : 0,
      });

      // Camera should start at center immediately (before expansion animation).
      cy.zoom(1);
      cy.pan(center);
      cy.userPanningEnabled(false);
      cy.userZoomingEnabled(false);

      // Start from center first, then expand out.
      sorted.forEach((node: any) => {
        node.position(center);
      });

      if (heaviest) {
        (heaviest as any).position(center);
      }

      // Viewport-relative radius so distance difference stays visible on screen.
      const minDim = Math.max(320, Math.min(cy.width(), cy.height()));
      const rMin = minDim * 0.10;
      const rMax = minDim * 0.62;

      const weightValues = others.map((n) => getWeight(n.id()));
      const minW = weightValues.length > 0 ? Math.min(...weightValues) : 0;
      const maxW = weightValues.length > 0 ? Math.max(...weightValues) : 1;
      const wRange = Math.max(1e-6, maxW - minW);

      // Continuous mapping (no tiers):
      // heaviest -> closer to center, lightest -> farther, all within viewport bounds.
      const radiusFor = (node: any) => {
        const w = getWeight(node.id());
        const normalized = (w - minW) / wRange; // 0..1
        const outward = 1 - normalized; // heavy=0, light=1
        return rMin + outward * (rMax - rMin);
      };

      const weightSorted = [...others].sort((a, b) => getWeight(b.id()) - getWeight(a.id()));
      console.log('[layout:overview] module weights (desc)', [
        ...(heaviest ? [{ id: heaviest.id(), weight: Number(getWeight(heaviest.id())), radius: 0 }] : []),
        ...weightSorted.map((n) => ({
          id: n.id(),
          weight: Number(getWeight(n.id())),
          radius: Number(radiusFor(n).toFixed(2)),
        })),
      ]);

      // New algorithm: greedy angular assignment by connection proximity.
      const slotCount = Math.max(others.length, 1);
      const slots = Array.from({ length: slotCount }, (_, i) => (i / slotCount) * Math.PI * 2);
      const assigned = new Map<string, number>();
      const used = new Set<number>();

      // build adjacency lookup
      const neighborIds = new Map<string, Set<string>>();
      cy.edges().forEach((e) => {
        const s = e.source().id();
        const t = e.target().id();
        if (!neighborIds.has(s)) neighborIds.set(s, new Set());
        if (!neighborIds.has(t)) neighborIds.set(t, new Set());
        neighborIds.get(s)!.add(t);
        neighborIds.get(t)!.add(s);
      });

      const ordered = [...others].sort((a, b) => getWeight(b.id()) - getWeight(a.id()));
      ordered.forEach((node, idx) => {
        const id = node.id();
        const neighbors = neighborIds.get(id) || new Set<string>();

        let preferred = (idx / Math.max(1, ordered.length)) * Math.PI * 2;
        const placedNeighborAngles: number[] = [];
        neighbors.forEach((nid) => {
          const a = assigned.get(nid);
          if (a !== undefined) placedNeighborAngles.push(a);
        });
        if (placedNeighborAngles.length > 0) {
          const sx = placedNeighborAngles.reduce((acc, a) => acc + Math.cos(a), 0);
          const sy = placedNeighborAngles.reduce((acc, a) => acc + Math.sin(a), 0);
          preferred = Math.atan2(sy, sx);
        }

        let bestSlot = -1;
        let bestScore = Number.POSITIVE_INFINITY;
        for (let s = 0; s < slots.length; s++) {
          if (used.has(s)) continue;
          const a = slots[s];
          const da = Math.abs(Math.atan2(Math.sin(a - preferred), Math.cos(a - preferred)));
          // lower is better: closer to neighbor direction, with slight spread regularizer
          const score = da + Math.abs(s - idx) * 0.015;
          if (score < bestScore) {
            bestScore = score;
            bestSlot = s;
          }
        }

        const chosen = bestSlot >= 0 ? bestSlot : 0;
        used.add(chosen);
        assigned.set(id, slots[chosen]);
      });

      const crossingInput = ordered.sort((a, b) => (assigned.get(a.id())! - assigned.get(b.id())!));
      const optimizedOthers = optimizeAnglesByCrossings(crossingInput, center, radiusFor, cy.edges());

      // Preparation complete (weights + objective applied, destinations fixed).
      // Let UI hide loading overlay, then start visible animation.
      onDone?.();

      optimizedOthers.forEach((node, idx) => {
        const angle = (idx / Math.max(1, optimizedOthers.length)) * Math.PI * 2;
        const radius = radiusFor(node);

        node.animate({
          position: {
            x: center.x + Math.cos(angle) * radius,
            y: center.y + Math.sin(angle) * radius,
          },
          duration: 420,
          easing: 'ease-out',
        });
      });

      // Keep packages in outer ring so module structure remains readable.
      packageNodes.forEach((node, idx) => {
        const angle = (idx / Math.max(1, packageNodes.length)) * Math.PI * 2;
        const radius = 520;
        node.position({
          x: center.x + Math.cos(angle) * radius,
          y: center.y + Math.sin(angle) * radius,
        });
      });

      const lockStartedAt = Date.now();
      const lockViewport = () => {
        if (Date.now() - lockStartedAt > 520) return;
        if (heaviest) {
          cy.center(heaviest);
        } else {
          cy.pan(center);
        }
        requestAnimationFrame(lockViewport);
      };
      requestAnimationFrame(lockViewport);

      setTimeout(() => {
        // Keep only radial motion in initial overview; skip module-level collision pass.
        if (heaviest) {
          cy.center(heaviest);
        } else {
          cy.pan(center);
        }

        cy.userPanningEnabled(true);
        cy.userZoomingEnabled(true);
      }, 520);
    }

    // Position external nodes in a cluster far from project
    const extNodes = cy.nodes().filter((n) => n.data('isExternal'));
    if (extNodes.length > 0) {
      const projNodes = cy.nodes().filter((n) => !n.data('isExternal'));
      const projectBB = projNodes.boundingBox();
      const clusterX = projectBB.x2 + 400;
      const clusterY = projectBB.y2 + 150;

      const cols = 3;
      const colSpacing = 100;
      const rowSpacing = 80;

      extNodes.forEach((n, i) => {
        const offsetX = (i % cols) * colSpacing;
        const offsetY = Math.floor(i / cols) * rowSpacing;
        n.position({
          x: clusterX + offsetX,
          y: clusterY + offsetY,
        });
      });
    }

    adjustGroupNodeSizes(cy);
    return;
  }

  const nodeLayerMap = new Map<string, LayerType>();
  nodes.forEach((node) => {
    nodeLayerMap.set(node.id, getLayer(node.path));
  });

  const isBottomUp = analyzeEdgeDirection(edges, nodeLayerMap);
  if (cy.nodes().length > 0) {
    // Ensure sizes are applied before architecture positioning
    cy.nodes().forEach((n) => {
      const w = getWeight(n.id());
      const size = getNodeSize(w);
      n.style({ width: size, height: size });
    });

    const order: LayerType[] = isBottomUp
      ? ['infra', 'domain', 'app', 'ui']
      : ['ui', 'app', 'domain', 'infra'];
    const idx = new Map<LayerType, number>();
    order.forEach((l, i) => idx.set(l, i));

    const modules = cy
      .nodes()
      .filter((n) => !n.data('isExternal') && n.data('type') !== 'file' && n.data('type') !== 'group');


    const vw = Math.max(900, cy.width());
    const vh = Math.max(620, cy.height());

    // Diagonal wave from top-left -> bottom-right
    const ax = -vw * 0.48;
    const ay = -vh * 0.46;

    order.forEach((layer) => {
      const layerNodes = modules
        .filter((n) => getLayer(n.data('path')) === layer)
        .toArray()
        .sort((a, b) => (getWeight(b.id()) - getWeight(a.id())));

      const layerIndex = idx.get(layer) ?? 0;
      if (layerNodes.length === 0) return;

      // Weight bands (same-ish weight -> same local tier)
      const bands = 4;
      const bandBuckets: any[][] = Array.from({ length: bands }, () => []);
      layerNodes.forEach((node, i) => {
        const band = Math.min(bands - 1, Math.floor((i / Math.max(1, layerNodes.length)) * bands));
        bandBuckets[band].push(node);
      });

      bandBuckets.forEach((bucket, bIdx) => {
        if (bucket.length === 0) return;

        const mid = (bucket.length - 1) / 2;

        bucket.forEach((node, j) => {
          const spread = (j - mid);
          const t = (j + 1) / (bucket.length + 1); // 0..1
          const theta = (Math.PI * 0.0) + t * (Math.PI / 2); // within ±45° around diagonal
          const radius =
            180 +
            layerIndex * 180 +
            bIdx * 70 +
            Math.abs(spread) * 80;

          const x = ax + Math.cos(theta) * radius + spread * 22;
          const y = ay + Math.sin(theta) * radius + spread * 18;

          node.animate({
            position: { x, y },
            duration: 420,
            easing: 'ease-out',
          });
        });
      });
    });


    // Mark dependency direction explicitly for architecture view.
    cy.edges().forEach((e) => {
      e.removeClass('arch-forward');
      e.removeClass('arch-reverse');

      const s = cy.getElementById(e.data('source'));
      const t = cy.getElementById(e.data('target'));
      if (!s || !t || s.length === 0 || t.length === 0) return;
      if (s.data('isExternal') || t.data('isExternal')) return;

      const sl = getLayer(s.data('path'));
      const tl = getLayer(t.data('path'));
      const sIdx = idx.get(sl) ?? 0;
      const tIdx = idx.get(tl) ?? 0;

      if (tIdx >= sIdx) e.addClass('arch-forward');
      else e.addClass('arch-reverse');
    });

    // Keep origin feeling from top-left by fitting only once with generous bounds.
    cy.animate({ fit: { eles: cy.nodes(), padding: 45 }, duration: 500 });

    adjustGroupNodeSizes(cy);

    if (externalModeVal !== 'hidden') {
      const projNodes = cy.nodes().filter((n) => !n.data('isExternal'));
      const extNodes = cy.nodes().filter((n) => n.data('isExternal'));
      if (projNodes.length > 0 && extNodes.length > 0) {
        const bb = projNodes.boundingBox();
        const cx = bb.x2 + 260;
        const cyPos = (bb.y1 + bb.y2) / 2;
        extNodes.forEach((n, i) => {
          const a = (i / Math.max(1, extNodes.length)) * Math.PI * 2;
          n.position({ x: cx + Math.cos(a) * 90, y: cyPos + Math.sin(a) * 90 });
        });
      }
    }

    setTimeout(() => onDone?.(), 520);
  }
}
