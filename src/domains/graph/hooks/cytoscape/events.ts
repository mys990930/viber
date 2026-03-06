import type { MutableRefObject } from 'react';
import type cytoscape from 'cytoscape';
import { resolveCollisions } from './collision';
import type { DragContext, UseCytoscapeOptions } from './types';

export function bindBasicEvents(
  cy: cytoscape.Core,
  optionsRef: MutableRefObject<UseCytoscapeOptions>
) {
  cy.on('tap', 'node', (evt) => {
    const nodeId = evt.target.id();
    optionsRef.current.onNodeClick?.(nodeId);
  });

  cy.on('mouseover', 'node', (evt) => {
    const nodeId = evt.target.id();
    evt.target.addClass('hover');
    optionsRef.current.onNodeHover?.(nodeId);
  });

  cy.on('mouseout', 'node', (evt) => {
    evt.target.removeClass('hover');
    optionsRef.current.onNodeHover?.(null);
  });

  cy.on('mouseover', 'edge', (evt) => {
    const edgeId = evt.target.id();
    evt.target.addClass('hover');
    optionsRef.current.onEdgeHover?.(edgeId);
  });

  cy.on('mouseout', 'edge', (evt) => {
    evt.target.removeClass('hover');
    optionsRef.current.onEdgeHover?.(null);
  });
}

/** Clamp vector magnitude to maxSpeed */
function clampVelocity(v: { x: number; y: number }, maxSpeed: number): { x: number; y: number } {
  const speed = Math.sqrt(v.x * v.x + v.y * v.y);
  if (speed <= maxSpeed) return v;
  const scale = maxSpeed / speed;
  return { x: v.x * scale, y: v.y * scale };
}

export function bindDragEvents(cy: cytoscape.Core, ctx: DragContext) {
  const { dragStartPositionsRef, isDraggingRef, pushAction, saveNodePosition } = ctx;
  const childVelocity = new Map<string, { x: number; y: number }>();
  const parentPrevPos = new Map<string, { x: number; y: number }>();
  const pushedVelocity = new Map<string, { x: number; y: number }>();

  const MAX_GLIDE_SPEED = 12; // px/frame cap for collision residual glide

  // Residual glide loop — runs independently of drag events to avoid feedback loops
  let glideRafId = 0;
  const runGlideLoop = () => {
    const toDelete: string[] = [];
    pushedVelocity.forEach((v, id) => {
      const n = cy.getElementById(id);
      if (!n || n.length === 0 || n.grabbed()) {
        toDelete.push(id);
        return;
      }
      let damped = { x: v.x * 0.88, y: v.y * 0.88 };
      damped = clampVelocity(damped, MAX_GLIDE_SPEED);
      pushedVelocity.set(id, damped);
      const speed = Math.abs(damped.x) + Math.abs(damped.y);
      if (speed < 0.3) {
        toDelete.push(id);
        n.removeClass('collision-pushed');
        n.data('_floatResumeAt', Date.now() + 500);
        saveNodePosition(id, { ...n.position() });
        return;
      }
      const p = n.position();
      const next = { x: p.x + damped.x, y: p.y + damped.y };
      n.position(next);
      saveNodePosition(id, next);
    });
    toDelete.forEach((id) => pushedVelocity.delete(id));
    if (pushedVelocity.size > 0) {
      glideRafId = requestAnimationFrame(runGlideLoop);
    } else {
      glideRafId = 0;
    }
  };

  // Soft anchors: relative offsets that drift over time for organic feel
  const childOffsets = new Map<string, { x: number; y: number }>();
  let dragFrameCount = 0;

  cy.on('drag', 'node', (evt) => {
    const node = evt.target;
    const nodeId = node.id();
    const nodeType = node.data('type');

    isDraggingRef.current = true;
    dragFrameCount++;

    // Store initial position on first drag event
    if (!dragStartPositionsRef.current.has(nodeId)) {
      dragStartPositionsRef.current.set(nodeId, { ...node.position() });
    }

    if (!parentPrevPos.has(nodeId)) {
      parentPrevPos.set(nodeId, { ...node.position() });
    }

    // Moved set: dragged node + (if module) its child files
    let movedNodes = cy.collection().add(node);

    if (nodeType === 'module') {
      const childEdges = cy.edges().filter(
        (e) => e.data('kind') === 'contains' && e.data('source') === nodeId
      );
      const childNodes = childEdges.targets();

      if (childNodes.length > 0) {
        const parentPos = node.position();
        const prevParent = parentPrevPos.get(nodeId) ?? parentPos;
        const parentDelta = {
          x: parentPos.x - prevParent.x,
          y: parentPos.y - prevParent.y,
        };
        parentPrevPos.set(nodeId, { ...parentPos });

        childNodes.forEach((childNode) => {
          const childId = childNode.id();
          childNode.addClass('following-drag');

          // Capture relative offset on first drag frame
          if (!childOffsets.has(childId)) {
            const cp = childNode.position();
            childOffsets.set(childId, {
              x: cp.x - parentPos.x,
              y: cp.y - parentPos.y,
            });
          }

          const current = childNode.position();
          const prevV = childVelocity.get(childId) ?? { x: 0, y: 0 };
          const offset = childOffsets.get(childId)!;

          // Drift the anchor offset toward where the child actually is
          // This makes the formation gradually loosen while dragging
          const actualOffset = {
            x: current.x - parentPos.x,
            y: current.y - parentPos.y,
          };
          const driftRate = 0.03; // how fast the anchor adapts (0=rigid, 1=no memory)
          offset.x += (actualOffset.x - offset.x) * driftRate;
          offset.y += (actualOffset.y - offset.y) * driftRate;

          // Add per-child phase wobble for organic feel
          const wobblePhase = (dragFrameCount * 0.04) + (childId.charCodeAt(0) * 0.1);
          const wobbleAmp = 1.2;
          const wobbleX = Math.sin(wobblePhase) * wobbleAmp;
          const wobbleY = Math.cos(wobblePhase * 0.7) * wobbleAmp;

          const idealPos = {
            x: parentPos.x + offset.x + wobbleX,
            y: parentPos.y + offset.y + wobbleY,
          };
          const correction = {
            x: (idealPos.x - current.x) * 0.10,
            y: (idealPos.y - current.y) * 0.10,
          };

          const persist = 0.45;
          const vx = prevV.x * persist + parentDelta.x * 0.88 + correction.x;
          const vy = prevV.y * persist + parentDelta.y * 0.88 + correction.y;
          childVelocity.set(childId, { x: vx, y: vy });

          childNode.position({
            x: current.x + vx,
            y: current.y + vy,
          });
        });

        movedNodes = movedNodes.add(childNodes);
      }
    }

    // Resolve collisions in real-time against all other nodes
    const allOtherNodes = cy.nodes().filter((n) => !movedNodes.contains(n));

    const collisionPositions = resolveCollisions(
      movedNodes,
      allOtherNodes,
      20, // min edge-to-edge gap
      75  // push strength
    );

    const MAX_IMPULSE_SPEED = 18; // cap initial collision impulse

    // Apply direct collision impulse (no accumulation in drag handler)
    collisionPositions.forEach((pos, id) => {
      const otherNode = cy.getElementById(id);
      if (otherNode && otherNode.length > 0) {
        const current = otherNode.position();
        let impulse = {
          x: pos.x - current.x,
          y: pos.y - current.y,
        };
        impulse = clampVelocity(impulse, MAX_IMPULSE_SPEED);

        // Merge impulse into residual velocity (handled by glide loop)
        const pv = pushedVelocity.get(id) ?? { x: 0, y: 0 };
        let merged = {
          x: pv.x * 0.5 + impulse.x,
          y: pv.y * 0.5 + impulse.y,
        };
        merged = clampVelocity(merged, MAX_GLIDE_SPEED);
        pushedVelocity.set(id, merged);

        // Apply immediate position change (clamped)
        const clamped = clampVelocity(impulse, MAX_IMPULSE_SPEED);
        otherNode.position({
          x: current.x + clamped.x,
          y: current.y + clamped.y,
        });
        saveNodePosition(id, { x: current.x + clamped.x, y: current.y + clamped.y });
        otherNode.addClass('collision-pushed');
      }
    });

    // Start glide loop if not running
    if (pushedVelocity.size > 0 && glideRafId === 0) {
      glideRafId = requestAnimationFrame(runGlideLoop);
    }
  });

  cy.on('dragfree', 'node', (evt) => {
    const node = evt.target;
    const nodeId = node.id();
    const nodeType = node.data('type');

    isDraggingRef.current = false;
    dragFrameCount = 0;

    // Record move action BEFORE clearing drag start positions
    const movedNodeIds = Array.from(dragStartPositionsRef.current.keys());
    if (movedNodeIds.length > 0) {
      const positions: Record<string, { x: number; y: number }> = {};
      movedNodeIds.forEach((id) => {
        positions[id] = dragStartPositionsRef.current.get(id)!;
      });
      pushAction({
        type: 'move',
        nodeIds: movedNodeIds,
        positions, // Original positions (before move)
        timestamp: Date.now(),
      });
    }

    // Save positions for dragged node and its children
    if (nodeType === 'module') {
      saveNodePosition(nodeId, { ...node.position() });
      const childEdges = cy.edges().filter(
        (e) => e.data('kind') === 'contains' && e.data('source') === nodeId
      );
      childEdges.targets().forEach((childNode) => {
        saveNodePosition(childNode.id(), { ...childNode.position() });
      });
    } else {
      saveNodePosition(nodeId, { ...node.position() });
    }

    // Release collision-pushed lock shortly after drag ends.
    setTimeout(() => {
      cy.nodes().forEach((n) => {
        if (n.hasClass('collision-pushed')) {
          n.removeClass('collision-pushed');
          n.data('_floatResumeAt', Date.now() + 500);
        }
      });
      pushedVelocity.clear();
    }, 760);

    // Release child follow state
    cy.nodes().removeClass('following-drag');
    childVelocity.clear();
    childOffsets.clear();
    parentPrevPos.clear();

    // Clear drag start positions
    dragStartPositionsRef.current.clear();
  });
}
