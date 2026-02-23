# Module: frontend/score

> 의존성 건강도 점수 표시.

## 책임
- 전체 점수 배지 (Toolbar)
- 메트릭 상세 패널
- 순환 의존성 경고 + 그래프 하이라이트

## 컴포넌트
```
score/
├── components/
│   ├── ScoreCard.tsx           # 점수 배지 (Toolbar) + 클릭 → 상세
│   ├── MetricBreakdown.tsx     # 각 메트릭 막대/설명 (Detail Panel)
│   └── CycleWarning.tsx        # 순환 의존성 목록 + 클릭 → 하이라이트
├── hooks/
│   └── useScore.ts             # score:* commands + event
└── store.ts                    # ScoreStore
```

## 스토어
```typescript
interface ScoreStore {
  score: HealthScore | null;
  selectedCycle: string[] | null;       // 선택된 순환 경로 모듈 ids

  refresh: () => Promise<void>;
  selectCycle: (modules: string[] | null) => void;
}
```

## 그래프 연동 방식
- 순환 경로 선택 시 해당 노드/간선에 `cycle` class 추가

## 의존 FE 모듈
- `shell` — useTauriCommand, useTauriEvent, Toolbar 슬롯, DetailPanel.Tab
- `graph` — GraphStore.nodes (selector, 순환 하이라이트)

## BE 통신
→ `contracts/fe-be.md` score 섹션 참조
