# Module: frontend/context

> LLM용 컨텍스트 팩 생성 UI.

## 책임
- 모듈/플로우 선택 → 컨텍스트 생성 요청
- 포맷 선택 (Markdown / Prompt)
- 미리보기
- 클립보드 복사

## 컴포넌트
```
context/
├── components/
│   ├── ContextBuilder.tsx      # 모듈 선택 + 포맷 + 토큰 제한 (모달 또는 사이드바)
│   ├── ContextPreview.tsx      # 생성 결과 미리보기 (syntax highlight)
│   └── CopyButton.tsx          # 클립보드 복사 + 피드백
├── hooks/
│   └── useContext.ts           # context:* commands
└── store.ts                    # ContextStore
```

## 스토어
```typescript
interface ContextStore {
  pack: ContextPack | null;
  loading: boolean;
  selectedModules: string[];
  selectedFlow: string | null;
  format: 'markdown' | 'prompt';
  maxTokens: number | null;

  setModules: (ids: string[]) => void;
  setFlow: (id: string | null) => void;
  setFormat: (f: 'markdown' | 'prompt') => void;
  setMaxTokens: (n: number | null) => void;
  generate: () => Promise<void>;
  copy: () => Promise<void>;
}
```

## 의존 FE 모듈
- `shell` — useTauriCommand, Modal, toast
- `graph` — GraphStore.selectedNode, GraphStore.nodes (선택한 모듈)
- `flow` — FlowStore.activeFlow, FlowStore.bookmarks (플로우 선택)

## BE 통신
→ `contracts/fe-be.md` context 섹션 참조
