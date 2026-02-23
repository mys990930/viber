# Module: backend/git

> Git 조작 전체. 커밋, 브랜치, 스테이징, diff, AI 메시지, 타임라인.

## 책임
- git2-rs 기반 Git 조작
- 파일/폴더 단위 선택 스테이징
- 커밋 + 옵션 푸시
- 브랜치 CRUD
- AI 커밋 메시지 생성 (LLM 호출)
- Diff → 영향 모듈/플로우 계산
- 커밋/브랜치 타임라인 조회

## Public API
```rust
// 기본 (Phase 2)
pub fn status() -> GitStatus
pub fn stage(paths: &[PathBuf]) -> Result<()>
pub fn unstage(paths: &[PathBuf]) -> Result<()>
pub fn commit(req: CommitRequest) -> Result<CommitResult>
pub fn branches() -> Vec<BranchInfo>
pub fn create_branch(name: &str, checkout: bool) -> Result<()>
pub fn checkout(branch: &str) -> Result<()>

// 고급 (Phase 5)
pub fn generate_message(paths: Option<&[PathBuf]>) -> Result<String>
pub fn diff_impact(source: DiffSource, target: Option<&str>) -> Result<DiffImpact>
pub fn timeline(limit: usize) -> GitTimeline
```

## 발행 이벤트
| 이벤트 | Payload | 설명 |
|--------|---------|------|
| `git::StatusChanged` | `GitStatus` | 커밋/체크아웃/스테이징 후 |

## 구독 이벤트
| 이벤트 | 발행자 | 처리 |
|--------|--------|------|
| `watcher::FileChanged` | watcher | status 캐시 무효화 |

## 의존 모듈
- `graph` — diff impact 계산 시 그래프 조회 (쿼리)
- `flow` — diff impact 계산 시 북마크된 플로우 조회 (쿼리)
- `project` — LLM 설정 참조 (쿼리)

## 내부 구조
```
domain/git/
├── mod.rs              # GitService
├── commit.rs           # 커밋/스테이징
├── branch.rs           # 브랜치 관리
├── impact.rs           # DiffImpact 계산
└── llm.rs              # AI 커밋 메시지 생성
```

## 타입
```rust
pub struct GitStatus {
    pub branch: String,
    pub ahead: usize,
    pub behind: usize,
    pub staged: Vec<String>,
    pub modified: Vec<String>,
    pub untracked: Vec<String>,
}
pub struct CommitRequest {
    pub message: Option<String>,
    pub paths: Vec<PathBuf>,
    pub push: bool,
}
pub struct CommitResult {
    pub hash: String,
    pub message: String,
}
pub enum DiffSource { Working, Staged, Commit(String) }
pub struct DiffImpact {
    pub changed_files: Vec<String>,
    pub affected_modules: Vec<String>,
    pub affected_flows: Vec<String>,
}
pub struct GitTimeline {
    pub commits: Vec<CommitInfo>,
    pub branches: Vec<BranchInfo>,
}
pub struct CommitInfo {
    pub hash: String,
    pub message: String,
    pub author: String,
    pub timestamp: String,
    pub changed_files: Vec<String>,
}
pub struct BranchInfo {
    pub name: String,
    pub head: String,
    pub current: bool,
    pub merge_base: Option<String>,
}
```
