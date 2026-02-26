import type { GraphNode, GraphEdge } from '../../../shared/types/graph';

export interface WeightConfig {
  alpha: number; // out-degree weight
  beta: number;  // in-degree weight
  gamma: number; // betweenness weight
}

export interface NodeWeight {
  nodeId: string;
  weight: number;
  inDegree: number;
  outDegree: number;
  betweenness: number;
  normalizedWeight: number; // 0.0 ~ 1.0 (for visualization)
}

export const WEIGHT_PRESETS: Record<string, WeightConfig> = {
  balanced: { alpha: 1, beta: 1, gamma: 2 },    // Default: bridge-focused
  influence: { alpha: 2, beta: 0.5, gamma: 1 }, // High impact modules
  dependency: { alpha: 0.5, beta: 2, gamma: 1 }, // Highly depended modules
};

const DEFAULT_PRESET = 'balanced';

/**
 * Calculate betweenness centrality using Brandes' algorithm
 * Simplified for unweighted directed graphs
 */
function calculateBetweennessCentrality(
  nodes: GraphNode[],
  edges: GraphEdge[],
): Map<string, number> {
  const betweenness = new Map<string, number>();
  const nodeIds = new Set(nodes.map((n) => n.id));

  // Initialize
  nodes.forEach((n) => betweenness.set(n.id, 0));

  for (const source of nodes) {
    const s = source.id;

    // BFS data structures
    const dist = new Map<string, number>();
    const sigma = new Map<string, number>();
    const pred = new Map<string, string[]>();
    const stack: string[] = [];
    const queue: string[] = [];

    // Build adjacency list for this iteration
    const outgoing = new Map<string, string[]>();
    for (const edge of edges) {
      if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
      outgoing.get(edge.source)!.push(edge.target);
    }

    // Initialize
    for (const n of nodes) {
      dist.set(n.id, Infinity);
      sigma.set(n.id, 0);
      pred.set(n.id, []);
    }
    dist.set(s, 0);
    sigma.set(s, 1);
    queue.push(s);

    // BFS
    let head = 0;
    while (head < queue.length) {
      const v = queue[head++];
      stack.push(v);

      const neighbors = outgoing.get(v) || [];
      for (const w of neighbors) {
        if (!nodeIds.has(w)) continue;

        // Path discovery
        if (dist.get(w) === Infinity) {
          dist.set(w, dist.get(v)! + 1);
          queue.push(w);
        }

        // Shortest path counting
        if (dist.get(w) === dist.get(v)! + 1) {
          sigma.set(w, sigma.get(w)! + sigma.get(v)!);
          pred.get(w)!.push(v);
        }
      }
    }

    // Dependency accumulation
    const delta = new Map<string, number>();
    for (const n of nodes) {
      delta.set(n.id, 0);
    }

    while (stack.length > 0) {
      const w = stack.pop()!;
      for (const v of pred.get(w)!) {
        const coeff = (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!);
        delta.set(v, delta.get(v)! + coeff);
      }
      if (w !== s) {
        betweenness.set(w, betweenness.get(w)! + delta.get(w)!);
      }
    }
  }

  // Normalize by (n-1)(n-2) for directed graphs
  const n = nodes.length;
  if (n > 2) {
    const norm = 1 / ((n - 1) * (n - 2));
    for (const [nodeId, value] of betweenness) {
      betweenness.set(nodeId, value * norm);
    }
  }

  return betweenness;
}

/**
 * Calculate in-degree and out-degree for each node
 */
function calculateDegrees(
  nodes: GraphNode[],
  edges: GraphEdge[],
): { inDegree: Map<string, number>; outDegree: Map<string, number> } {
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();

  // Initialize
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    outDegree.set(node.id, 0);
  }

  // Count edges
  for (const edge of edges) {
    outDegree.set(edge.source, (outDegree.get(edge.source) || 0) + 1);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  return { inDegree, outDegree };
}

/**
 * Calculate node weights using the formula: w = α*out + β*in + γ*betweenness
 * If shadowEdges are provided, they are included in degree/betweenness calculation
 * but only weights for visible nodes are returned.
 */
export function calculateNodeWeights(
  nodes: GraphNode[],
  edges: GraphEdge[],
  config: WeightConfig = WEIGHT_PRESETS[DEFAULT_PRESET],
  shadowEdges?: GraphEdge[],
): NodeWeight[] {
  if (nodes.length === 0) return [];

  // 가시 엣지 + shadow 엣지 합산 (모듈 가중치에 파일 엣지 반영)
  const allEdges = shadowEdges ? [...edges, ...shadowEdges] : edges;

  const { inDegree, outDegree } = calculateDegrees(nodes, allEdges);
  const betweenness = calculateBetweennessCentrality(nodes, allEdges);

  // Calculate raw weights
  const weights: NodeWeight[] = nodes.map((node) => {
    const inDeg = inDegree.get(node.id) || 0;
    const outDeg = outDegree.get(node.id) || 0;
    const betw = betweenness.get(node.id) || 0;

    const weight = config.alpha * outDeg + config.beta * inDeg + config.gamma * betw;

    return {
      nodeId: node.id,
      weight,
      inDegree: inDeg,
      outDegree: outDeg,
      betweenness: betw,
      normalizedWeight: 0, // Will be set after normalization
    };
  });

  // Normalize weights to 0.0 ~ 1.0 for visualization
  const maxWeight = Math.max(...weights.map((w) => w.weight), 0.0001); // Avoid div by zero
  const minWeight = Math.min(...weights.map((w) => w.weight));
  const range = maxWeight - minWeight;

  for (const w of weights) {
    w.normalizedWeight = range > 0 ? (w.weight - minWeight) / range : 0.5;
  }

  return weights;
}

/**
 * Get top N hub nodes based on weight
 * N is dynamically calculated: min(5, max(1, floor(sqrt(nodeCount) / 2)))
 */
export function getTopHubs(
  weights: NodeWeight[],
  customN?: number,
): { hubs: NodeWeight[]; n: number } {
  const nodeCount = weights.length;

  // Dynamic N calculation
  const n = customN ?? Math.min(5, Math.max(1, Math.floor(Math.sqrt(nodeCount) / 2)));

  // Sort by weight descending and take top N
  const sorted = [...weights].sort((a, b) => b.weight - a.weight);
  const hubs = sorted.slice(0, n);

  return { hubs, n };
}

/**
 * Project file-level edges onto module nodes as "shadow edges"
 * for weight calculation. file:modules/user/router.py → file:core/security.py
 * becomes module:modules/user → module:core (if not already a module edge).
 */
export function projectFileEdgesToModules(
  allFileEdges: GraphEdge[],
  moduleNodes: GraphNode[],
): GraphEdge[] {
  const moduleIds = new Set(moduleNodes.map((n) => n.id));
  const shadowSet = new Set<string>();
  const shadows: GraphEdge[] = [];

  for (const edge of allFileEdges) {
    if (edge.kind !== 'file_import') continue;

    // file:modules/user/router.py → path = modules/user/router.py → module = modules/user
    const srcModule = fileIdToModuleId(edge.source);
    const tgtModule = fileIdToModuleId(edge.target);

    if (!srcModule || !tgtModule) continue;
    if (srcModule === tgtModule) continue; // intra-module
    if (!moduleIds.has(srcModule) || !moduleIds.has(tgtModule)) continue;

    const key = `${srcModule}->${tgtModule}`;
    if (shadowSet.has(key)) {
      // 중복 shadow edge → 기존 weight 증가 대신 count용 별도 edge
      shadows.push({
        id: `shadow:${key}:${shadowSet.size}`,
        source: srcModule,
        target: tgtModule,
        kind: 'module_import',
      });
    } else {
      shadowSet.add(key);
      shadows.push({
        id: `shadow:${key}`,
        source: srcModule,
        target: tgtModule,
        kind: 'module_import',
      });
    }
  }

  return shadows;
}

/** file:modules/user/router.py → module:modules/user */
function fileIdToModuleId(fileId: string): string | null {
  if (!fileId.startsWith('file:')) return null;
  const path = fileId.slice(5); // remove "file:"
  const lastSlash = path.lastIndexOf('/');
  if (lastSlash < 0) return 'module:.';
  return `module:${path.slice(0, lastSlash)}`;
}

/**
 * Calculate node size (width/height) based on normalized weight
 * Returns size in pixels, with min/max bounds
 */
export function getNodeSize(
  normalizedWeight: number,
  minSize: number = 30,
  maxSize: number = 80,
): number {
  return minSize + normalizedWeight * (maxSize - minSize);
}
