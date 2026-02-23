# Module: frontend/git

> Git 상태, 커밋, 브랜치, AI 메시지, diff impact, 타임라인 UI.

## 책임
- Git 상태 표시 (브랜치, modified, staged)
- 파일/폴더 단위 스테이징 체크박스
- 커밋 폼 (메시지 입력 또는 AI 생성)
- 브랜치 전환/생성
- Diff impact → 그래프 하이라이트
- 커밋/브랜치 타임라인

## 컴포넌트
```
git/
├── components/
│   ├── GitPanel.tsx            # 메인 패널 (Sidebar)
│   ├── CommitForm.tsx          # 메시지 + Commit/Commit&Push 버튼
│   ├── FileStaging.tsx         # 파일 체크박스 트리 (폴더 단위 가능)
│   ├── BranchSelect.tsx        # 브랜치 드롭다운 + 생성
│   ├── AiMessage.tsx           # AI 메시지 생성/미리보기/편집 (Phase 5)
│   ├── DiffImpact.tsx          # 영향 모듈 하이라이트 트리거 (Phase 5)
│   └── Timeline.tsx            # 시간축 시각화 (Phase 5)
├── hooks/
│   ├── useGit.ts               # git:* commands + event 구독
│   └── useDiffImpact.ts        # diff impact 조회 + 그래프 연동
└── store.ts                    # GitStore
```

## 스토어
```typescript
interface GitStore {
  status: GitStatus | null;
  stagedPaths: Set<string>;
  commitMessage: string;
  aiMessage: string | null;
  aiLoading: boolean;
  timeline: GitTimeline | null;
  diffImpact: DiffImpact | null;

  refreshStatus: () => Promise<void>;
  stagePath: (path: string) => Promise<void>;
  unstagePath: (path: string) => Promise<void>;
  stageFolder: (folder: string) => Promise<void>;
  setMessage: (msg: string) => void;
  generateAiMessage: () => Promise<void>;
  commit: (push?: boolean) => Promise<void>;
  createBranch: (name: string) => Promise<void>;
  checkout: (branch: string) => Promise<void>;
  loadDiffImpact: (source?: string) => Promise<void>;
  loadTimeline: (limit?: number) => Promise<void>;
}
```

## 그래프 연동 방식
- DiffImpact 조회 결과의 `affectedModules` → GraphStore 노드에 `diff-impact` class 추가
- graph 모듈의 Cytoscape 스타일이 렌더링

## 의존 FE 모듈
- `shell` — useTauriCommand, useTauriEvent, Sidebar.Section, StatusBar, toast
- `graph` — GraphStore.nodes (selector, diff impact 하이라이트용)

## BE 통신
→ `contracts/fe-be.md` git 섹션 참조
