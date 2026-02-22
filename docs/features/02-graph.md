# Feature 02 — 의존성 그래프 시각화

> 핵심 기능. 모듈 간 의존 관계를 인터랙티브 그래프로 보여준다.

---

## 백엔드

### GraphService
- `petgraph::DiGraph<GraphNode, GraphEdge>` 기반
- 노드 인덱스 캐시: `HashMap<ModuleId, NodeIndex>`

### 타입
```rust
pub enum GraphNode {
    Package { name: String, version: Option<String> },
    Module { id: ModuleId, path: PathBuf, language: Language },
    File { path: PathBuf, language: Language },
}

pub struct GraphEdge {
    pub kind: EdgeKind,                 // PackageDep, ModuleImport, FileImport
    pub symbols: Vec<Symbol>,           // L3 지연 로딩
}

pub struct Symbol {
    pub name: String,
    pub kind: SymbolKind,               // Function, Class, Variable, Type, Interface
    pub line: usize,
}
```

### 3단계 로딩
1. **L1 Packages** — `requirements.txt`, `pyproject.toml` 등에서 추출
2. **L2 Modules** — `import`, `from x import y` 파싱
3. **L3 Symbols** — 특정 간선 hover 시 해당 모듈 심볼 파싱 (지연)

### GraphDiff
파일 변경 시 전체 재빌드가 아닌 **부분 업데이트**:
```rust
pub struct GraphDiff {
    pub added_nodes: Vec<GraphNode>,
    pub removed_nodes: Vec<NodeIndex>,
    pub added_edges: Vec<(NodeIndex, NodeIndex, GraphEdge)>,
    pub removed_edges: Vec<EdgeIndex>,
    pub updated_nodes: Vec<(NodeIndex, GraphNode)>,
}
```

### Parser (infra)
```rust
pub trait LanguageParser: Send + Sync {
    fn language(&self) -> Language;
    fn parse_imports(&self, source: &str) -> Vec<ImportInfo>;
    fn parse_symbols(&self, source: &str) -> Vec<Symbol>;     // L3
    fn parse_calls(&self, source: &str) -> Vec<CallInfo>;     // Flow용
}
```

---

## 프론트엔드

### GraphCanvas
- Cytoscape.js 인스턴스 관리 (`useCytoscape` hook)
- 노드 클릭 → Detail Panel에 정보 표시
- 간선 hover → 심볼 목록 (L3 지연 로딩)
- 모듈 더블클릭 → 드릴다운 (내부 파일 그래프)

### DepthToggle
- Packages / Modules / Files 전환 버튼
- 전환 시 `graph:get` 재호출

### 실시간 업데이트
- `graph:updated` 이벤트 구독
- `GraphDiff` 수신 → Cytoscape 노드/간선 추가/제거 (전체 리렌더 아님)

### Cytoscape 스타일
- 다크 배경, 둥근 사각형 노드, 베지어 간선
- 타입별 색상: module(#16213e), package(#0f3460), file(#1a1a2e)
- 변경된 노드: 빨간 보더 (#e94560)

---

## API

```typescript
invoke('graph:get', { depth: 'packages' | 'modules' | 'files' })
  → { nodes: GraphNode[], edges: GraphEdge[] }

invoke('graph:drill_down', { moduleId: string })
  → { nodes: GraphNode[], edges: GraphEdge[] }

invoke('graph:edge_symbols', { edgeId: string })
  → { symbols: Symbol[] }

invoke('graph:node_detail', { nodeId: string })
  → { id, path, language, imports, exports, loc }

listen('graph:updated', (e: GraphDiff) => void)
```
