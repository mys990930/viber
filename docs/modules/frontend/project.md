# Module: frontend/project

> 프로젝트 열기/닫기, 설정 UI.

## 책임
- 프로젝트 폴더 선택 다이얼로그
- 최근 프로젝트 목록
- 설정 패널 (언어, LLM, 제외 경로)

## 컴포넌트
```
project/
├── components/
│   ├── ProjectSelector.tsx     # 열기 버튼 + 최근 목록
│   └── SettingsPanel.tsx       # 설정 편집
├── hooks/
│   └── useProject.ts           # project:* commands 호출
└── store.ts                    # ProjectStore
```

## 스토어
```typescript
interface ProjectStore {
  info: ProjectInfo | null;
  config: ViberConfig | null;
  isOpen: boolean;
  open: (path: string) => Promise<void>;
  close: () => Promise<void>;
  updateConfig: (patch: Partial<ViberConfig>) => Promise<void>;
}
```

## 의존 FE 모듈
- `shell` — useTauriCommand, Layout 슬롯

## BE 통신
→ `contracts/fe-be.md` project 섹션 참조
