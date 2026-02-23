# Module: backend/flow

> 엔트리 포인트부터 호출 체인을 추적하여 플로우 경로를 반환.

## 책임
- 엔트리 → DFS/BFS 호출 체인 추적
- 순방향 + 복귀 경로 계산
- 엔트리 후보 검색 (자동완성)
- 즐겨찾기 CRUD (`.viber/bookmarks.json`)

## Public API
```rust
pub fn trace(entry: &EntryPoint) -> Result<FlowTrace>
pub fn entry_candidates(query: &str) -> Vec<EntryCandidate>
pub fn get_bookmarks() -> Vec<FlowBookmark>
pub fn add_bookmark(name: &str, flow_id: &str) -> Result<FlowBookmark>
pub fn remove_bookmark(id: &str) -> Result<()>
```

## 발행 이벤트
없음 (요청-응답)

## 구독 이벤트
| 이벤트 | 발행자 | 처리 |
|--------|--------|------|
| `graph::Updated` | graph | 내부 호출 인덱스 갱신 |

## 의존 모듈
- `graph` — 그래프 조회 + 호출 관계 (쿼리)
- `parser` — `parse_calls` 결과 참조 (graph 경유)

## 내부 구조
```
domain/flow/
├── mod.rs              # FlowService
├── tracer.rs           # DFS/BFS 호출 체인 추적
└── bookmark.rs         # 즐겨찾기 CRUD
```

## 타입
```rust
pub struct FlowTrace {
    pub id: String,
    pub entry: EntryPoint,
    pub forward_path: Vec<FlowStep>,
    pub return_path: Vec<FlowStep>,
}
pub struct FlowStep {
    pub node_id: String,
    pub symbol: Option<String>,
    pub call_site: Option<Location>,
}
pub struct EntryPoint {
    pub module_id: String,
    pub symbol: String,
}
pub struct Location {
    pub file: String,
    pub line: usize,
}
pub struct FlowBookmark {
    pub id: String,
    pub name: String,
    pub entry: EntryPoint,
    pub created_at: String,
}
pub struct EntryCandidate {
    pub module_id: String,
    pub symbol: String,
    pub path: String,
}
```
