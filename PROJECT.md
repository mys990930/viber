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
| `docs/features/01-project.md` | 프로젝트 열기/설정/파일 감시 |
| `docs/features/02-graph.md` | 의존성 그래프 시각화 |
| `docs/features/03-flow.md` | 유스케이스 플로우 트래킹 |
| `docs/features/04-git.md` | Git 통합 (커밋/브랜치/타임라인) |
| `docs/features/05-guardrail.md` | 가드레일 (스코프/위반/revert) |
| `docs/features/06-score.md` | 의존성 점수 (SOLID) |
| `docs/features/07-context.md` | 컨텍스트 팩 생성 |
| `docs/features/08-mcp.md` | MCP 서버 (에이전트 연동) |
| `docs/features/09-ux.md` | UX/미학 (floating, 테마, undo) |

## 빠른 시작

```bash
pnpm install
pnpm tauri dev
```
