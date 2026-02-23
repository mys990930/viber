# Architecture — 전체 구조 + DDD 도메인 맵

---

## 앱 구조

```
┌──────────────────────────────────────────────────┐
│              Frontend (React + TypeScript)         │
│                                                   │
│  domains/                                         │
│  ├─ shell        (레이아웃, 테마, 공통)             │
│  ├─ project      (열기/설정)                       │
│  ├─ graph        (Cytoscape 그래프)               │
│  ├─ flow         (플로우 오버레이)                  │
│  ├─ git          (커밋/브랜치/타임라인)              │
│  ├─ guardrail    (스코프/위반)                     │
│  ├─ score        (점수 표시)                       │
│  └─ context      (컨텍스트 팩)                     │
└────────────────────┬─────────────────────────────┘
                     │ Tauri IPC (Command + Event)
┌────────────────────┴─────────────────────────────┐
│              Backend (Rust / Tauri)                │
│                                                   │
│  domain/              infra/         shared/       │
│  ├─ project           ├─ watcher     ├─ types.rs   │
│  ├─ graph             ├─ parser      ├─ error.rs   │
│  ├─ flow              └─ mcp         └─ event.rs   │
│  ├─ git                                           │
│  ├─ guardrail                                     │
│  ├─ score                                         │
│  └─ context                                       │
└──────────────────────────────────────────────────┘
```

---

## 모듈 간 통신 원칙

| 계층 | 원칙 | 상세 |
|------|------|------|
| **BE ↔ BE** | 이벤트 + 읽기 쿼리 | 직접 호출은 읽기만. 상태 변경은 이벤트. → `contracts/be-be.md` |
| **FE ↔ FE** | Selector + CSS Class | 직접 import 금지. Zustand selector로 구독. → `contracts/fe-fe.md` |
| **FE ↔ BE** | Command + Event | 모듈별 command/event 정의. 타 도메인 호출 금지. → `contracts/fe-be.md` |

---

## 백엔드 디렉토리

```
src-tauri/src/
├── main.rs
├── lib.rs                      # Tauri 빌더 + command 등록
├── domain/
│   ├── project/
│   │   ├── mod.rs
│   │   └── config.rs
│   ├── graph/
│   │   ├── mod.rs
│   │   ├── builder.rs
│   │   └── diff.rs
│   ├── flow/
│   │   ├── mod.rs
│   │   ├── tracer.rs
│   │   └── bookmark.rs
│   ├── git/
│   │   ├── mod.rs
│   │   ├── commit.rs
│   │   ├── branch.rs
│   │   ├── impact.rs
│   │   └── llm.rs
│   ├── guardrail/
│   │   ├── mod.rs
│   │   ├── scope.rs
│   │   └── violation.rs
│   ├── score/
│   │   ├── mod.rs
│   │   └── metrics.rs
│   └── context/
│       ├── mod.rs
│       └── formatter.rs
├── infra/
│   ├── watcher/
│   │   └── mod.rs
│   ├── parser/
│   │   ├── mod.rs
│   │   ├── python.rs
│   │   ├── typescript.rs
│   │   ├── csharp.rs
│   │   └── dart.rs
│   └── mcp/
│       └── mod.rs
└── shared/
    ├── types.rs
    ├── error.rs
    └── event.rs
```

---

## 프론트엔드 디렉토리

```
src/
├── app/
│   ├── App.tsx
│   └── providers.tsx
├── domains/
│   ├── shell/
│   │   ├── components/         # Layout, Sidebar, Toolbar, StatusBar, Toast, Modal
│   │   ├── hooks/              # useTauriCommand, useTauriEvent, useUndoRedo
│   │   ├── styles/             # theme, colors, animations
│   │   └── store.ts
│   ├── project/
│   │   ├── components/         # ProjectSelector, SettingsPanel
│   │   ├── hooks/
│   │   └── store.ts
│   ├── graph/
│   │   ├── components/         # GraphCanvas, NodeTooltip, EdgeDetail, DepthToggle
│   │   ├── hooks/              # useGraph, useCytoscape, useSymbols, useLiveFloating
│   │   ├── styles/             # graph-theme.ts
│   │   └── store.ts
│   ├── flow/
│   │   ├── components/         # EntryPicker, FlowOverlay, FlowAnimation, BookmarkList
│   │   ├── hooks/
│   │   └── store.ts
│   ├── git/
│   │   ├── components/         # GitPanel, CommitForm, FileStaging, BranchSelect, ...
│   │   ├── hooks/
│   │   └── store.ts
│   ├── guardrail/
│   │   ├── components/         # ScopeDrawer, ScopeList, ViolationAlert
│   │   ├── hooks/
│   │   └── store.ts
│   ├── score/
│   │   ├── components/         # ScoreCard, MetricBreakdown, CycleWarning
│   │   ├── hooks/
│   │   └── store.ts
│   └── context/
│       ├── components/         # ContextBuilder, ContextPreview, CopyButton
│       ├── hooks/
│       └── store.ts
├── shared/
│   └── types/                  # FE↔BE 공유 타입 (도메인별 .ts)
└── main.tsx
```

---

## 데이터 저장 (대상 프로젝트 내)

```
target-project/
└── .viber/
    ├── config.json
    ├── layout.json
    ├── bookmarks.json
    ├── guardrails.json
    └── backups/                # guardrail 백업 (최근 100개)
```
