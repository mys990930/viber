import type cytoscape from 'cytoscape';

/**
 * Collision detection and resolution
 * Pushes overlapping nodes apart with repulsion force
 */
export function resolveCollisions(
  movedNodes: cytoscape.NodeCollection,
  allNodes: cytoscape.NodeCollection,
  minGap: number = 24,
  pushStrength: number = 80
): Map<string, { x: number; y: number }> {
  const newPositions = new Map<string, { x: number; y: number }>();

  // Calculate repulsion forces
  const forces = new Map<string, { x: number; y: number }>();

  allNodes.forEach((node) => {
    const nodeId = node.id();
    const nodePos = node.position();
    let fx = 0;
    let fy = 0;

    // Check against all moved nodes
    movedNodes.forEach((movedNode) => {
      const movedId = movedNode.id();
      if (nodeId === movedId) return;

      const movedPos = movedNode.position();
      const dx = nodePos.x - movedPos.x;
      const dy = nodePos.y - movedPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = node.width() / 2 + movedNode.width() / 2 + minGap;

      if (dist < minDist && dist > 0) {
        // Repulsion force based on edge-to-edge overlap (not center threshold)
        const force = (minDist - dist) / minDist;
        fx += (dx / dist) * pushStrength * force;
        fy += (dy / dist) * pushStrength * force;
      }
    });

    // NOTE: no cascading push pass.
    // Cascading often creates spring-back/jitter (nodes trying to return to original places)
    // during drag collisions. We keep only direct repulsion from moved nodes.

    if (fx !== 0 || fy !== 0) {
      forces.set(nodeId, { x: fx, y: fy });
    }
  });

  // Apply forces to calculate new positions
  forces.forEach((force, nodeId) => {
    const node = allNodes.getElementById(nodeId);
    const pos = node.position();
    newPositions.set(nodeId, {
      x: pos.x + force.x,
      y: pos.y + force.y,
    });
  });

  return newPositions;
}

/**
 * Apply collision resolution by animating nodes to new positions
 */
export function animateCollisionResolution(
  cy: cytoscape.Core,
  newPositions: Map<string, { x: number; y: number }>,
  duration: number = 300
) {
  newPositions.forEach((pos, nodeId) => {
    const node = cy.getElementById(nodeId);
    if (node && node.length > 0) {
      node.animate({
        position: pos,
        duration,
        easing: 'ease-out',
      });
    }
  });
}
