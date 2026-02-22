# Feature 03 — 유스케이스 플로우 트래킹

> 엔트리 포인트를 찍으면 호출 체인을 따라가며 경로를 시각화한다.

---

## 백엔드

### FlowService
- GraphService 참조 (Arc<RwLock>)
- 엔트리 → DFS로 호출 체인 추적
- 순방향 경로 + 복귀 경로 계산

### 타입
```rust
pub struct FlowTrace {
    pub id: FlowId,
    pub entry: EntryPoint,
    pub forward_path: Vec<FlowStep>,
    pub return_path: Vec<FlowStep>,
}
pub struct FlowStep {
    pub node_id: ModuleId,
    pub symbol: Option<String>,
    pub call_site: Option<Location>,    // file:line
}
pub struct EntryPoint {
    pub module: ModuleId,
    pub symbol: String,
}
pub struct FlowBookmark {
    pub id: String,
    pub name: String,
    pub entry: EntryPoint,
    pub created_at: String,
}
```

### 엔트리 후보
- `flow:entry_candidates` — 쿼리 문자열로 프로젝트 내 함수/클래스 검색
- Tree-sitter의 `parse_calls` 결과 인덱스 활용

---

## 프론트엔드

### EntryPicker
- 검색 입력 → 자동완성 드롭다운 (함수/클래스 목록)
- 또는 그래프 노드에서 우클릭 → "Trace from here"

### FlowOverlay
- 그래프 위에 반투명 오버레이로 경로 하이라이트
- 경로 밖 노드는 opacity 낮춤

### FlowAnimation
- 점선이 경로를 따라 이동하는 애니메이션
- 속도 옵션: slow(0.5x) / normal(1x) / fast(2x)
- 스타일 옵션: dash / pulse / particle
- 재생/일시정지/스텝 컨트롤

### BookmarkList
- 사이드바에 즐겨찾기 목록
- 클릭 → 해당 플로우 즉시 재실행 + 애니메이션

---

## API

```typescript
invoke('flow:trace', { moduleId: string, symbol: string })
  → FlowTrace

invoke('flow:entry_candidates', { query: string })
  → { moduleId: string, symbol: string, path: string }[]

invoke('flow:bookmarks') → FlowBookmark[]

invoke('flow:add_bookmark', { name: string, flowId: string })
  → FlowBookmark

invoke('flow:remove_bookmark', { id: string }) → void
```
