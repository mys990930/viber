# Module: backend/graph

> 의존성 그래프 구축/조회/갱신. 핵심 도메인.

## 책임
- petgraph 기반 방향 그래프 관리
- 파서 결과로 그래프 빌드
- 파일 변경 시 부분 재파싱 → diff 발행
- 깊이별 그래프 조회 (L1 패키지, L2 모듈, L3 심볼)

## Public API
```rust
pub fn get_graph(depth: GraphDepth) -> Graph
pub fn get_node(id: &str) -> Option<GraphNode>
pub fn get_edge_symbols(edge_id: &str) -> Vec<Symbol>
pub fn get_node_detail(node_id: &str) -> NodeDetail
pub fn drill_down(module_id: &str) -> Graph
pub fn rebuild() -> ()                          // 전체 재빌드
```

## 발행 이벤트
| 이벤트 | Payload | 설명 |
|--------|---------|------|
| `graph::Updated` | `GraphDiff` | 그래프 변경 (노드/간선 추가/제거/수정) |

## 구독 이벤트
| 이벤트 | 발행자 | 처리 |
|--------|--------|------|
| `watcher::FileChanged` | watcher | 해당 파일 재파싱 → 그래프 부분 갱신 → diff 발행 |
| `project::Opened` | project | 전체 빌드 시작 |
| `project::Closed` | project | 그래프 초기화 |

## 의존 모듈
- `parser` — import/심볼 파싱 (직접 호출, 쿼리)
- `watcher` — 파일 변경 수신 (이벤트 구독)

## 내부 구조
```
domain/graph/
├── mod.rs              # GraphService
├── builder.rs          # 파서 결과 → 그래프 빌드
└── diff.rs             # GraphDiff 계산
```

## 타입
```rust
pub struct Graph {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}
pub enum GraphNode {
    Package { id: String, name: String, version: Option<String> },
    Module { id: String, path: PathBuf, language: Language },
    File { id: String, path: PathBuf, language: Language },
}
pub struct GraphEdge {
    pub id: String,
    pub source: String,
    pub target: String,
    pub kind: EdgeKind,
}
pub enum EdgeKind { PackageDep, ModuleImport, FileImport }
pub enum GraphDepth { Packages, Modules, Files }
pub struct GraphDiff {
    pub added_nodes: Vec<GraphNode>,
    pub removed_nodes: Vec<String>,
    pub added_edges: Vec<GraphEdge>,
    pub removed_edges: Vec<String>,
    pub updated_nodes: Vec<GraphNode>,
}
pub struct NodeDetail {
    pub id: String,
    pub path: PathBuf,
    pub language: Language,
    pub imports: Vec<ImportInfo>,
    pub exports: Vec<Symbol>,
    pub loc: usize,
}
```
