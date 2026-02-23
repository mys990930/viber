# Module: backend/watcher

> 파일 시스템 변경 감지. 모든 실시간 기능의 기반.

## 책임
- 프로젝트 디렉토리 재귀 감시
- 파일 변경 이벤트 발행 (debounce 포함)
- 제외 경로 필터링

## Public API
```rust
pub fn start(root: &Path, excluded: &[GlobPattern]) → WatcherHandle
pub fn stop(handle: WatcherHandle)
```

## 발행 이벤트
| 이벤트 | Payload | 설명 |
|--------|---------|------|
| `watcher::FileChanged` | `FileEvent { path, kind, timestamp }` | 파일 생성/수정/삭제/이름변경 |

## 구독 이벤트
없음 (최하위 인프라)

## 의존 모듈
없음

## 내부 구조
```
infra/watcher/
└── mod.rs
```
- `notify::RecommendedWatcher` 사용
- debounce: 같은 파일 100ms 내 중복 무시
- `.git/`, `node_modules/`, `.viber/backups/` 기본 제외
- `FileEvent.kind`: Create, Modify, Delete, Rename
