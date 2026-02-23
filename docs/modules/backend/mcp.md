# Module: backend/mcp

> Viber 기능을 MCP 프로토콜로 노출. AI 에이전트 연동.

## 책임
- MCP 프로토콜 서버 (stdio transport)
- 기존 도메인 서비스 → MCP tool 래핑
- 서버 시작/중지
- 연결 상태 관리

## Public API
```rust
pub fn start() -> Result<McpHandle>
pub fn stop(handle: McpHandle) -> Result<()>
pub fn status() -> McpStatus
```

## 발행 이벤트
없음

## 구독 이벤트
없음 (에이전트 요청을 받아서 다른 모듈의 Public API를 호출)

## 의존 모듈
- `graph` — 그래프 조회 도구
- `flow` — 플로우 추적 도구
- `git` — Git 조작 도구
- `guardrail` — 위반 확인 도구
- `context` — 컨텍스트 생성 도구
- `score` — 점수 조회 도구
- `project` — MCP 설정 참조

## 노출 도구 (MCP Tools)

| Tool Name | 매핑 모듈 | 매핑 API |
|-----------|----------|----------|
| `graph_get` | graph | `get_graph` |
| `graph_edge_symbols` | graph | `get_edge_symbols` |
| `graph_node_detail` | graph | `get_node_detail` |
| `flow_trace` | flow | `trace` |
| `flow_bookmarks` | flow | `get_bookmarks` |
| `git_status` | git | `status` |
| `git_commit` | git | `commit` |
| `git_branch` | git | `create_branch` |
| `git_diff_impact` | git | `diff_impact` |
| `guardrail_violations` | guardrail | `get_violations` |
| `guardrail_revert` | guardrail | `revert` |
| `context_generate` | context | `generate` |
| `score_get` | score | `get_score` |

## 내부 구조
```
infra/mcp/
└── mod.rs              # MCP 서버 + tool 등록
```

## 타입
```rust
pub struct McpStatus {
    pub running: bool,
    pub connections: usize,
}
```
