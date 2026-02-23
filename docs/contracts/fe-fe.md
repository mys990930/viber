# Contract: Frontend ↔ Frontend 모듈 간 통신 규약

---

## 원칙

1. **모듈 간 직접 import 금지** — 컴포넌트, hooks, 유틸 모두
2. **통신은 Zustand selector 구독으로** — 읽기 전용
3. **그래프 조작은 CSS class 추가/제거로** — Cytoscape 인스턴스 직접 접근 금지
4. **유일한 예외: `shell` 모듈** — 모든 모듈이 shell을 import 가능

---

## Zustand Selector 구독 맵

| 구독자 | 참조 스토어 | 참조 값 | 용도 |
|--------|------------|---------|------|
| flow | GraphStore | `nodes`, `edges` | 플로우 경로 노드 식별 |
| guardrail | GraphStore | `nodes` | 스코프 내/외 판정 |
| git | GraphStore | `nodes` | diff impact 하이라이트 대상 |
| score | GraphStore | `nodes` | 순환 하이라이트 대상 |
| context | GraphStore | `nodes`, `selectedNode` | 모듈 선택 |
| context | FlowStore | `activeFlow`, `bookmarks` | 플로우 포함 |

### 구독 다이어그램

```
shell (공통)
  ↑ import 허용
  │
graph ←── flow (selector)
      ←── guardrail (selector)
      ←── git (selector)
      ←── score (selector)
      ←── context (selector)

flow ←── context (selector)
```

---

## 그래프 CSS Class 프로토콜

다른 FE 모듈이 그래프 시각화에 영향을 주려면, **GraphStore를 통해 노드/간선에 class를 추가/제거**한다.

### Class 네임스페이스

| 모듈 | Class | 대상 | 효과 |
|------|-------|------|------|
| graph | `changed` | node | 빨간 보더 (파일 변경) |
| flow | `flow-active` | node | 보라색 배경 (플로우 활성) |
| flow | `flow-path` | edge | 빨간 점선 (플로우 경로) |
| guardrail | `in-scope` | node | 기본 opacity |
| guardrail | `out-of-scope` | node | opacity 0.3 |
| guardrail | `violated` | node | 빨간 글로우 |
| git | `diff-impact` | node | 노란 보더 (변경 영향) |
| score | `cycle` | node, edge | 주황 보더 (순환 의존) |

### Class 적용 방식

```typescript
// GraphStore에 공유 메서드
interface GraphStore {
  // ... 기존 ...
  addNodeClass: (nodeId: string, cls: string) => void;
  removeNodeClass: (nodeId: string, cls: string) => void;
  addEdgeClass: (edgeId: string, cls: string) => void;
  removeEdgeClass: (edgeId: string, cls: string) => void;
  clearClassByPrefix: (prefix: string) => void;  // e.g. 'flow-' 전체 제거
}
```

다른 모듈은 자기 네임스페이스의 class만 추가/제거. 남의 class 건드리기 금지.

---

## Shell 슬롯 시스템

shell이 제공하는 레이아웃 슬롯에 각 모듈이 컴포넌트를 끼움:

| 슬롯 | 위치 | 사용 모듈 |
|------|------|----------|
| `Toolbar.Left` | 툴바 좌측 | project (이름), graph (DepthToggle) |
| `Toolbar.Center` | 툴바 중앙 | flow (EntryPicker) |
| `Toolbar.Right` | 툴바 우측 | score (ScoreCard), graph (ExternalToggle) |
| `Sidebar.Section` | 사이드바 | git (GitPanel), flow (BookmarkList), guardrail (ScopeList) |
| `Canvas` | 중앙 영역 | graph (GraphCanvas) |
| `Canvas.Overlay` | 캔버스 위 | flow (FlowOverlay), guardrail (ScopeDrawer) |
| `DetailPanel.Tab` | 우측 탭 | graph (NodeDetail, EdgeDetail), flow (FlowTimeline), score (MetricBreakdown) |
| `StatusBar` | 하단 | git (브랜치/상태), project (감시 상태) |
| `Toast` | 우하단 | guardrail (ViolationAlert) |
