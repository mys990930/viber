use crate::infra::parser::LanguageParser;
use crate::shared::types::{CallInfo, ImportInfo, Language, Symbol, SymbolKind};

pub struct GoParser;

impl LanguageParser for GoParser {
    fn language(&self) -> Language {
        Language::Go
    }

    fn parse_imports(&self, source: &str) -> Vec<ImportInfo> {
        let mut imports = Vec::new();
        let mut in_import_block = false;

        for (index, line) in source.lines().enumerate() {
            let line_no = index + 1;
            let trimmed = line.trim();

            // import ( 블록 시작
            if trimmed == "import (" {
                in_import_block = true;
                continue;
            }

            // 블록 끝
            if in_import_block && trimmed == ")" {
                in_import_block = false;
                continue;
            }

            // 블록 안의 한 줄: "fmt" 또는 alias "github.com/xxx"
            if in_import_block {
                if let Some(source_str) = extract_go_string(trimmed) {
                    imports.push(ImportInfo {
                        is_external: is_external_go(&source_str),
                        source: source_str,
                        symbols: Vec::new(),
                        line: line_no,
                    });
                }
                continue;
            }

            // 단일 import "fmt"
            if let Some(rest) = trimmed.strip_prefix("import ") {
                if let Some(source_str) = extract_go_string(rest) {
                    imports.push(ImportInfo {
                        is_external: is_external_go(&source_str),
                        source: source_str,
                        symbols: Vec::new(),
                        line: line_no,
                    });
                }
            }
        }

        imports
    }

    fn parse_symbols(&self, source: &str) -> Vec<Symbol> {
        let mut symbols = Vec::new();

        for (index, line) in source.lines().enumerate() {
            let line_no = index + 1;
            let trimmed = line.trim();

            // func name( / func (receiver) name(
            if let Some(rest) = trimmed.strip_prefix("func ") {
                let rest = if rest.starts_with('(') {
                    // method: func (r *Receiver) Name(
                    if let Some(close) = rest.find(')') {
                        rest[close + 1..].trim_start()
                    } else {
                        continue;
                    }
                } else {
                    rest
                };

                let name = rest.split(['(', '<', ' ']).next().unwrap_or("").trim();
                if !name.is_empty() {
                    symbols.push(Symbol {
                        name: name.to_string(),
                        kind: SymbolKind::Function,
                        line: line_no,
                    });
                }
                continue;
            }

            // type Name struct / type Name interface / type Name = ...
            if let Some(rest) = trimmed.strip_prefix("type ") {
                let parts: Vec<&str> = rest.split_whitespace().collect();
                if parts.len() >= 2 {
                    let name = parts[0];
                    let kind = match parts[1] {
                        "struct" => SymbolKind::Class,
                        "interface" => SymbolKind::Interface,
                        _ => SymbolKind::Type,
                    };
                    symbols.push(Symbol {
                        name: name.to_string(),
                        kind,
                        line: line_no,
                    });
                }
                continue;
            }

            // var / const (top-level 단일)
            for kw in &["var ", "const "] {
                if let Some(rest) = trimmed.strip_prefix(kw) {
                    let name = rest.split([' ', '=', '\t']).next().unwrap_or("").trim();
                    if !name.is_empty() && name != "(" {
                        symbols.push(Symbol {
                            name: name.to_string(),
                            kind: SymbolKind::Variable,
                            line: line_no,
                        });
                    }
                    break;
                }
            }
        }

        symbols
    }

    fn parse_calls(&self, _source: &str) -> Vec<CallInfo> {
        Vec::new()
    }
}

/// "..." 에서 문자열 추출 (alias 무시)
fn extract_go_string(s: &str) -> Option<String> {
    let start = s.find('"')?;
    let end = s[start + 1..].find('"')?;
    Some(s[start + 1..start + 1 + end].to_string())
}

/// 표준 라이브러리(도트 없음)는 external=false, 나머지 external=true
/// Go 관례: "fmt", "net/http" = stdlib, "github.com/..." = external
/// 여기서는 모듈 경로에 . 이 포함되면 external로 판단
fn is_external_go(source: &str) -> bool {
    source.contains('.')
}
