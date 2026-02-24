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
    fn parse_calls(&self, source: &str) -> Vec<CallInfo>;
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
