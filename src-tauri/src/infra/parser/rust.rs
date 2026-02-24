use crate::infra::parser::LanguageParser;
use crate::shared::types::{CallInfo, ImportInfo, Language, Symbol, SymbolKind};

pub struct RustParser;

impl LanguageParser for RustParser {
    fn language(&self) -> Language {
        Language::Rust
    }

    fn parse_imports(&self, source: &str) -> Vec<ImportInfo> {
        let mut imports = Vec::new();

        for (index, line) in source.lines().enumerate() {
            let line_no = index + 1;
            let trimmed = line.trim();

            // use std::collections::HashMap;
            // use crate::shared::types::*;
            // use super::service::GraphService;
            // pub use xxx;
            let rest = if let Some(r) = trimmed.strip_prefix("use ") {
                r
            } else if let Some(r) = trimmed.strip_prefix("pub use ") {
                r
            } else {
                continue;
            };

            // 세미콜론까지
            let rest = rest.trim_end_matches(';').trim();
            if rest.is_empty() {
                continue;
            }

            // 중괄호가 있으면 심볼 추출
            let (base, symbols) = if let Some(brace_start) = rest.find('{') {
                let base = rest[..brace_start].trim().trim_end_matches("::").to_string();
                let brace_end = rest.find('}').unwrap_or(rest.len());
                let syms = rest[brace_start + 1..brace_end]
                    .split(',')
                    .map(str::trim)
                    .filter(|s| !s.is_empty())
                    .map(|s| {
                        // self as X → self
                        s.split_whitespace().next().unwrap_or(s).to_string()
                    })
                    .collect::<Vec<_>>();
                (base, syms)
            } else {
                // use std::collections::HashMap → source=std::collections, sym=HashMap
                let parts: Vec<&str> = rest.rsplitn(2, "::").collect();
                if parts.len() == 2 {
                    let sym = parts[0].trim_end_matches(';').to_string();
                    let base = parts[1].to_string();
                    if sym == "*" {
                        (base, vec!["*".to_string()])
                    } else {
                        (base, vec![sym])
                    }
                } else {
                    (rest.to_string(), Vec::new())
                }
            };

            let is_external = is_external_rust(&base);

            imports.push(ImportInfo {
                source: base,
                symbols,
                is_external,
                line: line_no,
            });
        }

        imports
    }

    fn parse_symbols(&self, source: &str) -> Vec<Symbol> {
        let mut symbols = Vec::new();

        for (index, line) in source.lines().enumerate() {
            let line_no = index + 1;
            let trimmed = line.trim();
            let stripped = strip_rust_vis(trimmed);

            // fn name(
            // async fn name(
            let fn_rest = stripped
                .strip_prefix("async ")
                .unwrap_or(stripped)
                .strip_prefix("fn ");
            if let Some(rest) = fn_rest {
                let name = rest.split(['(', '<']).next().unwrap_or("").trim();
                if !name.is_empty() {
                    symbols.push(Symbol {
                        name: name.to_string(),
                        kind: SymbolKind::Function,
                        line: line_no,
                    });
                    continue;
                }
            }

            // struct Name
            if let Some(rest) = stripped.strip_prefix("struct ") {
                let name = rest.split(['{', '(', '<', ' ', ';']).next().unwrap_or("").trim();
                if !name.is_empty() {
                    symbols.push(Symbol {
                        name: name.to_string(),
                        kind: SymbolKind::Class, // struct → Class
                        line: line_no,
                    });
                    continue;
                }
            }

            // enum Name
            if let Some(rest) = stripped.strip_prefix("enum ") {
                let name = rest.split(['{', '<', ' ']).next().unwrap_or("").trim();
                if !name.is_empty() {
                    symbols.push(Symbol {
                        name: name.to_string(),
                        kind: SymbolKind::Type,
                        line: line_no,
                    });
                    continue;
                }
            }

            // trait Name
            if let Some(rest) = stripped.strip_prefix("trait ") {
                let name = rest.split(['{', '<', ':', ' ']).next().unwrap_or("").trim();
                if !name.is_empty() {
                    symbols.push(Symbol {
                        name: name.to_string(),
                        kind: SymbolKind::Interface, // trait → Interface
                        line: line_no,
                    });
                    continue;
                }
            }

            // type Name =
            if let Some(rest) = stripped.strip_prefix("type ") {
                let name = rest.split(['=', '<', ' ']).next().unwrap_or("").trim();
                if !name.is_empty() {
                    symbols.push(Symbol {
                        name: name.to_string(),
                        kind: SymbolKind::Type,
                        line: line_no,
                    });
                    continue;
                }
            }

            // const NAME: / static NAME:
            for kw in &["const ", "static "] {
                if let Some(rest) = stripped.strip_prefix(kw) {
                    let name = rest.split([':', '=']).next().unwrap_or("").trim();
                    if !name.is_empty() {
                        symbols.push(Symbol {
                            name: name.to_string(),
                            kind: SymbolKind::Variable,
                            line: line_no,
                        });
                        break;
                    }
                }
            }
        }

        symbols
    }

    fn parse_calls(&self, _source: &str) -> Vec<CallInfo> {
        Vec::new()
    }
}

/// pub / pub(crate) / pub(super) 접두사 제거
fn strip_rust_vis(s: &str) -> &str {
    if let Some(rest) = s.strip_prefix("pub") {
        let rest = rest.trim_start();
        if let Some(rest) = rest.strip_prefix('(') {
            // pub(crate) / pub(super) / pub(in ...)
            if let Some(close) = rest.find(')') {
                return rest[close + 1..].trim_start();
            }
        }
        return rest;
    }
    s
}

/// crate::/self::/super:: → internal, 나머지 → external
fn is_external_rust(source: &str) -> bool {
    !source.starts_with("crate")
        && !source.starts_with("self")
        && !source.starts_with("super")
}
