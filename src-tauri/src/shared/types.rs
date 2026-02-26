/// 공통 타입 정의
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

// ─── 언어 ───

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Language {
    Python,
    TypeScript,
    JavaScript,
    CSharp,
    Dart,
    Rust,
    Go,
}

// ─── 파일 이벤트 ───

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FileEventKind {
    Create,
    Modify,
    Delete,
    Rename,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEvent {
    pub path: PathBuf,
    pub kind: FileEventKind,
    pub timestamp: u64, // unix millis
}

// ─── 그래프 ───

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphNode {
    pub id: String,
    #[serde(rename = "type")]
    pub node_type: GraphNodeType,
    pub label: String,
    pub path: Option<PathBuf>,
    pub language: Option<Language>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum GraphNodeType {
    Package,
    Module,
    Group,
    File,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphEdge {
    pub id: String,
    pub source: String,
    pub target: String,
    pub kind: EdgeKind,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EdgeKind {
    PackageDep,
    ModuleImport,
    FileImport,
    SideEffectImport,
    Contains,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphDiff {
    pub added_nodes: Vec<GraphNode>,
    pub removed_nodes: Vec<String>,
    pub added_edges: Vec<GraphEdge>,
    pub removed_edges: Vec<String>,
    pub updated_nodes: Vec<GraphNode>,
}

// ─── 심볼 ───

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SymbolKind {
    Function,
    Class,
    Variable,
    Type,
    Interface,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Symbol {
    pub name: String,
    pub kind: SymbolKind,
    pub line: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportInfo {
    pub source: String,
    pub symbols: Vec<String>,
    pub is_external: bool,
    pub is_side_effect: bool,
    pub line: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CallInfo {
    pub caller: String,
    pub callee: String,
    pub line: usize,
}

// ─── Git ───

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStatus {
    pub branch: String,
    pub ahead: usize,
    pub behind: usize,
    pub staged: Vec<String>,
    pub modified: Vec<String>,
    pub untracked: Vec<String>,
}

// ─── Guardrail ───

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Violation {
    pub id: String,
    pub scope_id: String,
    pub file: String,
    pub change_kind: String,
    pub timestamp: String,
}

// ─── Score ───

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthScore {
    pub overall: f64,
    pub metrics: ScoreMetrics,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScoreMetrics {
    pub single_responsibility: f64,
    pub dependency_inversion: f64,
    pub circular_dependencies: Vec<Vec<String>>,
    pub coupling: f64,
    pub cohesion: f64,
}

// ─── Project ───

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmConfig {
    pub provider: String,
    pub model: String,
    pub api_key_env: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentProject {
    pub name: String,
    pub root: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PartialConfig {
    pub languages: Option<Vec<Language>>,
    pub llm: Option<Option<LlmConfig>>,
    pub excluded_paths: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectInfo {
    pub name: String,
    pub root: PathBuf,
    pub languages: Vec<Language>,
    pub config: ViberConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ViberConfig {
    pub languages: Vec<Language>,
    pub llm: Option<LlmConfig>,
    pub excluded_paths: Vec<String>,
}

impl Default for ViberConfig {
    fn default() -> Self {
        Self {
            languages: Vec::new(),
            llm: None,
            excluded_paths: Vec::new(),
        }
    }
}

impl ViberConfig {
    pub fn apply_patch(&mut self, patch: PartialConfig) {
        if let Some(languages) = patch.languages {
            self.languages = languages;
        }
        if let Some(llm) = patch.llm {
            self.llm = llm;
        }
        if let Some(excluded_paths) = patch.excluded_paths {
            self.excluded_paths = excluded_paths;
        }
    }
}
