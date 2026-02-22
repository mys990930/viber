# Feature 05 — 가드레일

> 스코프 경계를 설정하고, 밖에서 변경이 생기면 즉시 알림 + revert.

---

## 백엔드

### GuardrailService
- 파일 변경 이벤트 구독
- 각 변경이 정의된 스코프 내인지 판정
- 위반 시: 변경 전 파일 백업 + 이벤트 발행

### 타입
```rust
pub struct GuardrailScope {
    pub id: ScopeId,
    pub name: String,
    pub module_ids: Vec<ModuleId>,
    pub paths: Vec<String>,             // glob 패턴으로도 지정 가능
}
pub struct Violation {
    pub id: String,
    pub scope_id: ScopeId,
    pub file: PathBuf,
    pub change_kind: ChangeKind,        // Create, Modify, Delete
    pub timestamp: String,
}
pub struct RevertAction {
    pub violation_id: String,
    pub backup_path: PathBuf,           // .viber/backups/ 하위
}
```

### 백업 전략
- 파일 변경 감지 시 **변경 전** 내용을 `.viber/backups/{timestamp}_{filename}` 에 저장
- revert 요청 시 백업에서 복원
- 백업은 최근 100개까지만 유지 (오래된 것 자동 삭제)

---

## 프론트엔드

### ScopeDrawer
- 그래프 위에서 드래그로 영역 선택 → 내부 노드가 스코프에 포함
- 또는 노드 다중 선택 (Shift+클릭)
- "Save Scope" → 이름 입력 → 저장

### ScopeList
- 사이드바에 정의된 스코프 목록
- 활성/비활성 토글
- 클릭 → 그래프에서 해당 스코프 하이라이트 (밖은 dim)

### ViolationAlert
- 위반 발생 시 우하단 토스트
- 빨간 경고 + 파일명 + 변경 종류
- "Revert" / "Dismiss" 버튼

### RevertButton
- 원클릭으로 `guardrail:revert` 호출
- 성공 시 "Reverted" 피드백

---

## API

```typescript
invoke('guardrail:scopes') → GuardrailScope[]
invoke('guardrail:create_scope', { name, moduleIds }) → GuardrailScope
invoke('guardrail:update_scope', { id, name?, moduleIds? }) → GuardrailScope
invoke('guardrail:delete_scope', { id }) → void
invoke('guardrail:violations') → Violation[]
invoke('guardrail:revert', { violationId }) → { success }
invoke('guardrail:dismiss', { violationId }) → void

listen('guardrail:violation', (e: Violation) => void)
```
