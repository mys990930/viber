use crate::infra::parser::LanguageParser;
use crate::shared::types::{CallInfo, ImportInfo, Language, Symbol, SymbolKind};

pub struct TypeScriptParser;

impl LanguageParser for TypeScriptParser {
    fn language(&self) -> Language {
        Language::TypeScript
    }

    fn parse_imports(&self, source: &str) -> Vec<ImportInfo> {
        let mut imports = Vec::new();

        let mut i = 0;
        let lines: Vec<&str> = source.lines().collect();

        while i < lines.len() {
            let line_no = i + 1;
            let trimmed = lines[i].trim();

            // import ... from '...'
            // import '...'
            // import type ... from '...'
            // export ... from '...'
            if trimmed.starts_with("import ") || trimmed.starts_with("export ") {
                // 여러 줄에 걸칠 수 있으므로 세미콜론까지 합침
                let mut full = trimmed.to_string();
                while !full.contains(';') && !full.contains("from ") && i + 1 < lines.len() {
                    // from이 아직 안 나왔고 세미콜론도 없으면 다음 줄 합침
                    // 단, 단순 import 'side-effect' 는 바로 끝남
                    if full.contains('\'') || full.contains('"') {
                        break;
                    }
                    i += 1;
                    full.push(' ');
                    full.push_str(lines[i].trim());
                }

                if let Some(info) = parse_es_import(&full, line_no) {
                    imports.push(info);
                }
            }

            // require('...')
            if trimmed.contains("require(") {
                if let Some(info) = parse_require(trimmed, line_no) {
                    imports.push(info);
                }
            }

            i += 1;
        }

        imports
    }

    fn parse_symbols(&self, source: &str) -> Vec<Symbol> {
        let mut symbols = Vec::new();

        for (index, line) in source.lines().enumerate() {
            let line_no = index + 1;
            let trimmed = line.trim();

            // function name(
            // export function name(
            // export default function name(
            // async function name(
            if let Some(name) = extract_after_keyword(trimmed, "function ") {
                let name = name.split(['(', '<']).next().unwrap_or("").trim();
                if !name.is_empty() && name != "(" {
                    symbols.push(Symbol {
                        name: name.to_string(),
                        kind: SymbolKind::Function,
                        line: line_no,
                    });
                    continue;
                }
            }

            // const name = ... => / function
            // let name = ... =>
            // var name = ... =>
            for kw in &["const ", "let ", "var "] {
                if let Some(rest) = strip_export_prefix(trimmed).strip_prefix(kw) {
                    let name = rest.split(['=', ':', ' ']).next().unwrap_or("").trim();
                    if !name.is_empty() {
                        // 화살표 함수인지 일반 변수인지 판별
                        let kind = if line.contains("=>") || line.contains("function") {
                            SymbolKind::Function
                        } else {
                            SymbolKind::Variable
                        };
                        symbols.push(Symbol {
                            name: name.to_string(),
                            kind,
                            line: line_no,
                        });
                    }
                    break;
                }
            }

            // class Name
            if let Some(name) = extract_after_keyword(trimmed, "class ") {
                let name = name.split(['{', '<', ' ']).next().unwrap_or("").trim();
                if !name.is_empty() {
                    symbols.push(Symbol {
                        name: name.to_string(),
                        kind: SymbolKind::Class,
                        line: line_no,
                    });
                    continue;
                }
            }

            // interface Name
            if let Some(name) = extract_after_keyword(trimmed, "interface ") {
                let name = name.split(['{', '<', ' ']).next().unwrap_or("").trim();
                if !name.is_empty() {
                    symbols.push(Symbol {
                        name: name.to_string(),
                        kind: SymbolKind::Interface,
                        line: line_no,
                    });
                    continue;
                }
            }

            // type Name =
            if let Some(name) = extract_after_keyword(trimmed, "type ") {
                let name = name.split(['=', '<', ' ']).next().unwrap_or("").trim();
                if !name.is_empty() {
                    symbols.push(Symbol {
                        name: name.to_string(),
                        kind: SymbolKind::Type,
                        line: line_no,
                    });
                }
            }
        }

        symbols
    }
}

/// JavaScript 파서 — TypeScript와 동일한 로직 사용
pub struct JavaScriptParser;

impl LanguageParser for JavaScriptParser {
    fn language(&self) -> Language {
        Language::JavaScript
    }

    fn parse_imports(&self, source: &str) -> Vec<ImportInfo> {
        TypeScriptParser.parse_imports(source)
    }

    fn parse_symbols(&self, source: &str) -> Vec<Symbol> {
        TypeScriptParser.parse_symbols(source)
    }
}

// ─── 헬퍼 ───

/// `export`, `export default`, `declare` 접두사를 벗김
fn strip_export_prefix(s: &str) -> &str {
    let s = s.strip_prefix("export ").unwrap_or(s);
    let s = s.strip_prefix("default ").unwrap_or(s);
    let s = s.strip_prefix("declare ").unwrap_or(s);
    let s = s.strip_prefix("async ").unwrap_or(s);
    s
}

/// 접두사(export/declare/async 포함) 이후 keyword를 찾아 나머지 반환
fn extract_after_keyword<'a>(line: &'a str, keyword: &str) -> Option<&'a str> {
    let stripped = strip_export_prefix(line);
    stripped.strip_prefix(keyword)
}

/// import ... from 'source' / import 'source' 파싱
fn parse_es_import(line: &str, line_no: usize) -> Option<ImportInfo> {
    let stripped = strip_export_prefix(line.trim());
    let stripped = stripped.strip_prefix("import ").or_else(|| {
        // re-export: export { x } from '...'
        if line.trim().starts_with("export ") && line.contains("from ") {
            Some(stripped)
        } else {
            None
        }
    })?;

    // import type 제거
    let stripped = stripped.strip_prefix("type ").unwrap_or(stripped);

    // from '...' 또는 "..." 추출
    if let Some(source) = extract_string_after(stripped, "from ") {
        let symbols = extract_named_imports(stripped);
        return Some(ImportInfo {
            is_side_effect: false, is_external: is_external_ts(&source),
            source,
            symbols,
            line: line_no,
        });
    }

    // import 'side-effect'
    if let Some(source) = extract_first_string(stripped) {
        return Some(ImportInfo {
            source,
            symbols: Vec::new(),
            is_side_effect: false, is_external: true,
            line: line_no,
        });
    }

    None
}

/// require('...') 파싱
fn parse_require(line: &str, line_no: usize) -> Option<ImportInfo> {
    let idx = line.find("require(")?;
    let rest = &line[idx + 8..];
    let source = extract_first_string(rest)?;
    Some(ImportInfo {
        is_side_effect: false, is_external: is_external_ts(&source),
        source,
        symbols: Vec::new(),
        line: line_no,
    })
}

/// `from` 키워드 뒤 문자열 리터럴 추출
fn extract_string_after(s: &str, keyword: &str) -> Option<String> {
    let idx = s.find(keyword)?;
    let rest = &s[idx + keyword.len()..];
    extract_first_string(rest)
}

/// 첫 번째 '...' 또는 "..." 추출
fn extract_first_string(s: &str) -> Option<String> {
    for quote in &['\'', '"'] {
        if let Some(start) = s.find(*quote) {
            if let Some(end) = s[start + 1..].find(*quote) {
                return Some(s[start + 1..start + 1 + end].to_string());
            }
        }
    }
    None
}

/// { a, b, c as d } 에서 심볼 이름 추출
fn extract_named_imports(s: &str) -> Vec<String> {
    let Some(start) = s.find('{') else {
        return Vec::new();
    };
    let Some(end) = s.find('}') else {
        return Vec::new();
    };
    if start >= end {
        return Vec::new();
    }

    s[start + 1..end]
        .split(',')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| {
            // `x as y` → x
            s.split_whitespace().next().unwrap_or(s).to_string()
        })
        .collect()
}

/// ./ 또는 ../ 로 시작하지 않으면 external
fn is_external_ts(source: &str) -> bool {
    !source.starts_with('.') && !source.starts_with('/')
}
