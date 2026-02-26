use crate::infra::parser::LanguageParser;
use crate::shared::types::{CallInfo, ImportInfo, Language, Symbol, SymbolKind};

pub struct PythonParser;

impl LanguageParser for PythonParser {
    fn language(&self) -> Language {
        Language::Python
    }

    fn parse_imports(&self, source: &str) -> Vec<ImportInfo> {
        let mut imports = Vec::new();

        for (index, line) in source.lines().enumerate() {
            let line_no = index + 1;
            let trimmed = line.trim();
            let is_side_effect = trimmed.contains("# noqa: F401")
                || trimmed.contains("# noqa:F401")
                || trimmed.contains("# type: ignore");

            if let Some(rest) = trimmed.strip_prefix("import ") {
                // Strip inline comments before parsing
                let rest_no_comment = rest.split('#').next().unwrap_or(rest).trim();
                for module in rest_no_comment.split(',').map(str::trim).filter(|s| !s.is_empty()) {
                    let source = module
                        .split_whitespace()
                        .next()
                        .unwrap_or(module)
                        .to_string();
                    imports.push(ImportInfo {
                        source: source.clone(),
                        symbols: Vec::new(),
                        is_external: !source.starts_with('.'),
                        is_side_effect,
                        line: line_no,
                    });
                }
                continue;
            }

            if let Some(rest) = trimmed.strip_prefix("from ") {
                let mut parts = rest.splitn(2, " import ");
                let module = parts.next().unwrap_or("").trim();
                let symbols_part = parts.next().unwrap_or("").trim();

                if module.is_empty() || symbols_part.is_empty() {
                    continue;
                }

                // Strip inline comments from symbols
                let symbols_no_comment = symbols_part.split('#').next().unwrap_or(symbols_part).trim();
                let symbols = symbols_no_comment
                    .split(',')
                    .map(str::trim)
                    .map(|symbol| symbol.split_whitespace().next().unwrap_or(symbol))
                    .filter(|s| !s.is_empty())
                    .map(ToOwned::to_owned)
                    .collect::<Vec<_>>();

                imports.push(ImportInfo {
                    source: module.to_string(),
                    symbols,
                    is_external: !module.starts_with('.'),
                    is_side_effect,
                    line: line_no,
                });
            }
        }

        imports
    }

    fn parse_symbols(&self, source: &str) -> Vec<Symbol> {
        let mut symbols = Vec::new();

        for (index, line) in source.lines().enumerate() {
            let line_no = index + 1;
            let trimmed = line.trim();

            if let Some(rest) = trimmed.strip_prefix("def ") {
                let name = rest.split('(').next().unwrap_or("").trim();
                if !name.is_empty() {
                    symbols.push(Symbol {
                        name: name.to_string(),
                        kind: SymbolKind::Function,
                        line: line_no,
                    });
                }
                continue;
            }

            if let Some(rest) = trimmed.strip_prefix("class ") {
                let name = rest
                    .split(['(', ':'])
                    .next()
                    .unwrap_or("")
                    .trim();
                if !name.is_empty() {
                    symbols.push(Symbol {
                        name: name.to_string(),
                        kind: SymbolKind::Class,
                        line: line_no,
                    });
                }
            }
        }

        symbols
    }
}
