# Module: backend/guardrail

> 스코프 경계 설정, 위반 감지, 백업/복원.

## 책임
- 스코프 정의 CRUD (`.viber/guardrails.json`)
- 파일 변경 시 스코프 위반 판정
- 변경 전 파일 백업
- 위반 revert (백업에서 복원)

## Public API
```rust
pub fn get_scopes() -> Vec<GuardrailScope>
pub fn create_scope(name: &str, module_ids: &[String]) -> Result<GuardrailScope>
pub fn update_scope(id: &str, patch: ScopePatch) -> Result<GuardrailScope>
pub fn delete_scope(id: &str) -> Result<()>
pub fn get_violations() -> Vec<Violation>
pub fn revert(violation_id: &str) -> Result<()>
pub fn dismiss(violation_id: &str) -> Result<()>
```

## 발행 이벤트
| 이벤트 | Payload | 설명 |
|--------|---------|------|
| `guardrail::Violation` | `Violation` | 스코프 밖 변경 감지 시 |

## 구독 이벤트
| 이벤트 | 발행자 | 처리 |
|--------|--------|------|
| `watcher::FileChanged` | watcher | 스코프 위반 체크 + 백업 |

## 의존 모듈
- `graph` — module_id → 파일 경로 매핑 (쿼리)

## 내부 구조
```
domain/guardrail/
├── mod.rs              # GuardrailService
├── scope.rs            # 스코프 정의/저장
└── violation.rs        # 위반 감지 + 백업/복원
```

## 타입
```rust
pub struct GuardrailScope {
    pub id: String,
    pub name: String,
    pub module_ids: Vec<String>,
    pub paths: Vec<String>,
}
pub struct Violation {
    pub id: String,
    pub scope_id: String,
    pub file: String,
    pub change_kind: ChangeKind,    // Create, Modify, Delete
    pub timestamp: String,
}
pub enum ChangeKind { Create, Modify, Delete }
```

## 백업 전략
- `.viber/backups/{timestamp}_{filename}` 에 변경 전 내용 저장
- 최근 100개까지만 유지 (오래된 것 자동 삭제)
- Delete의 경우 파일 전체 백업
- Create의 경우 revert = 파일 삭제
