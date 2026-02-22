# Architecture — 전체 구조 + DDD 도메인 맵

---

## 앱 구조

```
┌──────────────────────────────────────────────────┐
│           React + Cytoscape.js + Framer Motion    │  ← 프론트엔드
│           (TypeScript, Vite, Zustand)             │
└────────────────────┬─────────────────────────────┘
                     │ Tauri IPC (invoke) + Event (push)
┌────────────────────┴─────────────────────────────┐
│               Rust Backend (Tauri)                │  ← daemon
│                                                   │
│  domain/     infra/         shared/               │
│  ├─project   ├─watcher      ├─types.rs            │
│  ├─graph     ├─parser        ├─error.rs            │
│  ├─flow      │ ├─python      └─event.rs            │
│  ├─git       │ ├─typescript                       │
│  ├─guardrail │ ├─csharp                           │
│  ├─score     │ └─dart                             │
│  └─context   └─mcp                               │
└──────────────────────────────────────────────────┘
```

---

## 백엔드 디렉토리

```
src-tauri/src/
├── main.rs
├── lib.rs                      # Tauri 빌더 + command 등록
├── domain/
│   ├── project/
│   │   ├── mod.rs              # ProjectService
│   │   └── config.rs           # ViberConfig, .viber/ 관리
│   ├── graph/
│   │   ├── mod.rs              # GraphService (petgraph)
│   │   ├── builder.rs          # 파서 결과 → 그래프 빌드
│   │   └── diff.rs             # GraphDiff 계산
│   ├── flow/
│   │   ├── mod.rs              # FlowService
│   │   ├── tracer.rs           # DFS/BFS 호출 체인 추적
│   │   └── bookmark.rs         # 즐겨찾기 CRUD
│   ├── git/
│   │   ├── mod.rs              # GitService (git2-rs)
│   │   ├── commit.rs           # 커밋/스테이징
│   │   ├── branch.rs           # 브랜치 관리
│   │   ├── impact.rs           # DiffImpact 계산
│   │   └── llm.rs              # AI 커밋 메시지
│   ├── guardrail/
│   │   ├── mod.rs              # GuardrailService
│   │   ├── scope.rs            # 스코프 정의
│   │   └── violation.rs        # 위반 감지 + revert
│   ├── score/
│   │   ├── mod.rs              # ScoreService
│   │   └── metrics.rs          # SOLID 메트릭 계산
│   └── context/
│       ├── mod.rs              # ContextService
│       └── formatter.rs        # 마크다운/프롬프트 포맷
├── infra/
│   ├── watcher/
│   │   └── mod.rs              # FileWatcher (notify)
│   ├── parser/
│   │   ├── mod.rs              # LanguageParser trait + ParserRegistry
│   │   ├── python.rs
│   │   ├── typescript.rs
│   │   ├── csharp.rs
│   │   └── dart.rs
│   └── mcp/
│       └── mod.rs              # MCP 프로토콜 서버
└── shared/
    ├── types.rs                # ModuleId, Language, Symbol 등
    ├── error.rs                # ViberError (thiserror)
    └── event.rs                # ViberEvent enum + EventBus
```

---

## 프론트엔드 디렉토리

```
src/
├── app/
│   ├── App.tsx
│   └── providers.tsx
├── domains/
│   ├── project/
│   │   ├── components/         # ProjectSelector, SettingsPanel
│   │   ├── hooks/              # useProject
│   │   └── store.ts
│   ├── graph/
│   │   ├── components/         # GraphCanvas, NodeTooltip, EdgeDetail, DepthToggle
│   │   ├── hooks/              # useGraph, useCytoscape, useSymbols
│   │   ├── styles/             # graph-theme.ts (Cytoscape 스타일)
│   │   └── store.ts
│   ├── flow/
│   │   ├── components/         # FlowOverlay, EntryPicker, FlowAnimation, BookmarkList
│   │   ├── hooks/              # useFlow, useFlowAnimation
│   │   └── store.ts
│   ├── git/
│   │   ├── components/         # GitPanel, CommitForm, FileStaging, BranchSelect, Timeline, DiffImpact
│   │   ├── hooks/              # useGit, useDiffImpact
│   │   └── store.ts
│   ├── guardrail/
│   │   ├── components/         # ScopeDrawer, ScopeList, ViolationAlert, RevertButton
│   │   ├── hooks/              # useGuardrail
│   │   └── store.ts
│   ├── score/
│   │   ├── components/         # ScoreCard, MetricBreakdown, CycleWarning
│   │   ├── hooks/              # useScore
│   │   └── store.ts
│   └── context/
│       ├── components/         # ContextBuilder, ContextPreview, CopyButton
│       ├── hooks/              # useContext
│       └── store.ts
├── shared/
│   ├── components/             # Layout, Sidebar, Toolbar, Toast, Modal
│   ├── hooks/                  # useTauriCommand, useTauriEvent, useUndoRedo
│   ├── styles/                 # theme.ts, colors.ts, animations.ts
│   └── types/                  # index.ts
└── main.tsx
```

---

## 도메인 간 의존 관계

```
Project ──→ Watcher (파일 감시 시작)
              │
              ▼
            Parser ──→ Graph (파싱 결과 → 그래프 빌드)
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
            Flow      Score     Guardrail
              │                     │
              ▼                     │
           Context                  │
                                    │
            Git ──→ Graph (diff impact)
              │  ──→ Flow  (영향 플로우)
              │
              ▼
           LLM API (외부)
```

**규칙:** 하위 도메인은 상위를 참조 가능. 역방향 참조는 이벤트로.

---

## 이벤트 흐름

```
[파일 변경]
  → FileWatcher → FileEvent
      ├→ GraphService.on_file_change() → 재파싱 → GraphDiff → emit("graph:updated")
      ├→ GuardrailService.on_file_change() → 위반 체크 → emit("guardrail:violation")
      └→ Frontend listen("project:file_changed")

[Git 커밋]
  → GitService.commit() → emit("git:status_changed")
      → ScoreService.recalculate() → emit("score:updated")
```

---

## 데이터 저장 (대상 프로젝트 내)

```
target-project/
└── .viber/
    ├── config.json             # Viber 설정
    ├── layout.json             # 노드 위치 (깊이별)
    ├── bookmarks.json          # 유스케이스 즐겨찾기
    └── guardrails.json         # 스코프 경계 정의
```
