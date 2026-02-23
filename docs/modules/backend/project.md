# Module: backend/project

> 프로젝트 열기/닫기, 설정 관리, .viber/ 디렉토리 관리.

## 책임
- 프로젝트 루트 경로 관리
- `.viber/` 초기화 (없으면 생성)
- `config.json` CRUD
- Watcher 시작/중지 트리거

## Public API
```rust
pub fn open(path: &Path) -> Result<ProjectInfo>
pub fn close() -> Result<()>
pub fn get_config() -> Result<ViberConfig>
pub fn update_config(patch: PartialConfig) -> Result<ViberConfig>
pub fn recent_projects() -> Vec<RecentProject>
```

## 발행 이벤트
| 이벤트 | Payload | 설명 |
|--------|---------|------|
| `project::Opened` | `ProjectInfo` | 프로젝트 열림 |
| `project::Closed` | — | 프로젝트 닫힘 |
| `project::ConfigChanged` | `ViberConfig` | 설정 변경됨 |

## 구독 이벤트
없음

## 의존 모듈
- `watcher` — 프로젝트 열 때 감시 시작, 닫을 때 중지

## 내부 구조
```
domain/project/
├── mod.rs              # ProjectService
└── config.rs           # ViberConfig, .viber/ 관리
```

## 타입
```rust
pub struct ViberConfig {
    pub languages: Vec<Language>,
    pub llm: Option<LlmConfig>,
    pub excluded_paths: Vec<String>,
}
pub struct LlmConfig {
    pub provider: String,           // "openai", "anthropic", "local"
    pub model: String,
    pub api_key_env: String,
}
pub struct ProjectInfo {
    pub name: String,
    pub root: PathBuf,
    pub languages: Vec<Language>,
    pub config: ViberConfig,
}
```
