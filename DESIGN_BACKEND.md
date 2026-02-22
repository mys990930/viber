# Backend Design — Rust (Tauri)

> DDD 기반 도메인 분리. 각 도메인은 독립적인 모듈로, Tauri IPC command를 통해 프론트엔드와 통신한다.

---

## 도메인 맵

```
src-tauri/src/
├── main.rs                     # 엔트리포인트
├── lib.rs                      # Tauri 앱 빌더 + command 등록
├── domain/
│   ├── project/                # 프로젝트 관리
│   ├── graph/                  # 의존성 그래프
│   ├── flow/                   # 유스케이스 플로우
│   ├── git/                    # Git 조작
│   ├── guardrail/              # 가드레일
│   ├── score/                  # 의존성 점수
│   └── context/                # 컨텍스트 팩
├── infra/
│   ├── watcher/                # 파일 감시 (notify)
│   ├── parser/                 # Tree-sitter 파서
│   │   ├── mod.rs              # ParserRegistry trait
│   │   ├── python.rs
│   │   ├── typescript.rs
│   │   ├── csharp.rs
│   │   └── dart.rs
│   └── mcp/                    # MCP 서버
└── shared/
    ├── types.rs                # 공통 타입 (ModuleId, NodeId, Edge 등)
    ├── error.rs                # 통합 에러 타입
    └── event.rs                # 이벤트 버스 정의
```

---

## 1. Domain: Project

프로젝트 열기/닫기, 설정 관리, `.viber/` 디렉토리 관리.

```rust
// domain/project/mod.rs
pub struct ProjectService {
    root: PathBuf,
    config: ViberConfig,
    watcher_handle: WatcherHandle,
}

pub struct ViberConfig {
    languages: Vec<Language>,       // 활성화된 언어
    llm: LlmConfig,                // 커밋 메시지용 LLM 설정
    excluded_paths: Vec<GlobPattern>,
}

// .viber/ 구조
pub struct ProjectState {
    layout: LayoutState,            // 노드 위치
    bookmarks: Vec<FlowBookmark>,   // 유스케이스 즐겨찾기
    guardrails: Vec<GuardrailScope>,
}
```

**책임:**
- 프로젝트 루트 경로 관리
- `.viber/` 디렉토리 초기화/로드/저장
- Watcher 시작/중지 트리거
- 설정 변경 이벤트 발행

---

## 2. Domain: Graph

의존성 그래프 구축/조회. 핵심 도메인.

```rust
// domain/graph/mod.rs
pub struct GraphService {
    graph: DiGraph<GraphNode, GraphEdge>,  // petgraph
    index: HashMap<ModuleId, NodeIndex>,
}

pub enum GraphNode {
    Package { name: String, version: Option<String> },
    Module  { id: ModuleId, path: PathBuf, language: Language },
    File    { path: PathBuf, language: Language },
}

pub struct GraphEdge {
    kind: EdgeKind,
    symbols: Vec<Symbol>,           // 지연 로딩됨
}

pub enum EdgeKind {
    PackageDep,                     // 외부 패키지 의존
    ModuleImport,                   // 모듈 import
    FileImport,                     // 파일 간 import
}

pub struct Symbol {
    name: String,
    kind: SymbolKind,               // Function, Class, Variable, Type
    line: usize,
}

// 3단계 로딩
pub enum GraphDepth {
    Packages,                       // L1: 패키지만
    Modules,                        // L2: 모듈 import
    Symbols { module: ModuleId },   // L3: 특정 모듈 심볼 (지연)
}
```

**책임:**
- Parser 결과를 받아 그래프 구축
- 노드/간선 CRUD
- 깊이별 그래프 조회 (3단계)
- 파일 변경 이벤트 수신 → 부분 재파싱 → 그래프 갱신
- 변경된 노드/간선 diff 이벤트 발행

---

## 3. Domain: Flow

유스케이스 플로우 트래킹. 엔트리 포인트부터 호출 체인 추적.

```rust
// domain/flow/mod.rs
pub struct FlowService {
    graph: Arc<RwLock<GraphService>>,
}

pub struct FlowTrace {
    id: FlowId,
    entry: EntryPoint,
    path: Vec<FlowStep>,            // 순서대로
    return_path: Vec<FlowStep>,     // 복귀 경로
}

pub struct FlowStep {
    node: ModuleId,
    symbol: Option<Symbol>,
    call_site: Option<Location>,    // 파일:줄
}

pub struct EntryPoint {
    module: ModuleId,
    symbol: String,                 // 함수명 등
}

pub struct FlowBookmark {
    name: String,
    entry: EntryPoint,
    created_at: DateTime<Utc>,
}
```

**책임:**
- 엔트리 포인트 → 호출 체인 DFS/BFS 추적
- 순방향 + 복귀 경로 계산
- 즐겨찾기 CRUD (`.viber/bookmarks.json`)
- 플로우 결과를 프론트에 전달 (애니메이션 데이터 포함)

---

## 4. Domain: Git

Git 조작 전체. 커밋, 브랜치, diff, 히스토리.

```rust
// domain/git/mod.rs
pub struct GitService {
    repo: git2::Repository,
    llm: Option<LlmClient>,        // 커밋 메시지 생성용
}

pub struct CommitRequest {
    message: Option<String>,        // None이면 LLM 생성
    paths: Vec<PathBuf>,            // 빈 배열 = 전체, 아니면 선택 커밋
    push: bool,
}

pub struct DiffImpact {
    changed_files: Vec<PathBuf>,
    affected_modules: Vec<ModuleId>,
    affected_flows: Vec<FlowId>,
}

pub struct GitTimeline {
    commits: Vec<CommitInfo>,
    branches: Vec<BranchInfo>,
    head: String,
}

pub struct CommitInfo {
    hash: String,
    message: String,
    author: String,
    timestamp: DateTime<Utc>,
    changed_files: Vec<PathBuf>,
}
```

**책임:**
- 커밋 (전체/폴더/파일 단위 선택)
- 브랜치 생성/전환/삭제
- diff → 영향받는 모듈/플로우 계산 (Graph/Flow 도메인 참조)
- LLM 커밋 메시지 생성
- 히스토리/타임라인 조회
- 워킹트리 상태 조회

---

## 5. Domain: Guardrail

스코프 경계 설정 + 위반 감지.

```rust
// domain/guardrail/mod.rs
pub struct GuardrailService {
    scopes: Vec<GuardrailScope>,
    watcher: Arc<WatcherHandle>,
}

pub struct GuardrailScope {
    id: ScopeId,
    name: String,
    included_modules: Vec<ModuleId>,
    included_paths: Vec<GlobPattern>,   // 경계 드로잉 → 경로로 변환
}

pub enum Violation {
    OutOfScope {
        scope: ScopeId,
        changed_file: PathBuf,
        change_kind: ChangeKind,        // Create, Modify, Delete
        timestamp: DateTime<Utc>,
    },
}

pub struct RevertAction {
    violation: Violation,
    backup_path: PathBuf,               // 변경 전 상태 백업
}
```

**책임:**
- 스코프 정의 CRUD (`.viber/guardrails.json`)
- 파일 변경 이벤트 수신 → 스코프 위반 판정
- 위반 시 즉시 이벤트 발행 (프론트 알림)
- 변경 전 파일 백업 → revert 제공

---

## 6. Domain: Score

의존성 건강도 점수. SOLID 원칙 기반.

```rust
// domain/score/mod.rs
pub struct ScoreService {
    graph: Arc<RwLock<GraphService>>,
}

pub struct HealthScore {
    overall: f64,                       // 0.0 ~ 100.0
    metrics: ScoreMetrics,
}

pub struct ScoreMetrics {
    single_responsibility: f64,         // 모듈 크기/역할 수
    dependency_inversion: f64,          // 추상화 방향
    circular_dependencies: Vec<Cycle>,  // 순환 의존성 목록
    coupling: f64,                      // 결합도 (낮을수록 좋음)
    cohesion: f64,                      // 응집도 (높을수록 좋음)
}

pub struct Cycle {
    modules: Vec<ModuleId>,             // 순환 경로
}
```

**책임:**
- 그래프 기반 메트릭 계산
- 순환 의존성 탐지 (Tarjan's algorithm)
- 결합도/응집도 계산
- 점수 변화 추이 (커밋 단위)

---

## 7. Domain: Context

LLM용 컨텍스트 팩 생성.

```rust
// domain/context/mod.rs
pub struct ContextService {
    graph: Arc<RwLock<GraphService>>,
    flow: Arc<FlowService>,
}

pub enum ContextFormat {
    Markdown,                           // 구조화된 .md
    Prompt,                             // 복붙용 짧은 프롬프트
}

pub struct ContextPack {
    format: ContextFormat,
    content: String,
    included_modules: Vec<ModuleId>,
    token_estimate: usize,              // 대략적 토큰 수
}

pub struct ContextRequest {
    modules: Vec<ModuleId>,             // 선택한 모듈
    flow: Option<FlowId>,              // 특정 플로우 포함 시
    format: ContextFormat,
    max_tokens: Option<usize>,          // 토큰 제한
}
```

**책임:**
- 선택 모듈/플로우 → 구조화된 컨텍스트 텍스트 생성
- 토큰 추정
- 클립보드 복사용 포맷팅

---

## Infra: Watcher

```rust
// infra/watcher/mod.rs
pub struct FileWatcher {
    rx: Receiver<FileEvent>,
    // notify::RecommendedWatcher 내부
}

pub struct FileEvent {
    path: PathBuf,
    kind: FileEventKind,                // Create, Modify, Delete, Rename
    timestamp: Instant,
}
```

이벤트 흐름:
```
FileEvent → EventBus
  ├─→ GraphService (재파싱)
  ├─→ GuardrailService (위반 체크)
  └─→ Frontend (WebSocket push)
```

---

## Infra: Parser

```rust
// infra/parser/mod.rs
pub trait LanguageParser: Send + Sync {
    fn language(&self) -> Language;
    fn parse_imports(&self, source: &str) -> Vec<ImportInfo>;
    fn parse_symbols(&self, source: &str) -> Vec<Symbol>;
    fn parse_calls(&self, source: &str) -> Vec<CallInfo>;    // 플로우용
}

pub struct ImportInfo {
    source: String,                     // 모듈/패키지 경로
    symbols: Vec<String>,              // import된 심볼
    is_external: bool,                  // 외부 패키지 여부
    line: usize,
}

pub struct CallInfo {
    caller: String,
    callee: String,
    line: usize,
}

pub struct ParserRegistry {
    parsers: HashMap<Language, Box<dyn LanguageParser>>,
}
```

---

## Shared: Event Bus

도메인 간 통신 + 프론트엔드 푸시.

```rust
// shared/event.rs
pub enum ViberEvent {
    // Graph
    GraphUpdated { diff: GraphDiff },
    
    // Watcher
    FileChanged { event: FileEvent },
    
    // Guardrail
    ScopeViolation { violation: Violation },
    
    // Git
    GitStatusChanged { status: GitStatus },
    
    // Score
    ScoreUpdated { score: HealthScore },
}

pub struct GraphDiff {
    added_nodes: Vec<GraphNode>,
    removed_nodes: Vec<NodeIndex>,
    added_edges: Vec<(NodeIndex, NodeIndex, GraphEdge)>,
    removed_edges: Vec<EdgeIndex>,
    updated_nodes: Vec<(NodeIndex, GraphNode)>,
}
```

프론트엔드 전달: Tauri의 `app.emit()` → 프론트에서 `listen()`.

---

## 의존성 그래프 (도메인 간)

```
Project ──────→ Watcher (시작/중지)
    │
    ├─→ Graph ←── Parser (파싱 결과)
    │     ↑
    │     │ (파일 변경)
    │   Watcher ──→ Guardrail (위반 체크)
    │     │
    │     ↓
    │   Flow ←── Graph (그래프 조회)
    │     │
    │     ↓
    │   Context ←── Graph + Flow
    │
    ├─→ Git ──→ Graph (diff impact)
    │         ──→ Flow (영향 플로우)
    │
    └─→ Score ←── Graph (메트릭 계산)
```
