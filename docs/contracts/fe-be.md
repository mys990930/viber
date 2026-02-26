# Contract: Frontend ↔ Backend 통신 규약

> 모든 통신은 Tauri IPC 기반. Command(invoke) = 요청-응답, Event(emit/listen) = 실시간 push.
> **각 FE 모듈은 자기 도메인의 command만 호출. 다른 도메인 command 직접 호출 금지.**

---

## project

### Commands (FE → BE)
| Command | Params | Response |
|---------|--------|----------|
| `project_open` | `{ path: string }` | `ProjectInfo` |
| `project_close` | — | `void` |
| `project_get_config` | — | `ViberConfig` |
| `project_update_config` | `{ config: Partial<ViberConfig> }` | `ViberConfig` |
| `project_recent` | — | `RecentProject[]` |

### Events (BE → FE)
| Event | Payload |
|-------|---------|
| `project:file_changed` | `FileEvent` |

---

## graph

### Commands (FE → BE)
| Command | Params | Response |
|---------|--------|----------|
| `graph_get` | `{ depth: 'packages' \| 'modules' }` | `{ nodes, edges }` |
| `graph_expand_module` | `{ modulePath: string }` | `{ nodes: GraphNode[], edges: GraphEdge[] }` |
| `graph_collapse_module` | `{ modulePath: string }` | `void` |
| `graph_edge_symbols` | `{ edgeId: string }` | `{ symbols: Symbol[] }` |
| `graph_node_detail` | `{ nodeId: string }` | `NodeDetail` |

### Events (BE → FE)
| Event | Payload |
|-------|---------|
| `graph:changed` | `void` (시그널만, FE가 graph_get으로 재요청) |

### Lazy Loading 흐름

```
1. 초기 로드: graph_get({ depth: 'modules' })
   → 모듈 노드 + 모듈 간 의존성 엣지만 반환

2. 모듈 더블클릭: graph_expand_module({ modulePath: 'modules/user' })
   → 해당 모듈 내 파일 노드 + 파일 간 import 엣지 반환
   → FE가 기존 그래프에 cy.add()로 추가
   → 확장된 모듈 노드에 'expanded' CSS class 부여

3. 확장된 모듈 다시 더블클릭: graph_collapse_module({ modulePath: 'modules/user' })
   → FE가 해당 모듈의 파일 노드/엣지를 cy.remove()
   → 'expanded' class 제거

주의: files depth는 제거. 항상 modules 기반 + 선택적 확장.
```

---

## flow

### Commands (FE → BE)
| Command | Params | Response |
|---------|--------|----------|
| `flow_trace` | `{ moduleId: string, symbol: string }` | `FlowTrace` |
| `flow_entry_candidates` | `{ query: string }` | `EntryCandidate[]` |
| `flow_bookmarks` | — | `FlowBookmark[]` |
| `flow_add_bookmark` | `{ name: string, flowId: string }` | `FlowBookmark` |
| `flow_remove_bookmark` | `{ id: string }` | `void` |

### Events (BE → FE)
없음

---

## git

### Commands (FE → BE)
| Command | Params | Response |
|---------|--------|----------|
| `git_status` | — | `GitStatus` |
| `git_stage` | `{ paths: string[] }` | `void` |
| `git_unstage` | `{ paths: string[] }` | `void` |
| `git_commit` | `{ message?: string, paths?: string[], push?: boolean }` | `CommitResult` |
| `git_branches` | — | `BranchInfo[]` |
| `git_create_branch` | `{ name: string, checkout?: boolean }` | `void` |
| `git_checkout` | `{ branch: string }` | `void` |
| `git_generate_message` | `{ paths?: string[] }` | `{ message: string }` |
| `git_diff_impact` | `{ source?: string, target?: string }` | `DiffImpact` |
| `git_timeline` | `{ limit?: number }` | `GitTimeline` |

### Events (BE → FE)
| Event | Payload |
|-------|---------|
| `git:status_changed` | `GitStatus` |

---

## guardrail

### Commands (FE → BE)
| Command | Params | Response |
|---------|--------|----------|
| `guardrail_scopes` | — | `GuardrailScope[]` |
| `guardrail_create_scope` | `{ name: string, moduleIds: string[] }` | `GuardrailScope` |
| `guardrail_update_scope` | `{ id: string, name?: string, moduleIds?: string[] }` | `GuardrailScope` |
| `guardrail_delete_scope` | `{ id: string }` | `void` |
| `guardrail_violations` | — | `Violation[]` |
| `guardrail_revert` | `{ violationId: string }` | `{ success: boolean }` |
| `guardrail_dismiss` | `{ violationId: string }` | `void` |

### Events (BE → FE)
| Event | Payload |
|-------|---------|
| `guardrail:violation` | `Violation` |

---

## score

### Commands (FE → BE)
| Command | Params | Response |
|---------|--------|----------|
| `score_get` | — | `HealthScore` |
| `score_module` | `{ moduleId: string }` | `ModuleScore` |

### Events (BE → FE)
| Event | Payload |
|-------|---------|
| `score:updated` | `HealthScore` |

---

## context

### Commands (FE → BE)
| Command | Params | Response |
|---------|--------|----------|
| `context_generate` | `{ moduleIds: string[], flowId?: string, format: 'markdown' \| 'prompt', maxTokens?: number }` | `ContextPack` |
| `context_copy` | `{ content: string }` | `void` |

### Events (BE → FE)
없음

---

## layout

### Commands (FE → BE)
| Command | Params | Response |
|---------|--------|----------|
| `layout_save` | `{ depth, positions, zoom, pan }` | `void` |
| `layout_load` | `{ depth }` | `LayoutState \| null` |

### Events (BE → FE)
없음

---

## mcp

### Commands (FE → BE)
| Command | Params | Response |
|---------|--------|----------|
| `mcp_start` | — | `{ port?: number }` |
| `mcp_stop` | — | `void` |
| `mcp_status` | — | `McpStatus` |

### Events (BE → FE)
없음

---

## 에러 형식

모든 command 에러는 동일 형태:

```typescript
interface ViberError {
  code: string;        // e.g. 'PROJECT_NOT_OPEN', 'GIT_CONFLICT'
  message: string;
  domain: string;      // e.g. 'git', 'graph'
}
```

---

## 타입 공유

FE와 BE가 동일한 타입을 사용해야 하므로, `shared/types/` 에 TypeScript 타입을 정의하고 BE의 Rust 타입과 1:1 대응을 유지한다.

```
src/shared/types/
├── project.ts      ↔ domain/project/ 타입
├── graph.ts        ↔ domain/graph/ 타입
├── flow.ts         ↔ domain/flow/ 타입
├── git.ts          ↔ domain/git/ 타입
├── guardrail.ts    ↔ domain/guardrail/ 타입
├── score.ts        ↔ domain/score/ 타입
├── context.ts      ↔ domain/context/ 타입
└── index.ts        ↔ re-export
```
