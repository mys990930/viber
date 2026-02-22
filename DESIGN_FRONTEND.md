# Frontend Design — React + TypeScript

> DDD 도메인에 대응하는 컴포넌트/스토어 구조. Cytoscape.js + Framer Motion 기반 시각화.

---

## 디렉토리 구조

```
src/
├── app/
│   ├── App.tsx                     # 루트 레이아웃
│   ├── routes.tsx                  # 뷰 라우팅 (필요시)
│   └── providers.tsx               # 전역 Provider 조합
│
├── domains/
│   ├── project/                    # 프로젝트 관리
│   │   ├── components/
│   │   │   ├── ProjectSelector.tsx # 프로젝트 열기/최근 목록
│   │   │   └── SettingsPanel.tsx   # 설정 (언어, LLM, 제외 경로)
│   │   ├── hooks/
│   │   │   └── useProject.ts
│   │   └── store.ts               # ProjectStore (zustand)
│   │
│   ├── graph/                      # 의존성 그래프
│   │   ├── components/
│   │   │   ├── GraphCanvas.tsx     # Cytoscape.js 메인 캔버스
│   │   │   ├── NodeTooltip.tsx     # 노드 hover 정보
│   │   │   ├── EdgeDetail.tsx      # 간선 클릭 → 심볼 목록
│   │   │   ├── DepthToggle.tsx     # 패키지/모듈/파일 깊이 전환
│   │   │   └── ExternalDeps.tsx    # 외부 라이브러리 토글
│   │   ├── hooks/
│   │   │   ├── useGraph.ts         # 그래프 데이터 구독
│   │   │   ├── useCytoscape.ts     # Cytoscape 인스턴스 관리
│   │   │   └── useSymbols.ts       # 심볼 지연 로딩
│   │   ├── styles/
│   │   │   └── graph-theme.ts      # Cytoscape 스타일 정의
│   │   └── store.ts
│   │
│   ├── flow/                       # 유스케이스 플로우
│   │   ├── components/
│   │   │   ├── FlowOverlay.tsx     # 그래프 위 플로우 애니메이션 오버레이
│   │   │   ├── EntryPicker.tsx     # 엔트리 포인트 선택 UI
│   │   │   ├── FlowTimeline.tsx    # 플로우 단계 타임라인 (사이드바)
│   │   │   ├── FlowAnimation.tsx   # 점선 애니메이션 컴포넌트
│   │   │   └── BookmarkList.tsx    # 즐겨찾기 목록
│   │   ├── hooks/
│   │   │   ├── useFlow.ts
│   │   │   └── useFlowAnimation.ts # 애니메이션 상태 관리
│   │   └── store.ts
│   │
│   ├── git/                        # Git 통합
│   │   ├── components/
│   │   │   ├── GitPanel.tsx        # 메인 Git 패널
│   │   │   ├── CommitForm.tsx      # 커밋 폼 (메시지 + 파일 선택)
│   │   │   ├── FileStaging.tsx     # 폴더/파일 단위 스테이징
│   │   │   ├── BranchSelect.tsx    # 브랜치 전환/생성
│   │   │   ├── DiffImpact.tsx      # diff 영향 범위 시각화
│   │   │   ├── Timeline.tsx        # 커밋/브랜치 시간축 뷰
│   │   │   └── AiMessage.tsx       # LLM 커밋 메시지 미리보기
│   │   ├── hooks/
│   │   │   ├── useGit.ts
│   │   │   └── useDiffImpact.ts
│   │   └── store.ts
│   │
│   ├── guardrail/                  # 가드레일
│   │   ├── components/
│   │   │   ├── ScopeDrawer.tsx     # 그래프 위 경계 드로잉 도구
│   │   │   ├── ScopeList.tsx       # 정의된 스코프 목록
│   │   │   ├── ViolationAlert.tsx  # 위반 알림 토스트/모달
│   │   │   └── RevertButton.tsx    # 원클릭 revert
│   │   ├── hooks/
│   │   │   └── useGuardrail.ts
│   │   └── store.ts
│   │
│   ├── score/                      # 의존성 점수
│   │   ├── components/
│   │   │   ├── ScoreCard.tsx       # 전체 점수 카드
│   │   │   ├── MetricBreakdown.tsx # SOLID 메트릭 상세
│   │   │   └── CycleWarning.tsx    # 순환 의존성 경고
│   │   ├── hooks/
│   │   │   └── useScore.ts
│   │   └── store.ts
│   │
│   └── context/                    # 컨텍스트 팩
│       ├── components/
│       │   ├── ContextBuilder.tsx  # 모듈/플로우 선택 → 생성
│       │   ├── ContextPreview.tsx  # 생성된 컨텍스트 미리보기
│       │   └── CopyButton.tsx      # 클립보드 복사
│       ├── hooks/
│       │   └── useContext.ts
│       └── store.ts
│
├── shared/
│   ├── components/
│   │   ├── Layout.tsx              # 메인 레이아웃 (사이드바 + 캔버스)
│   │   ├── Sidebar.tsx             # 좌측 사이드바
│   │   ├── Toolbar.tsx             # 상단 툴바
│   │   ├── Toast.tsx               # 알림 토스트
│   │   └── Modal.tsx
│   ├── hooks/
│   │   ├── useTauriEvent.ts        # Tauri 이벤트 리스너 래퍼
│   │   ├── useTauriCommand.ts      # Tauri IPC invoke 래퍼
│   │   └── useUndoRedo.ts          # Undo/Redo 스택
│   ├── styles/
│   │   ├── theme.ts                # 다크 모드 테마 정의
│   │   ├── colors.ts               # 색상 팔레트
│   │   └── animations.ts           # 공통 애니메이션 정의
│   └── types/
│       └── index.ts                # 프론트엔드 공통 타입
│
└── main.tsx                        # React 엔트리포인트
```

---

## 레이아웃 구조

```
┌─────────────────────────────────────────────────────────┐
│  Toolbar  [프로젝트명] [깊이:모듈▾] [점수:87] [⚙️]      │
├───────┬─────────────────────────────────────┬───────────┤
│       │                                     │           │
│  S    │                                     │   Detail  │
│  i    │         GraphCanvas                 │   Panel   │
│  d    │         (Cytoscape.js)              │           │
│  e    │                                     │  - Edge   │
│  b    │    + FlowOverlay                    │    symbols│
│  a    │    + ScopeDrawer                    │  - Flow   │
│  r    │    + DiffImpact highlight           │    steps  │
│       │                                     │  - Module │
│ ───── │                                     │    info   │
│ Git   │                                     │           │
│ Panel │                                     │           │
│       │                                     │           │
├───────┴─────────────────────────────────────┴───────────┤
│  StatusBar  [Git: main ✓] [변경: 3] [감시중 👁️]         │
└─────────────────────────────────────────────────────────┘
```

- **Sidebar** (좌): Git 패널, 즐겨찾기, 스코프 목록 (접기/펼치기)
- **GraphCanvas** (중앙): 메인 그래프 + 오버레이들
- **Detail Panel** (우): 선택한 노드/간선/플로우 상세 (접기/펼치기)
- **Toolbar** (상): 프로젝트, 깊이 전환, 점수, 설정
- **StatusBar** (하): Git 상태, 변경 파일 수, 감시 상태

---

## 상태 관리 (Zustand)

각 도메인별 독립 스토어. 도메인 간 참조는 selector로.

```typescript
// domains/graph/store.ts
interface GraphStore {
  nodes: GraphNode[];
  edges: GraphEdge[];
  depth: 'packages' | 'modules' | 'files';
  selectedNode: string | null;
  hoveredEdge: string | null;

  setDepth: (depth: GraphDepth) => void;
  selectNode: (id: string | null) => void;
  hoverEdge: (id: string | null) => void;
  applyDiff: (diff: GraphDiff) => void;
}

// domains/flow/store.ts
interface FlowStore {
  activeFlow: FlowTrace | null;
  bookmarks: FlowBookmark[];
  animationState: 'idle' | 'playing' | 'paused';
  animationSpeed: number;
  currentStep: number;

  startFlow: (entry: EntryPoint) => void;
  toggleAnimation: () => void;
  setSpeed: (speed: number) => void;
  addBookmark: (name: string) => void;
}

// domains/git/store.ts
interface GitStore {
  status: GitStatus;
  stagedPaths: Set<string>;
  commitMessage: string;
  aiMessage: string | null;
  timeline: GitTimeline;
  diffImpact: DiffImpact | null;

  stagePath: (path: string) => void;
  unstagePath: (path: string) => void;
  stageFolder: (folder: string) => void;
  generateAiMessage: () => Promise<void>;
  commit: () => Promise<void>;
}

// domains/guardrail/store.ts
interface GuardrailStore {
  scopes: GuardrailScope[];
  violations: Violation[];
  isDrawing: boolean;

  startDrawing: () => void;
  finishDrawing: (nodeIds: string[]) => void;
  dismissViolation: (id: string) => void;
  revert: (violation: Violation) => Promise<void>;
}
```

---

## Cytoscape.js 설정

```typescript
// domains/graph/styles/graph-theme.ts
const cytoscapeStyle = [
  // 노드 기본
  {
    selector: 'node',
    style: {
      'background-color': '#1a1a2e',
      'border-color': '#4a4a6a',
      'label': 'data(label)',
      'color': '#e0e0e0',
      'font-size': '11px',
    }
  },
  // 모듈 노드
  {
    selector: 'node[type="module"]',
    style: { 'background-color': '#16213e', 'shape': 'roundrectangle' }
  },
  // 외부 패키지
  {
    selector: 'node[type="package"]',
    style: { 'background-color': '#0f3460', 'shape': 'diamond' }
  },
  // 변경된 노드
  {
    selector: 'node.changed',
    style: { 'border-color': '#e94560', 'border-width': 3 }
  },
  // 플로우 하이라이트
  {
    selector: 'node.flow-active',
    style: { 'background-color': '#533483', 'border-color': '#e94560' }
  },
  // 간선
  {
    selector: 'edge',
    style: {
      'line-color': '#4a4a6a',
      'target-arrow-color': '#4a4a6a',
      'curve-style': 'bezier',
      'width': 1.5,
    }
  },
  // 플로우 애니메이션 간선
  {
    selector: 'edge.flow-path',
    style: {
      'line-color': '#e94560',
      'line-style': 'dashed',
      'line-dash-pattern': [6, 3],
      'width': 2.5,
    }
  },
  // 가드레일 스코프 밖
  {
    selector: 'node.out-of-scope',
    style: { 'opacity': 0.3 }
  },
];
```

---

## 애니메이션 시스템

```typescript
// domains/flow/hooks/useFlowAnimation.ts
interface FlowAnimationConfig {
  speed: 'slow' | 'normal' | 'fast';   // 0.5x, 1x, 2x
  style: 'dash' | 'pulse' | 'particle';
  loop: boolean;
}

// 점선 따라가기: CSS animation + Cytoscape edge class 토글
// 단계별: currentStep 증가 → 해당 노드/간선에 class 추가
// Framer Motion: Detail Panel 전환, 사이드바 슬라이드
```

---

## Live Floating

```typescript
// domains/graph/hooks/useLiveFloating.ts
// 각 노드가 미세하게 부유하는 효과
// Cytoscape의 layout 이후 requestAnimationFrame으로
// 각 노드 position에 sin/cos 기반 미세 오프셋 적용
// 토글 가능 (설정에서 on/off)

function applyFloating(cy: Core, enabled: boolean) {
  if (!enabled) return;
  const nodes = cy.nodes();
  let frame = 0;
  const animate = () => {
    nodes.forEach((node, i) => {
      const pos = node.position();
      const dx = Math.sin(frame * 0.02 + i) * 0.3;
      const dy = Math.cos(frame * 0.015 + i * 1.5) * 0.3;
      node.position({ x: pos.x + dx, y: pos.y + dy });
    });
    frame++;
    requestAnimationFrame(animate);
  };
  animate();
}
```

---

## Undo/Redo

```typescript
// shared/hooks/useUndoRedo.ts
// 뷰 조작 (노드 이동, 줌, 깊이 변경 등)에 대한 이력 관리
// 각 액션을 스택에 push, Ctrl+Z / Ctrl+Shift+Z로 탐색
interface UndoStack<T> {
  past: T[];
  present: T;
  future: T[];
  push: (state: T) => void;
  undo: () => void;
  redo: () => void;
}
```

---

## 테마 & 색상

```typescript
// shared/styles/colors.ts
const palette = {
  bg: {
    primary: '#0a0a0f',        // 메인 배경
    secondary: '#12121a',      // 사이드바
    surface: '#1a1a2e',        // 카드/패널
  },
  accent: {
    primary: '#e94560',        // 핵심 강조 (플로우, 변경)
    secondary: '#533483',      // 보조 강조
    tertiary: '#0f3460',       // 패키지
  },
  text: {
    primary: '#e0e0e0',
    secondary: '#8888aa',
    muted: '#555577',
  },
  status: {
    success: '#4ecca3',
    warning: '#ffc107',
    danger: '#e94560',
  },
  graph: {
    node: '#1a1a2e',
    edge: '#4a4a6a',
    flowPath: '#e94560',
    changed: '#ffc107',
    outOfScope: 'rgba(255,255,255,0.1)',
  },
};
```
