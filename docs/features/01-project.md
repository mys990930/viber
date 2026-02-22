# Feature 01 — 프로젝트 관리

> 프로젝트 열기, 설정, 파일 감시. 모든 기능의 전제 조건.

---

## 백엔드

### ProjectService
- 프로젝트 루트 경로 관리
- `.viber/` 디렉토리 초기화 (없으면 생성)
- `config.json` 로드/저장

### ViberConfig
```rust
pub struct ViberConfig {
    pub languages: Vec<Language>,
    pub llm: Option<LlmConfig>,
    pub excluded_paths: Vec<String>,    // glob 패턴
}
pub struct LlmConfig {
    pub provider: String,               // "openai", "anthropic", "local"
    pub model: String,
    pub api_key_env: String,            // 환경변수 이름
}
```

### FileWatcher (infra)
- `notify` crate 사용
- `excluded_paths` 필터링
- `FileEvent { path, kind, timestamp }` 발행
- debounce: 같은 파일 100ms 내 중복 무시

---

## 프론트엔드

### ProjectSelector
- "Open Project" 버튼 → Tauri 파일 다이얼로그
- 최근 프로젝트 목록 (localStorage)

### SettingsPanel
- 활성 언어 토글
- LLM 설정 (provider, model)
- 제외 경로 편집

---

## API

```typescript
invoke('project:open', { path: string })
  → { name, root, languages, config }

invoke('project:close') → void

invoke('project:get_config') → ViberConfig

invoke('project:update_config', { config: Partial<ViberConfig> })
  → ViberConfig

invoke('project:recent') → { path, name, lastOpened }[]

listen('project:file_changed', (e: FileEvent) => void)
```
