# Module: frontend/guardrail

> 스코프 경계 설정 UI + 위반 알림 + revert.

## 책임
- 그래프 위 스코프 영역 드로잉/선택
- 스코프 목록 관리
- 위반 알림 (토스트)
- Revert 버튼

## 컴포넌트
```
guardrail/
├── components/
│   ├── ScopeDrawer.tsx         # 그래프 위 드래그/선택 → 스코프 생성
│   ├── ScopeList.tsx           # 정의된 스코프 목록 (Sidebar)
│   ├── ViolationAlert.tsx      # 위반 토스트 (우하단)
│   └── RevertButton.tsx        # 토스트 내 revert 버튼
├── hooks/
│   └── useGuardrail.ts         # guardrail:* commands + event
└── store.ts                    # GuardrailStore
```

## 스토어
```typescript
interface GuardrailStore {
  scopes: GuardrailScope[];
  violations: Violation[];
  isDrawing: boolean;

  startDrawing: () => void;
  finishDrawing: (nodeIds: string[]) => void;
  cancelDrawing: () => void;
  deleteScope: (id: string) => Promise<void>;
  revert: (violationId: string) => Promise<void>;
  dismiss: (violationId: string) => void;
}
```

## 그래프 연동 방식
- 활성 스코프의 모듈 → `in-scope` class, 나머지 → `out-of-scope` class
- ScopeDrawer: Cytoscape `box-selection` 이벤트 활용
- 위반 발생 시 해당 노드에 `violated` class 추가

## 의존 FE 모듈
- `shell` — useTauriCommand, useTauriEvent, Sidebar.Section, toast
- `graph` — GraphStore.nodes (selector, 스코프 내/외 판정)

## BE 통신
→ `contracts/fe-be.md` guardrail 섹션 참조
