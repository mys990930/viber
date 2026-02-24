import type { GraphNode, GraphEdge } from '../../../shared/types/graph';

/**
 * Mock graph data for browser development (without Tauri backend)
 * Represents a sample project structure with packages, modules, and files
 */

// ─── Packages ───
const packages: GraphNode[] = [
  { id: 'pkg:core', type: 'package', label: '@viber/core' },
  { id: 'pkg:ui', type: 'package', label: '@viber/ui' },
  { id: 'pkg:cli', type: 'package', label: '@viber/cli' },
];

// ─── Modules ───
const modules: GraphNode[] = [
  // core modules
  { id: 'mod:core:graph', type: 'module', label: 'graph', path: 'core/graph', language: 'typescript' },
  { id: 'mod:core:parser', type: 'module', label: 'parser', path: 'core/parser', language: 'typescript' },
  { id: 'mod:core:watcher', type: 'module', label: 'watcher', path: 'core/watcher', language: 'typescript' },
  // ui modules
  { id: 'mod:ui:shell', type: 'module', label: 'shell', path: 'ui/shell', language: 'typescript' },
  { id: 'mod:ui:canvas', type: 'module', label: 'canvas', path: 'ui/canvas', language: 'typescript' },
  // cli modules
  { id: 'mod:cli:commands', type: 'module', label: 'commands', path: 'cli/commands', language: 'typescript' },
];

// ─── Files ───
const files: GraphNode[] = [
  // graph module files
  { id: 'file:core:graph:store', type: 'file', label: 'store.ts', path: 'core/graph/store.ts', language: 'typescript' },
  { id: 'file:core:graph:hooks', type: 'file', label: 'hooks.ts', path: 'core/graph/hooks.ts', language: 'typescript' },
  { id: 'file:core:graph:canvas', type: 'file', label: 'GraphCanvas.tsx', path: 'core/graph/GraphCanvas.tsx', language: 'typescript' },
  // parser module files
  { id: 'file:core:parser:index', type: 'file', label: 'index.ts', path: 'core/parser/index.ts', language: 'typescript' },
  { id: 'file:core:parser:python', type: 'file', label: 'python.rs', path: 'core/parser/python.rs', language: 'rust' },
  { id: 'file:core:parser:typescript', type: 'file', label: 'typescript.rs', path: 'core/parser/typescript.rs', language: 'rust' },
  // watcher module files
  { id: 'file:core:watcher:index', type: 'file', label: 'index.ts', path: 'core/watcher/index.ts', language: 'typescript' },
  { id: 'file:core:watcher:events', type: 'file', label: 'events.ts', path: 'core/watcher/events.ts', language: 'typescript' },
  // shell module files
  { id: 'file:ui:shell:layout', type: 'file', label: 'Layout.tsx', path: 'ui/shell/Layout.tsx', language: 'typescript' },
  { id: 'file:ui:shell:toolbar', type: 'file', label: 'Toolbar.tsx', path: 'ui/shell/Toolbar.tsx', language: 'typescript' },
  { id: 'file:ui:shell:sidebar', type: 'file', label: 'Sidebar.tsx', path: 'ui/shell/Sidebar.tsx', language: 'typescript' },
  // canvas module files
  { id: 'file:ui:canvas:cytoscape', type: 'file', label: 'Cytoscape.tsx', path: 'ui/canvas/Cytoscape.tsx', language: 'typescript' },
  { id: 'file:ui:canvas:styles', type: 'file', label: 'theme.ts', path: 'ui/canvas/theme.ts', language: 'typescript' },
  // cli module files
  { id: 'file:cli:commands:init', type: 'file', label: 'init.ts', path: 'cli/commands/init.ts', language: 'typescript' },
  { id: 'file:cli:commands:analyze', type: 'file', label: 'analyze.ts', path: 'cli/commands/analyze.ts', language: 'typescript' },
];

// ─── Package Dependencies ───
const packageEdges: GraphEdge[] = [
  { id: 'edge:pkg:ui->core', source: 'pkg:ui', target: 'pkg:core', kind: 'package_dep' },
  { id: 'edge:pkg:cli->core', source: 'pkg:cli', target: 'pkg:core', kind: 'package_dep' },
];

// ─── Module Imports ───
const moduleEdges: GraphEdge[] = [
  { id: 'edge:mod:canvas->shell', source: 'mod:ui:canvas', target: 'mod:ui:shell', kind: 'module_import' },
  { id: 'edge:mod:shell->graph', source: 'mod:ui:shell', target: 'mod:core:graph', kind: 'module_import' },
  { id: 'edge:mod:parser->watcher', source: 'mod:core:parser', target: 'mod:core:watcher', kind: 'module_import' },
  { id: 'edge:mod:graph->parser', source: 'mod:core:graph', target: 'mod:core:parser', kind: 'module_import' },
  { id: 'edge:mod:commands->graph', source: 'mod:cli:commands', target: 'mod:core:graph', kind: 'module_import' },
];

// ─── File Imports ───
const fileEdges: GraphEdge[] = [
  { id: 'edge:file:canvas->cytoscape', source: 'file:ui:canvas:cytoscape', target: 'file:ui:canvas:styles', kind: 'file_import' },
  { id: 'edge:file:shell->layout', source: 'file:ui:shell:toolbar', target: 'file:ui:shell:layout', kind: 'file_import' },
  { id: 'edge:file:parser->index', source: 'file:core:parser:python', target: 'file:core:parser:index', kind: 'file_import' },
  { id: 'edge:file:graph->store', source: 'file:core:graph:hooks', target: 'file:core:graph:store', kind: 'file_import' },
];

// ─── Export All ───
export const mockNodes: GraphNode[] = [...packages, ...modules, ...files];
export const mockEdges: GraphEdge[] = [...packageEdges, ...moduleEdges, ...fileEdges];

/**
 * Filter nodes/edges by depth
 */
export function getMockGraphByDepth(depth: 'packages' | 'modules' | 'files') {
  switch (depth) {
    case 'packages':
      return {
        nodes: packages,
        edges: packageEdges,
      };
    case 'modules':
      return {
        nodes: [...packages, ...modules],
        edges: [...packageEdges, ...moduleEdges],
      };
    case 'files':
      return {
        nodes: [...packages, ...modules, ...files],
        edges: [...packageEdges, ...moduleEdges, ...fileEdges],
      };
  }
}
