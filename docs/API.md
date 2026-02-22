# API Design — Frontend ↔ Backend 통신 스펙

> Tauri IPC (invoke/command) + Tauri Event (push) 기반.
> 모든 통신은 도메인별로 네임스페이스 분리.

---

## 통신 방식

| 방식 | 방향 | 용도 |
|------|------|------|
| **Tauri Command** (`invoke`) | Frontend → Backend | 요청/응답 (조회, 액션) |
| **Tauri Event** (`emit/listen`) | Backend → Frontend | 실시간 푸시 (변경, 알림) |

```
Frontend                          Backend (Rust)
   │                                  │
   │── invoke("graph:get") ──────────→│  Command (req/res)
   │←──────────── result ─────────────│
   │                                  │
   │←── listen("graph:updated") ──────│  Event (push)
   │←── listen("guardrail:violation")─│
```

---

## 네이밍 규칙

- Command: `{domain}:{action}` (e.g. `graph:get`, `git:commit`)
- Event: `{domain}:{event_name}` (e.g. `graph:updated`, `guardrail:violation`)
- 모든 payload는 JSON (serde_json ↔ TypeScript 타입)

---

## 1. Project 도메인

### Commands

```typescript
// 프로젝트 열기
invoke('project:open', { path: string })
  → { name: string, root: string, languages: Language[], config: ViberConfig }

// 프로젝트 닫기
invoke('project:close')
  → void

// 설정 조회
invoke('project:get_config')
  → ViberConfig

// 설정 변경
invoke('project:update_config', { config: Partial<ViberConfig> })
  → ViberConfig

// 최근 프로젝트 목록
invoke('project:recent')
  → { path: string, name: string, lastOpened: string }[]
```

### Events

```typescript
listen('project:file_changed', (event: FileEvent) => void)
// { path: string, kind: 'create' | 'modify' | 'delete' | 'rename', timestamp: number }
```

---

## 2. Graph 도메인

### Commands

```typescript
// 그래프 조회 (깊이별)
invoke('graph:get', { depth: 'packages' | 'modules' | 'files' })
  → {
      nodes: GraphNode[],
      edges: GraphEdge[],
    }

// GraphNode:
// { id: string, type: 'package' | 'module' | 'file', label: string, path?: string, language?: Language }

// GraphEdge:
// { id: string, source: string, target: string, kind: 'package_dep' | 'module_import' | 'file_import' }

// 모듈 드릴다운 (모듈 내부 파일 그래프)
invoke('graph:drill_down', { moduleId: string })
  → { nodes: GraphNode[], edges: GraphEdge[] }

// 간선 심볼 조회 (지연 로딩 — L3)
invoke('graph:edge_symbols', { edgeId: string })
  → { symbols: Symbol[] }

// Symbol:
// { name: string, kind: 'function' | 'class' | 'variable' | 'type' | 'interface', line: number }

// 노드 상세
invoke('graph:node_detail', { nodeId: string })
  → {
      id: string,
      path: string,
      language: Language,
      imports: ImportInfo[],
      exports: Symbol[],
      loc: number,              // lines of code
    }
```

### Events

```typescript
listen('graph:updated', (event: GraphDiff) => void)
// GraphDiff:
// {
//   addedNodes: GraphNode[],
//   removedNodes: string[],       // node ids
//   addedEdges: GraphEdge[],
//   removedEdges: string[],       // edge ids
//   updatedNodes: GraphNode[],    // 변경된 노드 (내용 변경)
// }
```

---

## 3. Flow 도메인

### Commands

```typescript
// 플로우 추적 시작
invoke('flow:trace', { moduleId: string, symbol: string })
  → FlowTrace

// FlowTrace:
// {
//   id: string,
//   entry: { module: string, symbol: string },
//   forwardPath: FlowStep[],     // 순방향
//   returnPath: FlowStep[],      // 복귀
// }

// FlowStep:
// { nodeId: string, symbol?: string, callSite?: { file: string, line: number } }

// 즐겨찾기 목록
invoke('flow:bookmarks')
  → FlowBookmark[]

// FlowBookmark:
// { id: string, name: string, entry: { module: string, symbol: string }, createdAt: string }

// 즐겨찾기 추가
invoke('flow:add_bookmark', { name: string, flowId: string })
  → FlowBookmark

// 즐겨찾기 삭제
invoke('flow:remove_bookmark', { id: string })
  → void

// 엔트리 포인트 후보 목록 (자동완성용)
invoke('flow:entry_candidates', { query: string })
  → { moduleId: string, symbol: string, path: string }[]
```

---

## 4. Git 도메인

### Commands

```typescript
// Git 상태 조회
invoke('git:status')
  → {
      branch: string,
      ahead: number,
      behind: number,
      staged: string[],
      modified: string[],
      untracked: string[],
    }

// 커밋
invoke('git:commit', {
  message?: string,             // null이면 AI 생성
  paths?: string[],             // null이면 전체 staged
  push?: boolean,
})
  → { hash: string, message: string }

// AI 커밋 메시지 생성 (미리보기)
invoke('git:generate_message', { paths?: string[] })
  → { message: string }

// 스테이징
invoke('git:stage', { paths: string[] })
  → void

invoke('git:unstage', { paths: string[] })
  → void

// 브랜치
invoke('git:branches')
  → { name: string, current: boolean, lastCommit: string }[]

invoke('git:create_branch', { name: string, checkout?: boolean })
  → void

invoke('git:checkout', { branch: string })
  → void

// Diff impact (변경 → 영향 모듈/플로우)
invoke('git:diff_impact', {
  source?: 'working' | 'staged' | string,  // string = commit hash
  target?: string,                          // commit hash
})
  → {
      changedFiles: string[],
      affectedModules: string[],            // module ids
      affectedFlows: string[],              // flow ids (북마크된 것 중)
    }

// 타임라인
invoke('git:timeline', { limit?: number })
  → {
      commits: CommitInfo[],
      branches: BranchInfo[],
    }

// CommitInfo:
// { hash: string, message: string, author: string, timestamp: string, changedFiles: string[] }
// BranchInfo:
// { name: string, head: string, mergeBase?: string }
```

### Events

```typescript
listen('git:status_changed', (event: GitStatus) => void)
```

---

## 5. Guardrail 도메인

### Commands

```typescript
// 스코프 목록
invoke('guardrail:scopes')
  → GuardrailScope[]

// GuardrailScope:
// { id: string, name: string, moduleIds: string[], paths: string[] }

// 스코프 생성
invoke('guardrail:create_scope', {
  name: string,
  moduleIds: string[],
})
  → GuardrailScope

// 스코프 수정
invoke('guardrail:update_scope', {
  id: string,
  name?: string,
  moduleIds?: string[],
})
  → GuardrailScope

// 스코프 삭제
invoke('guardrail:delete_scope', { id: string })
  → void

// 위반 목록 (미처리)
invoke('guardrail:violations')
  → Violation[]

// Violation:
// { id: string, scopeId: string, file: string, changeKind: string, timestamp: string }

// Revert
invoke('guardrail:revert', { violationId: string })
  → { success: boolean }

// 위반 무시
invoke('guardrail:dismiss', { violationId: string })
  → void
```

### Events

```typescript
listen('guardrail:violation', (event: Violation) => void)
// 스코프 밖 변경 발생 시 즉시 push
```

---

## 6. Score 도메인

### Commands

```typescript
// 현재 점수 조회
invoke('score:get')
  → {
      overall: number,           // 0-100
      metrics: {
        singleResponsibility: number,
        dependencyInversion: number,
        circularDependencies: { modules: string[] }[],
        coupling: number,
        cohesion: number,
      }
    }

// 모듈별 점수
invoke('score:module', { moduleId: string })
  → {
      moduleId: string,
      score: number,
      issues: string[],          // 개선 제안
    }
```

### Events

```typescript
listen('score:updated', (event: HealthScore) => void)
// 그래프 변경 후 재계산 시 push
```

---

## 7. Context 도메인

### Commands

```typescript
// 컨텍스트 팩 생성
invoke('context:generate', {
  moduleIds: string[],
  flowId?: string,
  format: 'markdown' | 'prompt',
  maxTokens?: number,
})
  → {
      content: string,
      tokenEstimate: number,
      includedModules: string[],
    }

// 클립보드에 복사 (Tauri clipboard API)
invoke('context:copy', { content: string })
  → void
```

---

## 8. Layout (뷰 상태 저장)

### Commands

```typescript
// 레이아웃 저장 (.viber/layout.json)
invoke('layout:save', {
  depth: 'packages' | 'modules' | 'files',
  positions: { [nodeId: string]: { x: number, y: number } },
  zoom: number,
  pan: { x: number, y: number },
})
  → void

// 레이아웃 로드
invoke('layout:load', { depth: 'packages' | 'modules' | 'files' })
  → {
      positions: { [nodeId: string]: { x: number, y: number } } | null,
      zoom: number,
      pan: { x: number, y: number },
    } | null
```

---

## 에러 처리

모든 command는 Rust 측에서 `Result<T, ViberError>` 반환.
프론트에서는 invoke가 reject되면 에러 객체 수신.

```typescript
// 공통 에러 형태
interface ViberError {
  code: string;            // e.g. 'PROJECT_NOT_OPEN', 'GIT_CONFLICT'
  message: string;
  domain: string;          // e.g. 'git', 'graph'
}
```

```rust
// shared/error.rs
#[derive(Debug, thiserror::Error, Serialize)]
pub enum ViberError {
    #[error("Project not open")]
    ProjectNotOpen,
    #[error("File not found: {path}")]
    FileNotFound { path: String },
    #[error("Git error: {message}")]
    GitError { message: String },
    #[error("Parser error: {message}")]
    ParserError { message: String },
    #[error("Scope not found: {id}")]
    ScopeNotFound { id: String },
}
```

---

## MCP 서버 (에이전트 연동)

MCP 서버는 위 command들을 **동일한 이름과 파라미터**로 MCP tool로 노출.

```json
{
  "tools": [
    { "name": "graph_get",         "params": { "depth": "modules" } },
    { "name": "graph_edge_symbols","params": { "edgeId": "..." } },
    { "name": "flow_trace",        "params": { "moduleId": "...", "symbol": "..." } },
    { "name": "git_commit",        "params": { "message": "...", "push": true } },
    { "name": "git_diff_impact",   "params": { "source": "working" } },
    { "name": "guardrail_check",   "params": { "scopeId": "..." } },
    { "name": "context_generate",  "params": { "moduleIds": [...], "format": "prompt" } },
    { "name": "score_get",         "params": {} }
  ]
}
```

에이전트는 MCP를 통해 UI와 **완전히 동일한 기능**을 사용.
