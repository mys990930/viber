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
| `docs/API.md` | FE ↔ BE 통신 스펙 전체 |
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

## 빠른 시작

```bash
pnpm install
pnpm tauri dev
```
