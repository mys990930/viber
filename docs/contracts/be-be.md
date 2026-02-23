# Contract: Backend ↔ Backend 모듈 간 통신 규약

---

## 원칙

1. **직접 함수 호출은 읽기 전용 쿼리만 허용**
2. **상태 변경 알림은 반드시 이벤트 버스를 통해**
3. **순환 의존 금지** — 이벤트로 우회

---

## 이벤트 버스

### 이벤트 정의

| 이벤트 | 발행자 | Payload |
|--------|--------|---------|
| `watcher::FileChanged` | watcher | `FileEvent { path, kind, timestamp }` |
| `project::Opened` | project | `ProjectInfo` |
| `project::Closed` | project | — |
| `project::ConfigChanged` | project | `ViberConfig` |
| `graph::Updated` | graph | `GraphDiff` |
| `git::StatusChanged` | git | `GitStatus` |
| `guardrail::Violation` | guardrail | `Violation` |
| `score::Updated` | score | `HealthScore` |

### 구독 매트릭스

| 구독자 ↓ \ 이벤트 → | FileChanged | Opened | Closed | ConfigChanged | graph::Updated | git::StatusChanged |
|----------------------|:-----------:|:------:|:------:|:-------------:|:--------------:|:------------------:|
| graph | ✓ | ✓ | ✓ | | | |
| guardrail | ✓ | | | | | |
| git | ✓ | | | | | |
| flow | | | | | ✓ | |
| score | | | | | ✓ | |
| → FE push | ✓ | ✓ | | | ✓ | ✓ |
| → FE push | | | | | | |
| → FE push (guardrail) | | | | | | |
| → FE push (score) | | | | | | |

### 이벤트 흐름 예시

```
파일 수정됨
  → watcher::FileChanged
      ├→ graph: 해당 파일 재파싱 → graph::Updated 발행
      │    ├→ flow: 호출 인덱스 갱신
      │    ├→ score: 메트릭 재계산 → score::Updated 발행
      │    └→ FE: graph:updated push
      ├→ guardrail: 스코프 위반 체크
      │    └→ 위반 시 guardrail::Violation → FE: guardrail:violation push
      └→ git: status 캐시 무효화 → git::StatusChanged
           └→ FE: git:status_changed push
```

---

## 쿼리 (직접 호출, 읽기 전용)

| 호출자 | 대상 | 메서드 | 용도 |
|--------|------|--------|------|
| graph | parser | `parse_imports`, `parse_symbols`, `parse_calls` | 파일 파싱 |
| flow | graph | `get_graph`, `get_node` | 호출 체인 추적 |
| score | graph | `get_graph` | 메트릭 계산 |
| context | graph | `get_graph`, `get_node_detail` | 컨텍스트 생성 |
| context | flow | `trace`, `get_bookmarks` | 플로우 정보 포함 |
| git.impact | graph | `get_graph` | 영향 모듈 매핑 |
| git.impact | flow | `get_bookmarks` | 영향 플로우 매핑 |
| guardrail | graph | `get_node` | module_id → 파일 경로 |
| mcp | (all) | 각 모듈 Public API | MCP tool 래핑 |

### 쿼리 의존 다이어그램

```
parser ← graph ← flow
                ← score
                ← context (+ flow)
                ← git.impact (+ flow)
                ← guardrail
                ← mcp (all)
```

**규칙:** 화살표 역방향 호출 금지. 역방향이 필요하면 이벤트를 사용.

---

## 이벤트 버스 구현

```rust
// shared/event.rs
pub enum ViberEvent {
    FileChanged(FileEvent),
    ProjectOpened(ProjectInfo),
    ProjectClosed,
    ConfigChanged(ViberConfig),
    GraphUpdated(GraphDiff),
    GitStatusChanged(GitStatus),
    GuardrailViolation(Violation),
    ScoreUpdated(HealthScore),
}

// tokio::broadcast::channel 기반
pub struct EventBus {
    tx: broadcast::Sender<ViberEvent>,
}
impl EventBus {
    pub fn emit(&self, event: ViberEvent);
    pub fn subscribe(&self) -> broadcast::Receiver<ViberEvent>;
}
```

각 서비스는 생성 시 EventBus를 주입받아 구독/발행.
