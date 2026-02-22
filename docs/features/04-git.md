# Feature 04 — Git 통합

> 퀵 커밋/브랜치 + AI 메시지 + diff impact + 타임라인.

---

## 백엔드

### GitService
- `git2::Repository` 래핑
- 모든 Git 조작은 이 서비스를 통해서만

### 기본 조작
```rust
pub struct CommitRequest {
    pub message: Option<String>,    // None → LLM 생성
    pub paths: Vec<PathBuf>,        // 빈 배열 → 전체 staged
    pub push: bool,
}
```
- 파일/폴더 단위 선택 스테이징
- 커밋 + 옵션 푸시
- 브랜치 생성/전환/삭제

### AI 커밋 메시지 (Phase 5)
- diff 추출 → LLM API 호출 → 메시지 반환
- LLM 설정은 ViberConfig에서 (provider, model, api_key_env)
- 미리보기 → 유저 수정 가능 → 확정

### DiffImpact (Phase 5)
```rust
pub struct DiffImpact {
    pub changed_files: Vec<PathBuf>,
    pub affected_modules: Vec<ModuleId>,    // GraphService 참조
    pub affected_flows: Vec<FlowId>,        // 북마크된 플로우 중
}
```
- 워킹트리 / staged / 특정 커밋 간 diff → 영향 모듈 계산

### 타임라인 (Phase 5)
```rust
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
    pub merge_base: Option<String>,
}
```

---

## 프론트엔드

### GitPanel (사이드바)
- 현재 브랜치 + ahead/behind
- Modified / Untracked 파일 목록

### CommitForm
- 메시지 입력 (또는 "AI 생성" 버튼)
- 파일 체크박스로 선택 커밋
- 폴더 체크 → 하위 전체 선택
- "Commit" / "Commit & Push" 버튼

### AiMessage (Phase 5)
- "Generate" 클릭 → 스피너 → 메시지 미리보기
- 편집 가능 → "Accept" 클릭

### DiffImpact (Phase 5)
- 커밋/브랜치/변경 선택 → 그래프에 영향 모듈 하이라이트
- 빨간 글로우로 영향 범위 표시

### Timeline (Phase 5)
- 가로 시간축, 커밋 = 점, 브랜치 = 선
- 커밋 hover → 변경 파일 목록
- 커밋 클릭 → diff impact 표시

### StatusBar
- 좌측: 브랜치명 + 상태 아이콘
- "3 modified" 등 요약

---

## API

```typescript
// 기본 (Phase 2)
invoke('git:status') → GitStatus
invoke('git:stage', { paths: string[] }) → void
invoke('git:unstage', { paths: string[] }) → void
invoke('git:commit', { message?, paths?, push? }) → { hash, message }
invoke('git:branches') → BranchInfo[]
invoke('git:create_branch', { name, checkout? }) → void
invoke('git:checkout', { branch }) → void

// 고급 (Phase 5)
invoke('git:generate_message', { paths? }) → { message }
invoke('git:diff_impact', { source?, target? }) → DiffImpact
invoke('git:timeline', { limit? }) → GitTimeline

// 이벤트
listen('git:status_changed', (e: GitStatus) => void)
```
