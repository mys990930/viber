use std::collections::HashMap;
use std::path::Path;

use crate::shared::types::{CallInfo, ImportInfo, Language, Symbol};

mod python;
mod typescript;
mod rust;
mod go;
mod csharp;
mod dart;

pub use python::PythonParser;
pub use typescript::{TypeScriptParser, JavaScriptParser};
pub use rust::RustParser;
pub use go::GoParser;
pub use csharp::CSharpParser;
pub use dart::DartParser;

pub trait LanguageParser: Send + Sync {
    fn language(&self) -> Language;
    fn parse_imports(&self, source: &str) -> Vec<ImportInfo>;
    fn parse_symbols(&self, source: &str) -> Vec<Symbol>;

    /// Phase 3에서 확장 — 기본값 빈 Vec
    fn parse_calls(&self, _source: &str) -> Vec<CallInfo> {
        Vec::new()
    }

    /// 무시할 디렉토리명 (언어별 추가)
    fn excluded_dirs(&self) -> &[&str] {
        &[]
    }
}

/// 모든 파서가 공유하는 제외 디렉토리
pub const COMMON_EXCLUDED_DIRS: &[&str] = &[
    ".git", "node_modules", "target", ".viber",
    "__pycache__", ".venv", "venv", ".tox",
    "dist", "build", ".next", ".nuxt", ".output",
    ".svelte-kit", ".cache", ".tmp",
];

/// 디렉토리 이름이 제외 대상인지 (공통 + 언어별)
pub fn is_excluded_dir(dir_name: &str) -> bool {
    COMMON_EXCLUDED_DIRS.contains(&dir_name)
}

pub struct ParserRegistry {
    parsers: HashMap<Language, Box<dyn LanguageParser>>,
}

impl ParserRegistry {
    pub fn new() -> Self {
        Self {
            parsers: HashMap::new(),
        }
    }

    pub fn with_defaults() -> Self {
        let mut registry = Self::new();
        registry.register(Box::new(PythonParser));
        registry.register(Box::new(TypeScriptParser));
        registry.register(Box::new(JavaScriptParser));
        registry.register(Box::new(RustParser));
        registry.register(Box::new(GoParser));
        registry.register(Box::new(CSharpParser));
        registry.register(Box::new(DartParser));
        registry
    }

    pub fn register(&mut self, parser: Box<dyn LanguageParser>) {
        self.parsers.insert(parser.language(), parser);
    }

    pub fn get(&self, lang: Language) -> Option<&dyn LanguageParser> {
        self.parsers.get(&lang).map(|p| p.as_ref())
    }

    pub fn detect_language(&self, path: &Path) -> Option<Language> {
        let extension = path.extension()?.to_str()?.to_ascii_lowercase();

        match extension.as_str() {
            "py" => Some(Language::Python),
            "ts" | "tsx" => Some(Language::TypeScript),
            "js" | "jsx" | "mjs" | "cjs" => Some(Language::JavaScript),
            "cs" => Some(Language::CSharp),
            "dart" => Some(Language::Dart),
            "rs" => Some(Language::Rust),
            "go" => Some(Language::Go),
            _ => None,
        }
    }
}

impl Default for ParserRegistry {
    fn default() -> Self {
        Self::with_defaults()
    }
}
