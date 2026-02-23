# Contract: Frontend ↔ Backend 통신 규약

> 모든 통신은 Tauri IPC 기반. Command(invoke) = 요청-응답, Event(emit/listen) = 실시간 push.
> **각 FE 모듈은 자기 도메인의 command만 호출. 다른 도메인 command 직접 호출 금지.**

---

## project

### Commands (FE → BE)
| Command | Params | Response |
|---------|--------|----------|
| `project:open` | `{ path: string }` | `ProjectInfo` |
| `project:close` | — | `void` |
| `project:get_config` | — | `ViberConfig` |
| `project:update_config` | `{ config: Partial<ViberConfig> }` | `ViberConfig` |
| `project:recent` | — | `RecentProject[]` |

### Events (BE → FE)
| Event | Payload |
|-------|---------|
| `project:file_changed` | `FileEvent` |

---

## graph

### Commands (FE → BE)
| Command | Params | Response |
|---------|--------|----------|
| `graph:get` | `{ depth: 'packages' \| 'modules' \| 'files' }` | `{ nodes, edges }` |
| `graph:drill_down` | `{ moduleId: string }` | `{ nodes, edges }` |
| `graph:edge_symbols` | `{ edgeId: string }` | `{ symbols: Symbol[] }` |
| `graph:node_detail` | `{ nodeId: string }` | `NodeDetail` |

### Events (BE → FE)
| Event | Payload |
|-------|---------|
| `graph:updated` | `GraphDiff` |

---

## flow

### Commands (FE → BE)
| Command | Params | Response |
|---------|--------|----------|
| `flow:trace` | `{ moduleId: string, symbol: string }` | `FlowTrace` |
| `flow:entry_candidates` | `{ query: string }` | `EntryCandidate[]` |
| `flow:bookmarks` | — | `FlowBookmark[]` |
| `flow:add_bookmark` | `{ name: string, flowId: string }` | `FlowBookmark` |
| `flow:remove_bookmark` | `{ id: string }` | `void` |

### Events (BE → FE)
없음

---

## git

### Commands (FE → BE)
| Command | Params | Response |
|---------|--------|----------|
| `git:status` | — | `GitStatus` |
| `git:stage` | `{ paths: string[] }` | `void` |
| `git:unstage` | `{ paths: string[] }` | `void` |
| `git:commit` | `{ message?: string, paths?: string[], push?: boolean }` | `CommitResult` |
| `git:branches` | — | `BranchInfo[]` |
| `git:create_branch` | `{ name: string, checkout?: boolean }` | `void` |
| `git:checkout` | `{ branch: string }` | `void` |
| `git:generate_message` | `{ paths?: string[] }` | `{ message: string }` |
| `git:diff_impact` | `{ source?: string, target?: string }` | `DiffImpact` |
| `git:timeline` | `{ limit?: number }` | `GitTimeline` |

### Events (BE → FE)
| Event | Payload |
|-------|---------|
| `git:status_changed` | `GitStatus` |

---

## guardrail

### Commands (FE → BE)
| Command | Params | Response |
|---------|--------|----------|
| `guardrail:scopes` | — | `GuardrailScope[]` |
| `guardrail:create_scope` | `{ name: string, moduleIds: string[] }` | `GuardrailScope` |
| `guardrail:update_scope` | `{ id: string, name?: string, moduleIds?: string[] }` | `GuardrailScope` |
| `guardrail:delete_scope` | `{ id: string }` | `void` |
| `guardrail:violations` | — | `Violation[]` |
| `guardrail:revert` | `{ violationId: string }` | `{ success: boolean }` |
| `guardrail:dismiss` | `{ violationId: string }` | `void` |

### Events (BE → FE)
| Event | Payload |
|-------|---------|
| `guardrail:violation` | `Violation` |

---

## score

### Commands (FE → BE)
| Command | Params | Response |
|---------|--------|----------|
| `score:get` | — | `HealthScore` |
| `score:module` | `{ moduleId: string }` | `ModuleScore` |

### Events (BE → FE)
| Event | Payload |
|-------|---------|
| `score:updated` | `HealthScore` |

---

## context

### Commands (FE → BE)
| Command | Params | Response |
|---------|--------|----------|
| `context:generate` | `{ moduleIds: string[], flowId?: string, format: 'markdown' \| 'prompt', maxTokens?: number }` | `ContextPack` |
| `context:copy` | `{ content: string }` | `void` |

### Events (BE → FE)
없음

---

## layout

### Commands (FE → BE)
| Command | Params | Response |
|---------|--------|----------|
| `layout:save` | `{ depth, positions, zoom, pan }` | `void` |
| `layout:load` | `{ depth }` | `LayoutState \| null` |

### Events (BE → FE)
없음

---

## mcp

### Commands (FE → BE)
| Command | Params | Response |
|---------|--------|----------|
| `mcp:start` | — | `{ port?: number }` |
| `mcp:stop` | — | `void` |
| `mcp:status` | — | `McpStatus` |

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
