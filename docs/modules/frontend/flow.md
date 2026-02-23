# Module: frontend/flow

> 유스케이스 플로우 트래킹 UI. 그래프 위 오버레이 + 애니메이션.

## 책임
- 엔트리 포인트 검색/선택
- 그래프 위 플로우 경로 하이라이트
- 점선 따라가기 애니메이션
- 즐겨찾기 관리

## 컴포넌트
```
flow/
├── components/
│   ├── EntryPicker.tsx         # 검색 입력 + 자동완성 (Toolbar 또는 모달)
│   ├── FlowOverlay.tsx         # 그래프 노드/간선에 class 추가로 하이라이트
│   ├── FlowAnimation.tsx       # 점선 애니메이션 컨트롤 (재생/정지/속도)
│   ├── FlowTimeline.tsx        # 플로우 단계 목록 (Detail Panel)
│   └── BookmarkList.tsx        # 즐겨찾기 목록 (Sidebar)
├── hooks/
│   ├── useFlow.ts              # flow:* commands
│   └── useFlowAnimation.ts    # 애니메이션 상태/타이머
└── store.ts                    # FlowStore
```

## 스토어
```typescript
interface FlowStore {
  activeFlow: FlowTrace | null;
  bookmarks: FlowBookmark[];
  animationState: 'idle' | 'playing' | 'paused';
  animationSpeed: 'slow' | 'normal' | 'fast';
  currentStep: number;

  startFlow: (entry: EntryPoint) => Promise<void>;
  stopFlow: () => void;
  toggleAnimation: () => void;
  setSpeed: (s: 'slow' | 'normal' | 'fast') => void;
  nextStep: () => void;
  addBookmark: (name: string) => Promise<void>;
  removeBookmark: (id: string) => Promise<void>;
}
```

## 그래프 연동 방식
- FlowOverlay는 Cytoscape 인스턴스를 **직접 조작하지 않음**
- 대신 GraphStore의 노드/간선에 **class를 추가/제거** (e.g. `flow-active`, `flow-path`)
- graph 모듈의 Cytoscape 스타일이 해당 class를 렌더링

## 의존 FE 모듈
- `shell` — useTauriCommand, Sidebar.Section, DetailPanel.Tab
- `graph` — GraphStore.nodes, GraphStore.edges (selector 구독)

## BE 통신
→ `contracts/fe-be.md` flow 섹션 참조
