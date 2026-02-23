# Viber — 바이브 코딩 모듈화 도우미

> 코드베이스의 구조를 실시간 시각화하고, Git을 똑똑하게 관리하며, AI 에이전트와 연동되는 데스크톱 앱.

## 스택

| 레이어 | 기술 |
|--------|------|
| 데스크톱 | Tauri v2 |
| 백엔드 | Rust (notify, tree-sitter, git2, petgraph) |
| 프론트엔드 | React + TypeScript + Vite |
| 그래프 | Cytoscape.js |
| 애니메이션 | Framer Motion |
| 상태 관리 | Zustand |

## 문서 구조

| 파일 | 내용 |
|------|------|
| `docs/ROADMAP.md` | 기능별 로드맵 (순서 + FE/BE 분리) |
| `docs/ARCHITECTURE.md` | 전체 아키텍처 + DDD 도메인 맵 |
| `docs/CONTRIBUTING.md` | 개발 가이드 (환경, 컨벤션, 패턴) |
| **모듈 (Backend)** | |
| `docs/modules/backend/watcher.md` | 파일 감시 (인프라) |
| `docs/modules/backend/parser.md` | Tree-sitter 파서 (인프라) |
| `docs/modules/backend/project.md` | 프로젝트 관리 |
| `docs/modules/backend/graph.md` | 의존성 그래프 |
| `docs/modules/backend/flow.md` | 유스케이스 플로우 |
| `docs/modules/backend/git.md` | Git 통합 |
| `docs/modules/backend/guardrail.md` | 가드레일 |
| `docs/modules/backend/score.md` | 의존성 점수 |
| `docs/modules/backend/context.md` | 컨텍스트 팩 |
| `docs/modules/backend/mcp.md` | MCP 서버 |
| **모듈 (Frontend)** | |
| `docs/modules/frontend/shell.md` | 레이아웃/테마/공통 UI |
| `docs/modules/frontend/project.md` | 프로젝트 UI |
| `docs/modules/frontend/graph.md` | 그래프 캔버스 |
| `docs/modules/frontend/flow.md` | 플로우 오버레이 |
| `docs/modules/frontend/git.md` | Git 패널 |
| `docs/modules/frontend/guardrail.md` | 스코프/위반 UI |
| `docs/modules/frontend/score.md` | 점수 표시 |
| `docs/modules/frontend/context.md` | 컨텍스트 생성 UI |
| **규약** | |
| `docs/contracts/be-be.md` | BE 모듈 간 통신 (이벤트 + 쿼리) |
| `docs/contracts/fe-fe.md` | FE 모듈 간 통신 (selector + class) |
| `docs/contracts/fe-be.md` | FE ↔ BE 통신 (command + event) |

## 🧩 기능 상세

### 1. 프로젝트 뷰 — 의존성 시각화

#### 1.1 모듈 단위 그래프
- 최상위 뷰: 모듈(패키지/디렉토리) 간 의존 관계 그래프
- Obsidian graph view 스타일, 인터랙티브
- 간선 hover → 의존 객체(함수, 클래스, 변수) 하이라이트
- 외부 라이브러리 의존성 표시 (토글 가능)

#### 1.2 모듈 드릴다운
- 모듈 클릭 → 내부 폴더/파일 별 상세 시각화
- 모듈 내 플로우 시각화 (함수 호출 체인)

#### 1.3 유스케이스 플로우 트래킹
- **엔트리 포인트 지정** → 호출 경로를 자동으로 따라가며 하이라이트
- 점선 애니메이션으로 플로우를 시각적으로 따라감 (속도/스타일 옵션 제공)
- 갔다가 돌아오는 전체 경로 표시 (요청 → 처리 → 응답)
- **유스케이스 즐겨찾기 저장** — 자주 보는 플로우를 북마크

#### 1.4 컨텍스트 팩 생성
- 선택한 모듈/플로우 기반으로 **LLM용 컨텍스트 문서 자동 생성**
  - `.md` 형태: 구조화된 프로젝트 컨텍스트 문서
  - 복붙용: 클립보드에 바로 복사 가능한 프롬프트
- AI 에이전트에게 먹이기 최적화

#### 1.5 변경점 시각화
- 파일 변경 시 그래프에서 해당 노드/간선 실시간 하이라이트
- 변경의 영향 범위(ripple) 시각화

---

### 2. 뷰 & UX

#### 2.1 레이아웃
- **자동 정렬** — 깔끔한 초기 배치
- **Undo/Redo** — 뷰 조작 이력 관리
- **위치 고정 저장** — 프로젝트 폴더 내 `.viber/layout.json`에 노드 위치 저장
  - 모듈 단위, 파일 단위 각각 저장
- **Live floating** — 각 노드가 제자리에서 미세하게 부유 (토글 가능)

#### 2.2 미학
- **예뻐야 한다.** 개발자 감성에 호소할 것
- 다크 모드 기본, 세련된 색상 팔레트
- 부드러운 애니메이션, 자연스러운 물리 시뮬레이션
- 바이럴 목표: 듀얼 모니터 세팅샷에 Viber가 항상 보이는 것
  - Claude Code + Viber, Cursor + Viber, CLI + Viber

---

### 3. 가드레일

#### 3.1 스코프 경계 설정
- 그래프 위에 **경계 영역 드로잉** 또는 **노드 선택**으로 스코프 지정
- 시각적으로 명확한 바운더리 표시

#### 3.2 스코프 밖 변경 감지
- 프로젝트 내 스코프 밖 파일 변경 발생 시 **즉시 알림**
- **Revert 버튼** 제공 — 원클릭 복구
- AI 에이전트가 벗어나지 않도록 실시간 감시

#### 3.3 의존성 점수
- 현재 프로젝트의 **의존성 건강도 점수** 표시
- SOLID 원칙 기반 평가
  - 단일 책임 (모듈 크기/역할 수)
  - 의존성 역전 (추상화 방향)
  - 순환 의존성 감지
  - 결합도/응집도 지표

---

### 4. Git 통합

#### 4.1 퀵 커밋 & 푸시
- UI에서 원클릭 커밋 + 푸시
- **폴더 단위, 파일 단위 선택 커밋** 가능 (스테이징 세분화)

#### 4.2 AI 커밋 메시지
- diff 기반 **LLM 자동 커밋 메시지 생성**
- 사용할 모델 유저 설정 가능 (OpenAI, Claude, 로컬 모델 등)

#### 4.3 Diff Impact 시각화
- 커밋/브랜치/워킹트리 변경 선택 시 → **영향받는 모듈/플로우 자동 하이라이트**
- "이 변경이 어디까지 영향을 미치는가"를 그래프 위에서 직관적으로

#### 4.4 Git 히스토리 타임라인
- 커밋, 브랜치 현황을 **시간축 시각화**
- 브랜치 분기/병합을 그래프로 표현

---

### 5. AI 에이전트 연동 (MCP)

- Rust daemon이 모든 기능을 **tool API**로 노출
- MCP 서버 내장 → Claude Code, Cursor 등에서 직접 호출
- 주요 도구:
  - `get_dependency_graph` — 의존성 그래프 조회
  - `get_flow` — 엔트리 포인트 기반 플로우 추적
  - `generate_context_pack` — 컨텍스트 팩 생성
  - `git_commit` — 커밋 (메시지 자동 생성 옵션)
  - `git_branch` — 브랜치 생성/전환
  - `check_guardrail` — 스코프 위반 확인
  - `get_health_score` — 의존성 점수 조회

---

### 6. 다중 언어 지원

- Tree-sitter 기반 AST 파싱
- 지원 언어: Python, C#, Dart, TypeScript/JavaScript, Rust, Go, ...
- 언어별 파서 모듈로 분리 → 새 언어는 파서만 추가