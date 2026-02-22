# Feature 08 — MCP 서버 (에이전트 연동)

> Viber의 모든 기능을 MCP 프로토콜로 노출하여 AI 에이전트가 직접 호출.

---

## 백엔드

### MCP 서버 구현
- stdio transport (Claude Code, Cursor 등 로컬 에이전트용)
- SSE transport (원격 에이전트용, 선택)
- 기존 도메인 서비스의 command를 MCP tool로 래핑

### 노출 도구

| MCP Tool | 매핑 Command | 설명 |
|----------|-------------|------|
| `graph_get` | `graph:get` | 의존성 그래프 조회 |
| `graph_edge_symbols` | `graph:edge_symbols` | 간선 심볼 조회 |
| `graph_node_detail` | `graph:node_detail` | 노드 상세 |
| `flow_trace` | `flow:trace` | 플로우 추적 |
| `flow_bookmarks` | `flow:bookmarks` | 즐겨찾기 목록 |
| `git_status` | `git:status` | Git 상태 |
| `git_commit` | `git:commit` | 커밋 (AI 메시지 옵션) |
| `git_branch` | `git:create_branch` | 브랜치 생성 |
| `git_diff_impact` | `git:diff_impact` | 변경 영향 범위 |
| `guardrail_check` | `guardrail:violations` | 위반 확인 |
| `guardrail_revert` | `guardrail:revert` | 위반 복원 |
| `context_generate` | `context:generate` | 컨텍스트 팩 생성 |
| `score_get` | `score:get` | 건강도 점수 |

### 설정
- MCP 서버 on/off (ViberConfig)
- 포트/transport 설정
- 도구 허용 목록 (어떤 tool을 노출할지)

---

## 프론트엔드

### MCP 설정 UI (SettingsPanel 내)
- 서버 on/off 토글
- 연결 상태 표시 (연결된 에이전트 수)
- 허용 도구 체크박스

---

## API

```typescript
invoke('mcp:start') → { port?: number }
invoke('mcp:stop') → void
invoke('mcp:status') → { running, connections: number }
invoke('mcp:config', { tools?: string[] }) → void
```
