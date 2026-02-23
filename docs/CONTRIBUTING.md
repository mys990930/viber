# Contributing — 개발 가이드

> 이 문서를 읽으면 Viber의 아무 모듈이나 맡아서 구현할 수 있어야 한다.

---

## 1. 환경 셋업

### 필수 도구

| 도구 | 버전 | 설치 확인 |
|------|------|----------|
| Rust | stable (1.80+) | `rustc --version` |
| Node.js | 24+ | `node --version` |
| pnpm | 10+ | `pnpm --version` |
| Tauri CLI | 2.x | `pnpm tauri --version` |

### 처음 시작

```bash
cd viber/
pnpm install          # FE 의존성
cd src-tauri && cargo check   # BE 의존성 + 컴파일 확인
cd ..
```

### 실행

```bash
# 방법 1: 전체 앱 (네이티브 데스크톱 창)
pnpm tauri dev

# 방법 2: FE만 브라우저로 (BE 없이 UI 확인용)
pnpm dev
# → http://localhost:1420
```

### 빌드 확인 (커밋 전)

```bash
npx tsc --noEmit                   # FE 타입 체크
cd src-tauri && cargo check        # BE 타입 체크
```

---

## 2. 프로젝트 구조

```
viber/
├── docs/
│   ├── ROADMAP.md                 # Phase별 작업 목록
│   ├── ARCHITECTURE.md            # 전체 구조 + 디렉토리
│   ├── modules/backend/*.md       # BE 모듈 스펙
│   ├── modules/frontend/*.md      # FE 모듈 스펙
│   └── contracts/                 # 모듈 간 통신 규약
│       ├── be-be.md               # BE↔BE (이벤트 + 쿼리)
│       ├── fe-fe.md               # FE↔FE (selector + CSS class)
│       └── fe-be.md               # FE↔BE (command + event)
├── src/                           # Frontend (React + TypeScript)
│   ├── domains/{module}/          # 모듈별 디렉토리
│   ├── shared/types/              # FE↔BE 공유 타입
│   └── main.tsx
├── src-tauri/src/                 # Backend (Rust)
│   ├── domain/{module}/           # 도메인 모듈
│   ├── infra/{module}/            # 인프라 모듈 (watcher, parser, mcp)
│   └── shared/                    # 공유 (types, error, event)
└── PROJECT.md                     # 전체 인덱스
```

---

## 3. BE (Rust) 컨벤션

### 모듈 디렉토리 구조

```
src-tauri/src/domain/graph/
├── mod.rs          # pub mod 선언 + re-export
├── service.rs      # GraphService (핵심 로직)
├── commands.rs     # #[tauri::command] 함수들
└── types.rs        # 이 모듈 전용 타입 (선택)
```

### Service 패턴

```rust
// domain/graph/service.rs

use crate::shared::event::EventBus;
use crate::shared::types::*;
use crate::shared::error::ViberError;

pub struct GraphService {
    bus: EventBus,
    // ... 모듈 내부 상태
}

impl GraphService {
    pub fn new(bus: EventBus) -> Self {
        Self { bus }
    }

    pub fn get_graph(&self, depth: &str) -> Result<GraphData, ViberError> {
        // ...
    }
}
```

**규칙:**
- Service는 `EventBus`를 생성자에서 받음
- 상태 변경 후 `self.bus.emit(...)` 으로 이벤트 발행
- 다른 모듈의 데이터가 필요하면 **읽기 전용 쿼리** (→ `contracts/be-be.md`)
- 상태 변경 트리거는 **이벤트 구독**으로만

### Command 패턴

```rust
// domain/graph/commands.rs

use tauri::State;
use std::sync::Mutex;
use super::service::GraphService;
use crate::shared::error::ViberError;

// Tauri State는 Arc 래핑이므로 Mutex로 가변 접근
type GraphState = Mutex<GraphService>;

#[tauri::command]
pub fn graph_get(
    state: State<'_, GraphState>,
    depth: String,
) -> Result<serde_json::Value, ViberError> {
    let service = state.lock().map_err(|e| ViberError::Other(e.to_string()))?;
    let data = service.get_graph(&depth)?;
    Ok(serde_json::to_value(data).unwrap())
}
```

**규칙:**
- command 함수명: `{모듈}_{동작}` (e.g. `graph_get`, `project_open`)
- `State<'_, Mutex<XxxService>>` 로 서비스 접근
- 반환: `Result<T, ViberError>` (T는 Serialize)

### lib.rs 등록 패턴

```rust
// lib.rs
tauri::Builder::default()
    .manage(Mutex::new(GraphService::new(event_bus.clone())))
    .manage(Mutex::new(ProjectService::new(event_bus.clone())))
    .invoke_handler(tauri::generate_handler![
        domain::graph::commands::graph_get,
        domain::project::commands::project_open,
    ])
```

### FE로 이벤트 push

```rust
// BE 이벤트 → FE 이벤트 브릿지 (lib.rs 또는 별도 bridge.rs)
use tauri::Emitter;

// setup 콜백에서
let bus_rx = event_bus.subscribe();
let app_handle = app.handle().clone();
tokio::spawn(async move {
    let mut rx = bus_rx;
    while let Ok(event) = rx.recv().await {
        match &event {
            ViberEvent::GraphUpdated(diff) => {
                let _ = app_handle.emit("graph:updated", diff);
            }
            ViberEvent::GitStatusChanged(status) => {
                let _ = app_handle.emit("git:status_changed", status);
            }
            // ...
            _ => {}
        }
    }
});
```

### 네이밍

| 대상 | 규칙 | 예시 |
|------|------|------|
| 구조체 | PascalCase | `GraphService`, `FileEvent` |
| 함수 | snake_case | `get_graph`, `parse_imports` |
| 이벤트 enum | PascalCase variant | `ViberEvent::GraphUpdated` |
| FE push 이벤트명 | `{모듈}:{동작}` kebab | `graph:updated`, `git:status_changed` |
| command 함수명 | `{모듈}_{동작}` snake | `graph_get`, `project_open` |
| FE command 호출명 | `{모듈}:{동작}` kebab | `graph:get`, `project:open` |

> ⚠️ Tauri command 등록 시 함수명은 snake_case이지만, FE에서 invoke할 때는
> `invoke("graph_get", ...)` 으로 snake_case 그대로 호출.
> docs의 `graph:get` 표기는 개념적 이름이며, 실제 invoke 문자열은 snake_case.

### 에러 처리

```rust
// 항상 Result<T, ViberError> 반환
// 외부 에러는 From trait 또는 map_err로 변환
let file = std::fs::read_to_string(&path)
    .map_err(|_| ViberError::FileNotFound { path: path.display().to_string() })?;
```

---

## 4. FE (React + TypeScript) 컨벤션

### 모듈 디렉토리 구조

```
src/domains/graph/
├── components/
│   ├── GraphCanvas.tsx
│   └── GraphCanvas.module.css
├── hooks/
│   └── useGraph.ts
├── store.ts           # Zustand store
└── index.ts           # public export
```

### Store 패턴

```typescript
// domains/graph/store.ts
import { create } from 'zustand';

interface GraphStore {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNode: string | null;

  // 액션
  selectNode: (id: string | null) => void;
  applyDiff: (diff: GraphDiff) => void;
}

export const useGraphStore = create<GraphStore>((set) => ({
  nodes: [],
  edges: [],
  selectedNode: null,

  selectNode: (id) => set({ selectedNode: id }),
  applyDiff: (diff) => set((s) => {
    // ... immutable update
  }),
}));
```

**규칙:**
- 스토어명: `use{Module}Store`
- 다른 모듈 스토어 **직접 import 금지** — selector로 구독만 (→ `contracts/fe-fe.md`)

### Hook 패턴

```typescript
// domains/graph/hooks/useGraph.ts
import { useCallback } from 'react';
import { useTauriCommand, useTauriEvent } from '../../shell';
import { useGraphStore } from '../store';

export function useGraph() {
  const { invoke, loading, error } = useTauriCommand<GraphData>('graph_get');
  const applyDiff = useGraphStore((s) => s.applyDiff);

  // BE 이벤트 구독
  useTauriEvent<GraphDiff>('graph:updated', useCallback((diff) => {
    applyDiff(diff);
  }, [applyDiff]));

  const loadGraph = useCallback(async (depth: string) => {
    const data = await invoke({ depth });
    if (data) {
      // store 업데이트
    }
  }, [invoke]);

  return { loadGraph, loading, error };
}
```

### 컴포넌트 패턴

```typescript
// components/GraphCanvas.tsx
import styles from './GraphCanvas.module.css';
import { useGraph } from '../hooks/useGraph';

export function GraphCanvas() {
  const { loadGraph, loading } = useGraph();
  // ...
  return <div className={styles.canvas}>...</div>;
}
```

**규칙:**
- 스타일: CSS Modules (`*.module.css`)
- 컴포넌트: 함수형 (no class)
- export: named export (no default)
- shell hooks만 직접 import 가능 (`useTauriCommand`, `useTauriEvent`, `useUndoRedo`)

### 그래프 시각화 연동 (CSS Class 프로토콜)

다른 모듈이 그래프 시각에 영향을 주려면 class를 추가/제거한다:

```typescript
// flow 모듈이 그래프에 하이라이트 추가
const addNodeClass = useGraphStore((s) => s.addNodeClass);
addNodeClass('module-auth', 'flow-active');
```

각 모듈은 **자기 네임스페이스 class만** 조작:
- `flow-*`, `guardrail-*`, `git-*`, `score-*`

### 공유 타입

```
src/shared/types/
├── project.ts       ↔ BE shared/types.rs ProjectInfo, ViberConfig
├── graph.ts         ↔ BE GraphNode, GraphEdge, GraphDiff
├── ...
└── index.ts         # re-export
```

BE `types.rs`의 타입과 **필드명/구조를 1:1 대응** (camelCase로 변환됨 — serde가 처리).

### 네이밍

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase | `GraphCanvas.tsx` |
| Hook | camelCase, `use-` prefix | `useGraph.ts` |
| Store | `use{Module}Store` | `useGraphStore` |
| CSS Module | `{Component}.module.css` | `GraphCanvas.module.css` |
| 타입 | PascalCase | `GraphNode`, `FileEvent` |
| 이벤트 핸들러 | `on-` / `handle-` | `onNodeClick`, `handleSelect` |

---

## 5. 모듈 간 통신 규칙 요약

| 통신 | 규칙 | 상세 문서 |
|------|------|----------|
| BE → BE | 이벤트 발행 + 읽기 쿼리 | `contracts/be-be.md` |
| FE → FE | Zustand selector 구독 + CSS class | `contracts/fe-fe.md` |
| FE → BE | `invoke("command_name", params)` | `contracts/fe-be.md` |
| BE → FE | `app_handle.emit("event:name", payload)` | `contracts/fe-be.md` |

**금지 사항:**
- BE 모듈 간 직접 함수 호출로 상태 변경
- FE 모듈 간 직접 import (shell 제외)
- FE에서 다른 도메인의 command 직접 호출

---

## 6. 커밋 메시지

```
{type}({scope}): {description}

type: feat | fix | docs | refactor | test | chore
scope: phase-X-Y | module명 | 생략 가능

예시:
feat(phase-1a-1): ProjectService — open, config, .viber init
fix(graph): edge dedup on re-parse
docs: update ROADMAP Phase 1 checklist
refactor(shell): extract Toolbar slots
```

---

## 7. 참조 구현

> Phase 1 완료 후, `project` 모듈이 참조 구현이 된다.
> 새 모듈 작업 시 project의 BE service/command 패턴과 FE store/hook/component 패턴을 따른다.
>
> - BE 참조: `src-tauri/src/domain/project/`
> - FE 참조: `src/domains/project/`

---

## 8. 새 모듈 추가 체크리스트

### BE

- [ ] `src-tauri/src/domain/{module}/mod.rs` 생성
- [ ] `service.rs` — 핵심 로직, EventBus 주입
- [ ] `commands.rs` — `#[tauri::command]` 함수
- [ ] `lib.rs`에 `.manage()` + `generate_handler![]` 등록
- [ ] 이벤트 발행이 필요하면 `ViberEvent` enum에 variant 추가
- [ ] `cargo check` 통과

### FE

- [ ] `src/domains/{module}/` 디렉토리 생성
- [ ] `store.ts` — Zustand store
- [ ] `hooks/use{Module}.ts` — command 호출 + event 구독
- [ ] `components/` — UI 컴포넌트 + CSS Module
- [ ] `index.ts` — public export
- [ ] `shared/types/{module}.ts` — BE 대응 타입
- [ ] `npx tsc --noEmit` 통과
