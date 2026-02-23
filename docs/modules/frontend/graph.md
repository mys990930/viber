# Module: frontend/graph

> Cytoscape.js 기반 의존성 그래프 캔버스. 메인 시각화.

## 책임
- Cytoscape.js 인스턴스 관리
- 깊이별 그래프 렌더링 (패키지/모듈/파일)
- 실시간 diff 적용 (전체 리렌더 아님)
- 노드 hover/클릭 → 상세 정보
- 간선 hover → 심볼 지연 로딩
- 모듈 더블클릭 → 드릴다운
- Live floating (토글)
- 외부 패키지 표시 토글
- 자동 정렬 (cose-bilkent 레이아웃)
- 레이아웃 저장/로드

## 컴포넌트
```
graph/
├── components/
│   ├── GraphCanvas.tsx         # Cytoscape 캔버스 (메인 뷰 영역 전체)
│   ├── NodeTooltip.tsx         # 노드 hover 시 간단 정보
│   ├── EdgeDetail.tsx          # 간선 클릭 → 심볼 목록 (Detail Panel)
│   ├── NodeDetail.tsx          # 노드 클릭 → 상세 (Detail Panel)
│   ├── DepthToggle.tsx         # 패키지/모듈/파일 전환 (Toolbar)
│   └── ExternalToggle.tsx      # 외부 패키지 표시 토글 (Toolbar)
├── hooks/
│   ├── useGraph.ts             # graph:* commands + event 구독
│   ├── useCytoscape.ts         # Cytoscape 인스턴스 생명주기
│   ├── useSymbols.ts           # 간선 심볼 지연 로딩
│   ├── useLiveFloating.ts      # 노드 부유 애니메이션
│   └── useLayout.ts            # 레이아웃 저장/로드
├── styles/
│   └── graph-theme.ts          # Cytoscape 스타일시트
└── store.ts                    # GraphStore
```

## 스토어
```typescript
interface GraphStore {
  nodes: GraphNode[];
  edges: GraphEdge[];
  depth: 'packages' | 'modules' | 'files';
  selectedNode: string | null;
  hoveredEdge: string | null;
  showExternal: boolean;
  floatingEnabled: boolean;

  setDepth: (d: GraphDepth) => void;
  selectNode: (id: string | null) => void;
  hoverEdge: (id: string | null) => void;
  applyDiff: (diff: GraphDiff) => void;
  toggleExternal: () => void;
  toggleFloating: () => void;
}
```

## 노출 인터페이스 (다른 FE 모듈이 구독)
```typescript
// 다른 모듈이 selector로 읽을 수 있는 값
GraphStore.nodes          // guardrail, context가 참조
GraphStore.edges          // flow가 참조
GraphStore.selectedNode   // flow, context가 참조
```

## 의존 FE 모듈
- `shell` — useTauriCommand, useTauriEvent, useUndoRedo, Layout 캔버스 영역

## Cytoscape 스타일 요약
- 노드: 둥근 사각형, 다크 배경, 타입별 색상
- 간선: 베지어, 화살표
- 변경 노드: 빨간 보더
- 스코프 밖: opacity 0.3
- 플로우 경로: 빨간 점선 (flow 모듈이 class 추가)

## BE 통신
→ `contracts/fe-be.md` graph 섹션 참조
