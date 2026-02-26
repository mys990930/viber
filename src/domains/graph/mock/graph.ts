import type { GraphNode, GraphEdge } from '../../../shared/types/graph';
import type { GraphDepth } from '../../../shared/types/graph';

/**
 * Mock graph data for browser development (without Tauri backend)
 * Based on barber.io — FastAPI game backend (Python)
 *
 * 변경: modules 내부 cross-module 의존성 제거 (alembic으로 모델 집약 이전)
 *       alembic/ 폴더를 외부 의존성(infra)으로 취급
 */

// ─── Helper ───
const py = (_id: string, label: string, path: string): GraphNode => ({
  id: `file:${path}`, type: 'file', label, path, language: 'python',
});

// ─── Packages (외부 의존성 — 라이브러리 + infra 폴더) ───
const packages: GraphNode[] = [
  { id: 'package:fastapi', type: 'package', label: 'fastapi' },
  { id: 'package:sqlalchemy', type: 'package', label: 'sqlalchemy' },
  { id: 'package:jose', type: 'package', label: 'python-jose' },
  { id: 'package:google-auth', type: 'package', label: 'google-auth' },
  { id: 'package:pymysql', type: 'package', label: 'pymysql' },
  // alembic: 외부 라이브러리 기반 infra 폴더 → 패키지로 취급
  { id: 'package:alembic', type: 'package', label: 'alembic' },
];

// ─── Modules & Groups (디렉토리 구조) ───
const modules: GraphNode[] = [
  { id: 'module:.', type: 'module', label: 'barber.io', path: '.', language: 'python' },
  { id: 'module:core', type: 'module', label: 'core', path: 'core', language: 'python' },
  // modules/ — 직접 파일 없는 정리용 폴더 → group
  { id: 'module:modules', type: 'group', label: 'modules', path: 'modules', language: 'python' },
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
];

// ─── Files ───
const files: GraphNode[] = [
  // root
  py('main', 'main.py', 'main.py'),
  // core
  py('core:db', 'database.py', 'core/database.py'),
  py('core:security', 'security.py', 'core/security.py'),
  py('core:const', 'CONSTANTS.py', 'core/CONSTANTS.py'),
  py('core:exc', 'exceptions.py', 'core/exceptions.py'),
  py('core:misc', 'misc.py', 'core/misc.py'),
  py('core:log', 'logging_config.py', 'core/logging_config.py'),
  // user
  py('user:router', 'router.py', 'modules/user/router.py'),
  py('user:svc', 'service.py', 'modules/user/service.py'),
  py('user:repo', 'repository.py', 'modules/user/repository.py'),
  py('user:models', 'models.py', 'modules/user/models.py'),
  py('user:schemas', 'schemas.py', 'modules/user/schemas.py'),
  // gacha
  py('gacha:router', 'router.py', 'modules/gacha/router.py'),
  py('gacha:svc', 'service.py', 'modules/gacha/service.py'),
  py('gacha:repo', 'repository.py', 'modules/gacha/repository.py'),
  py('gacha:models', 'models.py', 'modules/gacha/models.py'),
  py('gacha:schemas', 'schemas.py', 'modules/gacha/schemas.py'),
  // shop
  py('shop:router', 'router.py', 'modules/shop/router.py'),
  py('shop:svc', 'service.py', 'modules/shop/service.py'),
  py('shop:repo', 'repository.py', 'modules/shop/repository.py'),
  py('shop:models', 'models.py', 'modules/shop/models.py'),
  py('shop:schemas', 'schemas.py', 'modules/shop/schemas.py'),
  // event
  py('event:svc', 'service.py', 'modules/event/service.py'),
  py('event:models', 'models.py', 'modules/event/models.py'),
  py('event:repo', 'repository.py', 'modules/event/repository.py'),
  py('event:schemas', 'schemas.py', 'modules/event/schemas.py'),
  // ranking
  py('ranking:router', 'router.py', 'modules/ranking/router.py'),
  py('ranking:svc', 'service.py', 'modules/ranking/service.py'),
  py('ranking:repo', 'repository.py', 'modules/ranking/repository.py'),
  py('ranking:schemas', 'schemas.py', 'modules/ranking/schemas.py'),
  // notice
  py('notice:router', 'router.py', 'modules/notice/router.py'),
  py('notice:svc', 'service.py', 'modules/notice/service.py'),
  py('notice:repo', 'repository.py', 'modules/notice/repository.py'),
  py('notice:models', 'models.py', 'modules/notice/models.py'),
  py('notice:schemas', 'schemas.py', 'modules/notice/schemas.py'),
  // admin
  py('admin:router', 'router.py', 'modules/admin/router.py'),
  py('admin:svc', 'service.py', 'modules/admin/service.py'),
  py('admin:schemas', 'schemas.py', 'modules/admin/schemas.py'),
  // admin_auth
  py('admin_auth:router', 'router.py', 'modules/admin_auth/router.py'),
  py('admin_auth:svc', 'service.py', 'modules/admin_auth/service.py'),
  py('admin_auth:schemas', 'schemas.py', 'modules/admin_auth/schemas.py'),
  // misc
  py('misc:router', 'router.py', 'modules/misc/router.py'),
  py('misc:svc', 'service.py', 'modules/misc/service.py'),
  // user_event_log
  py('uel:router', 'router.py', 'modules/user_event_log/router.py'),
  py('uel:svc', 'service.py', 'modules/user_event_log/service.py'),
  py('uel:repo', 'repository.py', 'modules/user_event_log/repository.py'),
  py('uel:models', 'models.py', 'modules/user_event_log/models.py'),
  // tests
  py('tests:conftest', 'conftest.py', 'tests/conftest.py'),
  py('tests:test_user', 'test_user.py', 'tests/test_user.py'),
  py('tests:test_gacha', 'test_gacha.py', 'tests/test_gacha.py'),
];

// ─── Package Dependencies ───
const packageEdges: GraphEdge[] = [
  { id: 'pkgdep:root->fastapi', source: 'module:.', target: 'package:fastapi', kind: 'package_dep' },
  { id: 'pkgdep:root->sqlalchemy', source: 'module:.', target: 'package:sqlalchemy', kind: 'package_dep' },
  { id: 'pkgdep:root->jose', source: 'module:.', target: 'package:jose', kind: 'package_dep' },
  { id: 'pkgdep:root->google-auth', source: 'module:.', target: 'package:google-auth', kind: 'package_dep' },
  { id: 'pkgdep:root->pymysql', source: 'module:.', target: 'package:pymysql', kind: 'package_dep' },
  { id: 'pkgdep:root->alembic', source: 'module:.', target: 'package:alembic', kind: 'package_dep' },
];

// ─── Module Imports ───
const moduleEdges: GraphEdge[] = [
  // 각 모듈 → core (독립적)
  { id: 'modimp:user->core', source: 'module:modules/user', target: 'module:core', kind: 'module_import' },
  { id: 'modimp:gacha->core', source: 'module:modules/gacha', target: 'module:core', kind: 'module_import' },
  { id: 'modimp:shop->core', source: 'module:modules/shop', target: 'module:core', kind: 'module_import' },
  { id: 'modimp:event->core', source: 'module:modules/event', target: 'module:core', kind: 'module_import' },
  { id: 'modimp:admin->core', source: 'module:modules/admin', target: 'module:core', kind: 'module_import' },
  { id: 'modimp:admin_auth->core', source: 'module:modules/admin_auth', target: 'module:core', kind: 'module_import' },
  { id: 'modimp:notice->core', source: 'module:modules/notice', target: 'module:core', kind: 'module_import' },
  { id: 'modimp:ranking->core', source: 'module:modules/ranking', target: 'module:core', kind: 'module_import' },
  { id: 'modimp:misc->core', source: 'module:modules/misc', target: 'module:core', kind: 'module_import' },
  { id: 'modimp:uel->core', source: 'module:modules/user_event_log', target: 'module:core', kind: 'module_import' },
  // 계층 구조 (contains — 디렉토리 포함 관계)
  { id: 'contains:root->core', source: 'module:.', target: 'module:core', kind: 'contains' },
  { id: 'contains:root->modules', source: 'module:.', target: 'module:modules', kind: 'contains' },
  { id: 'contains:root->tests', source: 'module:.', target: 'module:tests', kind: 'contains' },
  // modules → sub-modules (contains)
  { id: 'contains:modules->user', source: 'module:modules', target: 'module:modules/user', kind: 'contains' },
  { id: 'contains:modules->gacha', source: 'module:modules', target: 'module:modules/gacha', kind: 'contains' },
  { id: 'contains:modules->shop', source: 'module:modules', target: 'module:modules/shop', kind: 'contains' },
  { id: 'contains:modules->event', source: 'module:modules', target: 'module:modules/event', kind: 'contains' },
  { id: 'contains:modules->ranking', source: 'module:modules', target: 'module:modules/ranking', kind: 'contains' },
  { id: 'contains:modules->notice', source: 'module:modules', target: 'module:modules/notice', kind: 'contains' },
  { id: 'contains:modules->admin', source: 'module:modules', target: 'module:modules/admin', kind: 'contains' },
  { id: 'contains:modules->admin_auth', source: 'module:modules', target: 'module:modules/admin_auth', kind: 'contains' },
  { id: 'contains:modules->misc', source: 'module:modules', target: 'module:modules/misc', kind: 'contains' },
  { id: 'contains:modules->user_event_log', source: 'module:modules', target: 'module:modules/user_event_log', kind: 'contains' },
  // cross-module 의존성 없음 — alembic이 모델 집약 담당 (외부 패키지로 표시)
];

// ─── File Imports ───
const fileEdges: GraphEdge[] = [
  // user: layered (모듈 내부만)
  { id: 'fi:user:r->s', source: 'file:modules/user/router.py', target: 'file:modules/user/service.py', kind: 'file_import' },
  { id: 'fi:user:s->rp', source: 'file:modules/user/service.py', target: 'file:modules/user/repository.py', kind: 'file_import' },
  { id: 'fi:user:rp->m', source: 'file:modules/user/repository.py', target: 'file:modules/user/models.py', kind: 'file_import' },
  { id: 'fi:user:r->sc', source: 'file:modules/user/router.py', target: 'file:modules/user/schemas.py', kind: 'file_import' },
  // gacha
  { id: 'fi:gacha:r->s', source: 'file:modules/gacha/router.py', target: 'file:modules/gacha/service.py', kind: 'file_import' },
  { id: 'fi:gacha:s->rp', source: 'file:modules/gacha/service.py', target: 'file:modules/gacha/repository.py', kind: 'file_import' },
  { id: 'fi:gacha:rp->m', source: 'file:modules/gacha/repository.py', target: 'file:modules/gacha/models.py', kind: 'file_import' },
  { id: 'fi:gacha:r->sc', source: 'file:modules/gacha/router.py', target: 'file:modules/gacha/schemas.py', kind: 'file_import' },
  // shop (모듈 내부만 — cross-module 의존성 제거됨)
  { id: 'fi:shop:r->s', source: 'file:modules/shop/router.py', target: 'file:modules/shop/service.py', kind: 'file_import' },
  { id: 'fi:shop:s->rp', source: 'file:modules/shop/service.py', target: 'file:modules/shop/repository.py', kind: 'file_import' },
  { id: 'fi:shop:rp->m', source: 'file:modules/shop/repository.py', target: 'file:modules/shop/models.py', kind: 'file_import' },
  // event
  { id: 'fi:event:s->rp', source: 'file:modules/event/service.py', target: 'file:modules/event/repository.py', kind: 'file_import' },
  { id: 'fi:event:rp->m', source: 'file:modules/event/repository.py', target: 'file:modules/event/models.py', kind: 'file_import' },
  // ranking
  { id: 'fi:rank:r->s', source: 'file:modules/ranking/router.py', target: 'file:modules/ranking/service.py', kind: 'file_import' },
  { id: 'fi:rank:s->rp', source: 'file:modules/ranking/service.py', target: 'file:modules/ranking/repository.py', kind: 'file_import' },
  // notice
  { id: 'fi:notice:r->s', source: 'file:modules/notice/router.py', target: 'file:modules/notice/service.py', kind: 'file_import' },
  { id: 'fi:notice:s->rp', source: 'file:modules/notice/service.py', target: 'file:modules/notice/repository.py', kind: 'file_import' },
  { id: 'fi:notice:rp->m', source: 'file:modules/notice/repository.py', target: 'file:modules/notice/models.py', kind: 'file_import' },
  // admin
  { id: 'fi:admin:r->s', source: 'file:modules/admin/router.py', target: 'file:modules/admin/service.py', kind: 'file_import' },
  // admin_auth
  { id: 'fi:admin_auth:r->s', source: 'file:modules/admin_auth/router.py', target: 'file:modules/admin_auth/service.py', kind: 'file_import' },
  // misc
  { id: 'fi:misc:r->s', source: 'file:modules/misc/router.py', target: 'file:modules/misc/service.py', kind: 'file_import' },
  // user_event_log
  { id: 'fi:uel:r->s', source: 'file:modules/user_event_log/router.py', target: 'file:modules/user_event_log/service.py', kind: 'file_import' },
  { id: 'fi:uel:s->rp', source: 'file:modules/user_event_log/service.py', target: 'file:modules/user_event_log/repository.py', kind: 'file_import' },
  { id: 'fi:uel:rp->m', source: 'file:modules/user_event_log/repository.py', target: 'file:modules/user_event_log/models.py', kind: 'file_import' },
  // core internal
  { id: 'fi:sec->db', source: 'file:core/security.py', target: 'file:core/database.py', kind: 'file_import' },
  { id: 'fi:sec->const', source: 'file:core/security.py', target: 'file:core/CONSTANTS.py', kind: 'file_import' },
  // 각 router → core (database, security)
  { id: 'fi:user:r->sec', source: 'file:modules/user/router.py', target: 'file:core/security.py', kind: 'file_import' },
  { id: 'fi:user:r->db', source: 'file:modules/user/router.py', target: 'file:core/database.py', kind: 'file_import' },
  { id: 'fi:gacha:r->sec', source: 'file:modules/gacha/router.py', target: 'file:core/security.py', kind: 'file_import' },
  { id: 'fi:gacha:r->exc', source: 'file:modules/gacha/router.py', target: 'file:core/exceptions.py', kind: 'file_import' },
  { id: 'fi:shop:r->sec', source: 'file:modules/shop/router.py', target: 'file:core/security.py', kind: 'file_import' },
  { id: 'fi:rank:r->db', source: 'file:modules/ranking/router.py', target: 'file:core/database.py', kind: 'file_import' },
  // main → routers
  { id: 'fi:main->user_r', source: 'file:main.py', target: 'file:modules/user/router.py', kind: 'file_import' },
  { id: 'fi:main->gacha_r', source: 'file:main.py', target: 'file:modules/gacha/router.py', kind: 'file_import' },
  { id: 'fi:main->shop_r', source: 'file:main.py', target: 'file:modules/shop/router.py', kind: 'file_import' },
  { id: 'fi:main->rank_r', source: 'file:main.py', target: 'file:modules/ranking/router.py', kind: 'file_import' },
  { id: 'fi:main->notice_r', source: 'file:main.py', target: 'file:modules/notice/router.py', kind: 'file_import' },
  { id: 'fi:main->admin_r', source: 'file:main.py', target: 'file:modules/admin/router.py', kind: 'file_import' },
  { id: 'fi:main->misc_r', source: 'file:main.py', target: 'file:modules/misc/router.py', kind: 'file_import' },
  // tests → core
  { id: 'fi:conftest->db', source: 'file:tests/conftest.py', target: 'file:core/database.py', kind: 'file_import' },
];

// ─── Export ───
export const mockNodes: GraphNode[] = [...packages, ...modules, ...files];
export const mockEdges: GraphEdge[] = [...packageEdges, ...moduleEdges, ...fileEdges];

/**
 * Filter nodes/edges by depth (modules 기본, files depth는 lazy loading으로 대체)
 */
export function getMockGraphByDepth(depth: GraphDepth) {
  const edgeFilter = (edges: GraphEdge[], nodeIds: Set<string>) =>
    edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

  let selectedNodes: GraphNode[];
  let selectedEdges: GraphEdge[];

  switch (depth) {
    case 'packages':
      selectedNodes = [...packages, modules[0]];
      selectedEdges = packageEdges;
      break;
    case 'modules':
    default:
      selectedNodes = [...packages, ...modules];
      selectedEdges = [...packageEdges, ...moduleEdges];
      break;
  }

  const ids = new Set(selectedNodes.map((n) => n.id));
  return {
    nodes: selectedNodes,
    edges: edgeFilter(selectedEdges, ids),
  };
}

/**
 * Mock expand module — return files belonging to a module (lazy loading)
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

  const containmentEdges: GraphEdge[] = moduleFiles.map((f) => ({
    id: `contain:${moduleId}->${f.id}`,
    source: moduleId,
    target: f.id,
    kind: 'module_import' as const,
  }));

  return {
    nodes: moduleFiles,
    edges: [...containmentEdges, ...relatedEdges],
  };
}
