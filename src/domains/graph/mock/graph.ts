import type { GraphNode, GraphEdge } from '../../../shared/types/graph';

/**
 * Mock graph data for browser development (without Tauri backend)
 * Based on barber.io — FastAPI game backend (Python)
 */

// ─── Packages (외부 의존성) ───
const packages: GraphNode[] = [
  { id: 'package:fastapi', type: 'package', label: 'fastapi' },
  { id: 'package:sqlalchemy', type: 'package', label: 'sqlalchemy' },
  { id: 'package:jose', type: 'package', label: 'python-jose' },
  { id: 'package:google-auth', type: 'package', label: 'google-auth' },
  { id: 'package:alembic', type: 'package', label: 'alembic' },
  { id: 'package:pymysql', type: 'package', label: 'pymysql' },
];

// ─── Modules (디렉토리 구조) ───
const modules: GraphNode[] = [
  { id: 'module:.', type: 'module', label: 'barber.io', path: '.', language: 'python' },
  { id: 'module:core', type: 'module', label: 'core', path: 'core', language: 'python' },
  { id: 'module:modules', type: 'module', label: 'modules', path: 'modules', language: 'python' },
  { id: 'module:modules/user', type: 'module', label: 'user', path: 'modules/user', language: 'python' },
  { id: 'module:modules/gacha', type: 'module', label: 'gacha', path: 'modules/gacha', language: 'python' },
  { id: 'module:modules/shop', type: 'module', label: 'shop', path: 'modules/shop', language: 'python' },
  { id: 'module:modules/event', type: 'module', label: 'event', path: 'modules/event', language: 'python' },
  { id: 'module:modules/ranking', type: 'module', label: 'ranking', path: 'modules/ranking', language: 'python' },
  { id: 'module:modules/notice', type: 'module', label: 'notice', path: 'modules/notice', language: 'python' },
  { id: 'module:modules/admin', type: 'module', label: 'admin', path: 'modules/admin', language: 'python' },
  { id: 'module:modules/admin_auth', type: 'module', label: 'admin_auth', path: 'modules/admin_auth', language: 'python' },
  { id: 'module:modules/misc', type: 'module', label: 'misc', path: 'modules/misc', language: 'python' },
  { id: 'module:modules/user_event_log', type: 'module', label: 'user_event_log', path: 'modules/user_event_log', language: 'python' },
  { id: 'module:tests', type: 'module', label: 'tests', path: 'tests', language: 'python' },
  { id: 'module:alembic', type: 'module', label: 'alembic', path: 'alembic', language: 'python' },
];

// ─── Files ───
const files: GraphNode[] = [
  // root
  { id: 'file:main.py', type: 'file', label: 'main.py', path: 'main.py', language: 'python' },
  // core
  { id: 'file:core/database.py', type: 'file', label: 'database.py', path: 'core/database.py', language: 'python' },
  { id: 'file:core/security.py', type: 'file', label: 'security.py', path: 'core/security.py', language: 'python' },
  { id: 'file:core/CONSTANTS.py', type: 'file', label: 'CONSTANTS.py', path: 'core/CONSTANTS.py', language: 'python' },
  { id: 'file:core/exceptions.py', type: 'file', label: 'exceptions.py', path: 'core/exceptions.py', language: 'python' },
  { id: 'file:core/misc.py', type: 'file', label: 'misc.py', path: 'core/misc.py', language: 'python' },
  { id: 'file:core/logging_config.py', type: 'file', label: 'logging_config.py', path: 'core/logging_config.py', language: 'python' },
  // user
  { id: 'file:modules/user/router.py', type: 'file', label: 'router.py', path: 'modules/user/router.py', language: 'python' },
  { id: 'file:modules/user/service.py', type: 'file', label: 'service.py', path: 'modules/user/service.py', language: 'python' },
  { id: 'file:modules/user/repository.py', type: 'file', label: 'repository.py', path: 'modules/user/repository.py', language: 'python' },
  { id: 'file:modules/user/models.py', type: 'file', label: 'models.py', path: 'modules/user/models.py', language: 'python' },
  { id: 'file:modules/user/schemas.py', type: 'file', label: 'schemas.py', path: 'modules/user/schemas.py', language: 'python' },
  // gacha
  { id: 'file:modules/gacha/router.py', type: 'file', label: 'router.py', path: 'modules/gacha/router.py', language: 'python' },
  { id: 'file:modules/gacha/service.py', type: 'file', label: 'service.py', path: 'modules/gacha/service.py', language: 'python' },
  { id: 'file:modules/gacha/repository.py', type: 'file', label: 'repository.py', path: 'modules/gacha/repository.py', language: 'python' },
  { id: 'file:modules/gacha/models.py', type: 'file', label: 'models.py', path: 'modules/gacha/models.py', language: 'python' },
  { id: 'file:modules/gacha/schemas.py', type: 'file', label: 'schemas.py', path: 'modules/gacha/schemas.py', language: 'python' },
  // shop
  { id: 'file:modules/shop/router.py', type: 'file', label: 'router.py', path: 'modules/shop/router.py', language: 'python' },
  { id: 'file:modules/shop/service.py', type: 'file', label: 'service.py', path: 'modules/shop/service.py', language: 'python' },
  { id: 'file:modules/shop/repository.py', type: 'file', label: 'repository.py', path: 'modules/shop/repository.py', language: 'python' },
  { id: 'file:modules/shop/models.py', type: 'file', label: 'models.py', path: 'modules/shop/models.py', language: 'python' },
  { id: 'file:modules/shop/schemas.py', type: 'file', label: 'schemas.py', path: 'modules/shop/schemas.py', language: 'python' },
  // event
  { id: 'file:modules/event/service.py', type: 'file', label: 'service.py', path: 'modules/event/service.py', language: 'python' },
  { id: 'file:modules/event/models.py', type: 'file', label: 'models.py', path: 'modules/event/models.py', language: 'python' },
  { id: 'file:modules/event/repository.py', type: 'file', label: 'repository.py', path: 'modules/event/repository.py', language: 'python' },
  // ranking
  { id: 'file:modules/ranking/service.py', type: 'file', label: 'service.py', path: 'modules/ranking/service.py', language: 'python' },
  { id: 'file:modules/ranking/schemas.py', type: 'file', label: 'schemas.py', path: 'modules/ranking/schemas.py', language: 'python' },
];

// ─── Package Dependencies ───
const packageEdges: GraphEdge[] = [
  { id: 'pkgdep:root->fastapi', source: 'module:.', target: 'package:fastapi', kind: 'package_dep' },
  { id: 'pkgdep:root->sqlalchemy', source: 'module:.', target: 'package:sqlalchemy', kind: 'package_dep' },
  { id: 'pkgdep:root->jose', source: 'module:.', target: 'package:jose', kind: 'package_dep' },
  { id: 'pkgdep:root->google-auth', source: 'module:.', target: 'package:google-auth', kind: 'package_dep' },
  { id: 'pkgdep:root->alembic', source: 'module:.', target: 'package:alembic', kind: 'package_dep' },
  { id: 'pkgdep:root->pymysql', source: 'module:.', target: 'package:pymysql', kind: 'package_dep' },
];

// ─── Module Imports (cross-module dependencies) ───
const moduleEdges: GraphEdge[] = [
  // 구조: modules → core 의존
  { id: 'modimp:user->core', source: 'module:modules/user', target: 'module:core', kind: 'module_import' },
  { id: 'modimp:gacha->core', source: 'module:modules/gacha', target: 'module:core', kind: 'module_import' },
  { id: 'modimp:shop->core', source: 'module:modules/shop', target: 'module:core', kind: 'module_import' },
  { id: 'modimp:event->core', source: 'module:modules/event', target: 'module:core', kind: 'module_import' },
  { id: 'modimp:admin->core', source: 'module:modules/admin', target: 'module:core', kind: 'module_import' },
  { id: 'modimp:admin_auth->core', source: 'module:modules/admin_auth', target: 'module:core', kind: 'module_import' },
  { id: 'modimp:notice->core', source: 'module:modules/notice', target: 'module:core', kind: 'module_import' },
  // cross-module: gacha→user, shop→user, shop→gacha, ranking→user
  { id: 'modimp:gacha->user', source: 'module:modules/gacha', target: 'module:modules/user', kind: 'module_import' },
  { id: 'modimp:shop->user', source: 'module:modules/shop', target: 'module:modules/user', kind: 'module_import' },
  { id: 'modimp:shop->gacha', source: 'module:modules/shop', target: 'module:modules/gacha', kind: 'module_import' },
  { id: 'modimp:ranking->user', source: 'module:modules/ranking', target: 'module:modules/user', kind: 'module_import' },
  { id: 'modimp:ranking->event', source: 'module:modules/ranking', target: 'module:modules/event', kind: 'module_import' },
  { id: 'modimp:misc->gacha', source: 'module:modules/misc', target: 'module:modules/gacha', kind: 'module_import' },
  { id: 'modimp:user_event_log->user', source: 'module:modules/user_event_log', target: 'module:modules/user', kind: 'module_import' },
  // 계층: root → core, modules
  { id: 'modimp:root->core', source: 'module:.', target: 'module:core', kind: 'module_import' },
  { id: 'modimp:root->modules', source: 'module:.', target: 'module:modules', kind: 'module_import' },
  { id: 'modimp:root->tests', source: 'module:.', target: 'module:tests', kind: 'module_import' },
  { id: 'modimp:root->alembic', source: 'module:.', target: 'module:alembic', kind: 'module_import' },
  // modules → sub-modules
  { id: 'modimp:modules->user', source: 'module:modules', target: 'module:modules/user', kind: 'module_import' },
  { id: 'modimp:modules->gacha', source: 'module:modules', target: 'module:modules/gacha', kind: 'module_import' },
  { id: 'modimp:modules->shop', source: 'module:modules', target: 'module:modules/shop', kind: 'module_import' },
  { id: 'modimp:modules->event', source: 'module:modules', target: 'module:modules/event', kind: 'module_import' },
  { id: 'modimp:modules->ranking', source: 'module:modules', target: 'module:modules/ranking', kind: 'module_import' },
  { id: 'modimp:modules->notice', source: 'module:modules', target: 'module:modules/notice', kind: 'module_import' },
  { id: 'modimp:modules->admin', source: 'module:modules', target: 'module:modules/admin', kind: 'module_import' },
  { id: 'modimp:modules->admin_auth', source: 'module:modules', target: 'module:modules/admin_auth', kind: 'module_import' },
  { id: 'modimp:modules->misc', source: 'module:modules', target: 'module:modules/misc', kind: 'module_import' },
  { id: 'modimp:modules->user_event_log', source: 'module:modules', target: 'module:modules/user_event_log', kind: 'module_import' },
];

// ─── File Imports (intra-module) ───
const fileEdges: GraphEdge[] = [
  // user: router → service → repository → models
  { id: 'fileimp:user:router->svc', source: 'file:modules/user/router.py', target: 'file:modules/user/service.py', kind: 'file_import' },
  { id: 'fileimp:user:svc->repo', source: 'file:modules/user/service.py', target: 'file:modules/user/repository.py', kind: 'file_import' },
  { id: 'fileimp:user:repo->models', source: 'file:modules/user/repository.py', target: 'file:modules/user/models.py', kind: 'file_import' },
  { id: 'fileimp:user:router->schemas', source: 'file:modules/user/router.py', target: 'file:modules/user/schemas.py', kind: 'file_import' },
  // gacha: router → service → repository → models
  { id: 'fileimp:gacha:router->svc', source: 'file:modules/gacha/router.py', target: 'file:modules/gacha/service.py', kind: 'file_import' },
  { id: 'fileimp:gacha:svc->repo', source: 'file:modules/gacha/service.py', target: 'file:modules/gacha/repository.py', kind: 'file_import' },
  { id: 'fileimp:gacha:repo->models', source: 'file:modules/gacha/repository.py', target: 'file:modules/gacha/models.py', kind: 'file_import' },
  // shop: service → user.repository, gacha.balpan_repository (cross-module file deps)
  { id: 'fileimp:shop:svc->repo', source: 'file:modules/shop/service.py', target: 'file:modules/shop/repository.py', kind: 'file_import' },
  { id: 'fileimp:shop:svc->user_repo', source: 'file:modules/shop/service.py', target: 'file:modules/user/repository.py', kind: 'file_import' },
  // core internal
  { id: 'fileimp:security->db', source: 'file:core/security.py', target: 'file:core/database.py', kind: 'file_import' },
  { id: 'fileimp:security->const', source: 'file:core/security.py', target: 'file:core/CONSTANTS.py', kind: 'file_import' },
  // user.router → core
  { id: 'fileimp:user:router->security', source: 'file:modules/user/router.py', target: 'file:core/security.py', kind: 'file_import' },
  { id: 'fileimp:user:router->db', source: 'file:modules/user/router.py', target: 'file:core/database.py', kind: 'file_import' },
  // gacha.router → core
  { id: 'fileimp:gacha:router->security', source: 'file:modules/gacha/router.py', target: 'file:core/security.py', kind: 'file_import' },
  { id: 'fileimp:gacha:router->exceptions', source: 'file:modules/gacha/router.py', target: 'file:core/exceptions.py', kind: 'file_import' },
  // main → modules
  { id: 'fileimp:main->user_router', source: 'file:main.py', target: 'file:modules/user/router.py', kind: 'file_import' },
  { id: 'fileimp:main->gacha_router', source: 'file:main.py', target: 'file:modules/gacha/router.py', kind: 'file_import' },
  { id: 'fileimp:main->shop_router', source: 'file:main.py', target: 'file:modules/shop/router.py', kind: 'file_import' },
];

// ─── Export ───
export const mockNodes: GraphNode[] = [...packages, ...modules, ...files];
export const mockEdges: GraphEdge[] = [...packageEdges, ...moduleEdges, ...fileEdges];

/**
 * Filter nodes/edges by depth
 */
export function getMockGraphByDepth(depth: 'packages' | 'modules' | 'files') {
  const edgeFilter = (edges: GraphEdge[], nodeIds: Set<string>) =>
    edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

  let selectedNodes: GraphNode[];
  let selectedEdges: GraphEdge[];

  switch (depth) {
    case 'packages':
      selectedNodes = [...packages, modules[0]]; // root module + packages
      selectedEdges = packageEdges;
      break;
    case 'modules':
      selectedNodes = [...packages, ...modules];
      selectedEdges = [...packageEdges, ...moduleEdges];
      break;
    case 'files':
      selectedNodes = [...packages, ...modules, ...files];
      selectedEdges = [...packageEdges, ...moduleEdges, ...fileEdges];
      break;
  }

  const ids = new Set(selectedNodes.map((n) => n.id));
  return {
    nodes: selectedNodes,
    edges: edgeFilter(selectedEdges, ids),
  };
}

/**
 * Mock expand module — return files belonging to a module
 */
export function getMockExpandModule(modulePath: string): { nodes: GraphNode[]; edges: GraphEdge[] } | null {
  const prefix = modulePath === '.' ? '' : `${modulePath}/`;

  const moduleFiles = files.filter((f) => {
    if (!f.path) return false;
    if (modulePath === '.') return !f.path.includes('/');
    return f.path.startsWith(prefix) && !f.path.slice(prefix.length).includes('/');
  });

  if (moduleFiles.length === 0) return null;

  const fileIds = new Set(moduleFiles.map((f) => f.id));
  const moduleId = `module:${modulePath}`;

  const relatedEdges = fileEdges.filter(
    (e) => fileIds.has(e.source) || fileIds.has(e.target),
  );

  // 모듈→파일 containment 엣지 추가
  const containmentEdges: GraphEdge[] = moduleFiles.map((f) => ({
    id: `contain:${moduleId}->${f.id}`,
    source: moduleId,
    target: f.id,
    kind: 'file_import' as const,
  }));

  return {
    nodes: moduleFiles,
    edges: [...containmentEdges, ...relatedEdges],
  };
}
