# Module: frontend/shell

> 앱 전체 레이아웃, 테마, 공통 UI, undo/redo. 다른 FE 모듈이 끼워지는 프레임.

## 책임
- 메인 레이아웃 (Sidebar + Canvas + Detail Panel)
- 툴바, 상태바
- 다크 테마, 색상 팔레트
- 토스트 알림 시스템
- Undo/Redo 스택
- Tauri IPC 래퍼 hooks

## 컴포넌트
```
shell/
├── components/
│   ├── Layout.tsx          # 3단 레이아웃 (sidebar | canvas | detail)
│   ├── Sidebar.tsx         # 좌측 사이드바 프레임 (슬롯 기반)
│   ├── DetailPanel.tsx     # 우측 상세 패널 프레임 (슬롯 기반)
│   ├── Toolbar.tsx         # 상단 툴바
│   ├── StatusBar.tsx       # 하단 상태바
│   ├── Toast.tsx           # 알림 토스트
│   └── Modal.tsx           # 공통 모달
├── hooks/
│   ├── useTauriCommand.ts  # invoke 래퍼 (에러 핸들링 포함)
│   ├── useTauriEvent.ts    # listen 래퍼 (자동 cleanup)
│   └── useUndoRedo.ts      # Undo/Redo 스택
├── styles/
│   ├── theme.ts            # 테마 토큰
│   ├── colors.ts           # 색상 팔레트
│   └── animations.ts       # 공통 애니메이션
└── store.ts                # ShellStore (sidebar 열림, 활성 패널 등)
```

## 노출 인터페이스 (다른 FE 모듈이 사용)
```typescript
// Hooks
useTauriCommand<T>(cmd: string, params?) → { data, loading, error, invoke }
useTauriEvent<T>(event: string, handler: (T) => void) → void
useUndoRedo<T>() → { push, undo, redo, canUndo, canRedo }

// 컴포넌트 슬롯
<Sidebar.Section title="Git"> ... </Sidebar.Section>
<DetailPanel.Tab label="Symbols"> ... </DetailPanel.Tab>

// 토스트
toast.show({ type, message, action? })

// 스토어
ShellStore.sidebarOpen
ShellStore.activeDetailTab
```

## 의존 모듈
없음 (최하위 — 다른 모듈이 shell을 import)

## 테마
```typescript
colors = {
  bg:      { primary: '#0a0a0f', secondary: '#12121a', surface: '#1a1a2e' },
  accent:  { primary: '#e94560', secondary: '#533483', tertiary: '#0f3460' },
  text:    { primary: '#e0e0e0', secondary: '#8888aa', muted: '#555577' },
  status:  { success: '#4ecca3', warning: '#ffc107', danger: '#e94560' },
}
fonts = { code: 'JetBrains Mono', ui: 'Inter' }
```
