# Roadmap — 기능별 개발 순서

> 각 기능의 FE/BE 작업을 나열하고, 의존 관계에 따라 순서를 정한다.
> 번호가 Phase. 같은 Phase 내 작업은 병렬 가능.

---

## Phase 0 — 기반 (모든 기능의 전제)

| # | 작업 | 레이어 | 설명 | 산출물 |
|---|------|--------|------|--------|
| 0-1 | Tauri 셸 + React 빈 앱 | FE+BE | 기본 창, 사이드바/캔버스 레이아웃 | `App.tsx`, `Layout.tsx` |
| 0-2 | 이벤트 버스 | BE | `ViberEvent` enum + emit 인프라 | `shared/event.rs` |
| 0-3 | 에러 타입 | BE | `ViberError` 통합 에러 | `shared/error.rs` |
| 0-4 | Tauri command/event 래퍼 | FE | `useTauriCommand`, `useTauriEvent` | `shared/hooks/` |
| 0-5 | 다크 테마 기본 | FE | 색상 팔레트, 글로벌 스타일 | `shared/styles/` |

---

## Phase 1 — 프로젝트 + 그래프 (핵심)

**의존:** Phase 0

### 1A. 프로젝트 (→ `modules/backend/project.md`, `modules/frontend/project.md`)

| # | 작업 | 레이어 | 설명 |
|---|------|--------|------|
| 1A-1 | ProjectService | BE | 프로젝트 열기, `.viber/` 초기화, 설정 로드 |
| 1A-2 | FileWatcher | BE | notify 기반 파일 감시, FileEvent 발행 |
| 1A-3 | ParserRegistry | BE | Tree-sitter 파서 등록 인프라 + Python 파서 |
| 1A-4 | ProjectSelector UI | FE | 폴더 열기 다이얼로그, 프로젝트명 표시 |

### 1B. 의존성 그래프 (→ `modules/backend/graph.md`, `modules/frontend/graph.md`)

| # | 작업 | 레이어 | 설명 |
|---|------|--------|------|
| 1B-1 | GraphService | BE | petgraph 기반 그래프, 빌드/조회/diff |
| 1B-2 | Python import 파서 | BE | `import x`, `from x import y` 파싱 |
| 1B-3 | 패키지 의존성 파서 | BE | `requirements.txt`, `pyproject.toml` |
| 1B-4 | `graph:get` command | BE | 깊이별 그래프 반환 |
| 1B-5 | `graph:updated` event | BE | 파일 변경 → 재파싱 → diff push |
| 1B-6 | GraphCanvas | FE | Cytoscape.js 캔버스, 노드/간선 렌더링 |
| 1B-7 | 깊이 전환 UI | FE | 패키지/모듈/파일 토글 |
| 1B-8 | 실시간 업데이트 | FE | `graph:updated` 구독 → applyDiff |
| 1B-9 | 노드 hover/클릭 | FE | 노드 정보 표시, 간선 심볼 지연 로딩 |

**Phase 1 완료 = MVP**: Python 프로젝트를 열면 모듈 그래프가 실시간으로 보인다.

---

## Phase 2 — Git 기본

**의존:** Phase 1 (그래프가 있어야 diff impact 가능)

### 2. Git (→ `modules/backend/git.md`, `modules/frontend/git.md`)

| # | 작업 | 레이어 | 설명 |
|---|------|--------|------|
| 2-1 | GitService | BE | git2-rs 래핑, status/commit/branch |
| 2-2 | `git:status`, `git:commit` commands | BE | 기본 Git 조작 |
| 2-3 | 파일 단위 스테이징 | BE | `git:stage`, `git:unstage` |
| 2-4 | GitPanel UI | FE | 상태 표시, 커밋 폼, 파일 선택 체크박스 |
| 2-5 | BranchSelect | FE | 브랜치 목록, 생성/전환 |
| 2-6 | 상태바 Git 정보 | FE | 브랜치명, ahead/behind 표시 |

---

## Phase 3 — 플로우 트래킹

**의존:** Phase 1 (그래프 필요)

### 3. 플로우 (→ `modules/backend/flow.md`, `modules/frontend/flow.md`)

| # | 작업 | 레이어 | 설명 |
|---|------|--------|------|
| 3-1 | 함수 호출 파서 | BE | Tree-sitter로 caller→callee 추출 |
| 3-2 | FlowService | BE | 엔트리 → DFS 추적 → 순방향/복귀 경로 |
| 3-3 | `flow:trace` command | BE | 플로우 결과 반환 |
| 3-4 | `flow:bookmarks` CRUD | BE | 즐겨찾기 저장 (`.viber/bookmarks.json`) |
| 3-5 | EntryPicker | FE | 엔트리 포인트 검색/선택 UI |
| 3-6 | FlowOverlay | FE | 그래프 위 경로 하이라이트 |
| 3-7 | FlowAnimation | FE | 점선 따라가기 애니메이션 (속도 옵션) |
| 3-8 | BookmarkList | FE | 즐겨찾기 목록, 원클릭 재실행 |

---

## Phase 4 — 가드레일

**의존:** Phase 1 (그래프) + Phase 0-2 (파일 감시)

### 4. 가드레일 (→ `modules/backend/guardrail.md`, `modules/frontend/guardrail.md`)

| # | 작업 | 레이어 | 설명 |
|---|------|--------|------|
| 4-1 | GuardrailService | BE | 스코프 정의, 위반 감지, 백업 |
| 4-2 | `guardrail:violation` event | BE | 스코프 밖 변경 시 즉시 push |
| 4-3 | `guardrail:revert` command | BE | 백업에서 복원 |
| 4-4 | ScopeDrawer | FE | 그래프 위 경계 드로잉/노드 선택 |
| 4-5 | ViolationAlert | FE | 토스트 알림 + revert 버튼 |
| 4-6 | ScopeList | FE | 정의된 스코프 관리 UI |

---

## Phase 5 — Git 고급 + AI

**의존:** Phase 2 (Git 기본) + Phase 1 (그래프)

| # | 작업 | 레이어 | 설명 |
|---|------|--------|------|
| 5-1 | LLM 커밋 메시지 | BE | diff → LLM API → 메시지 생성 |
| 5-2 | DiffImpact 계산 | BE | 변경 파일 → 영향 모듈/플로우 매핑 |
| 5-3 | Git 타임라인 | BE | 커밋/브랜치 시간축 데이터 |
| 5-4 | AiMessage UI | FE | 메시지 미리보기, 편집, 수락 |
| 5-5 | DiffImpact 하이라이트 | FE | 그래프 위 영향 범위 표시 |
| 5-6 | Timeline UI | FE | 시간축 시각화 (커밋/브랜치 그래프) |

---

## Phase 6 — 컨텍스트 팩 + 점수

**의존:** Phase 1 (그래프) + Phase 3 (플로우)

| # | 작업 | 레이어 | 설명 |
|---|------|--------|------|
| 6-1 | ContextService | BE | 모듈/플로우 → 마크다운/프롬프트 생성 |
| 6-2 | ScoreService | BE | SOLID 메트릭 계산, 순환 의존성 탐지 |
| 6-3 | ContextBuilder UI | FE | 모듈 선택 → 생성 → 미리보기 → 복사 |
| 6-4 | ScoreCard UI | FE | 점수 표시, 메트릭 상세, 순환 경고 |

---

## Phase 7 — MCP 서버

**의존:** Phase 1~6 (노출할 기능이 있어야 함)

| # | 작업 | 레이어 | 설명 |
|---|------|--------|------|
| 7-1 | MCP 프로토콜 구현 | BE | stdio/SSE transport |
| 7-2 | tool 래핑 | BE | 기존 command → MCP tool로 노출 |
| 7-3 | MCP 설정 UI | FE | 서버 on/off, 연결 상태 표시 |

---

## Phase 8 — 다중 언어

**의존:** Phase 1A-3 (ParserRegistry)

| # | 작업 | 레이어 | 설명 |
|---|------|--------|------|
| 8-1 | TypeScript/JS 파서 | BE | import/require/export 파싱 |
| 8-2 | C# 파서 | BE | using/namespace 파싱 |
| 8-3 | Dart 파서 | BE | import/part 파싱 |
| 8-4 | 자동 언어 감지 | BE | 프로젝트 루트 스캔 → 활성 언어 결정 |

---

## Phase 9 — UX 폴리싱

**의존:** 전체 기능 안정화 후

| # | 작업 | 레이어 | 설명 |
|---|------|--------|------|
| 9-1 | Live floating | FE | 노드 미세 부유 (토글) |
| 9-2 | 자동 정렬 | FE | 레이아웃 알고리즘 개선 |
| 9-3 | Undo/Redo | FE | 뷰 조작 이력 |
| 9-4 | 레이아웃 저장 | FE+BE | `.viber/layout.json` 저장/로드 |
| 9-5 | 외부 패키지 토글 | FE | 그래프에서 접기/펼치기 |
| 9-6 | 드릴다운 전환 애니메이션 | FE | 모듈 클릭 → 내부 뷰 줌인 |

---

## 의존 관계 다이어그램

```
Phase 0 (기반)
   │
   ▼
Phase 1 (프로젝트 + 그래프) ←── MVP
   │
   ├──→ Phase 2 (Git 기본)
   │       │
   │       └──→ Phase 5 (Git 고급 + AI)
   │
   ├──→ Phase 3 (플로우)
   │       │
   │       └──→ Phase 6 (컨텍스트 + 점수)
   │
   ├──→ Phase 4 (가드레일)
   │
   ├──→ Phase 8 (다중 언어)
   │
   └──→ Phase 7 (MCP) ← Phase 1~6 이후
           │
           └──→ Phase 9 (UX 폴리싱)
```

---

## 현재 상태

- [x] Phase 0-1: Tauri 셸 + React 레이아웃
- [x] Phase 0-2: 이벤트 버스
- [x] Phase 0-3: 에러 타입 (0-2에 포함)
- [x] Phase 0-4: Tauri command/event 래퍼 hooks
- [x] Phase 0-5: 다크 테마 (0-1에 포함)
- [ ] Phase 1 이후: 미착수
