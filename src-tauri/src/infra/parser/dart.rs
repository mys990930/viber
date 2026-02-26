use crate::infra::parser::LanguageParser;
use crate::shared::types::{CallInfo, ImportInfo, Language, Symbol, SymbolKind};

pub struct DartParser;

impl LanguageParser for DartParser {
    fn language(&self) -> Language {
        Language::Dart
    }

    fn parse_imports(&self, source: &str) -> Vec<ImportInfo> {
        let mut imports = Vec::new();

        for (index, line) in source.lines().enumerate() {
            let line_no = index + 1;
            let trimmed = line.trim();

            // import 'package:xxx/yyy.dart';
            // import 'xxx.dart';
            // import 'xxx.dart' as alias;
            // import 'xxx.dart' show A, B;
            // import 'xxx.dart' hide C;
            // export 'xxx.dart';
            // part 'xxx.dart';
            // part of 'xxx.dart';
            let rest = if let Some(r) = trimmed.strip_prefix("import ") {
                r
            } else if let Some(r) = trimmed.strip_prefix("export ") {
                r
            } else if let Some(r) = trimmed.strip_prefix("part of ") {
                r
            } else if let Some(r) = trimmed.strip_prefix("part ") {
                r
            } else {
                continue;
            };

            let source_str = if let Some(s) = extract_dart_string(rest) {
                s
            } else {
                continue;
            };

            // show A, B → 심볼 추출
            let symbols = if let Some(show_idx) = rest.find(" show ") {
                let after_show = &rest[show_idx + 6..];
                let after_show = after_show.trim_end_matches(';').trim();
                after_show
                    .split(',')
                    .map(str::trim)
                    .filter(|s| !s.is_empty())
                    .map(ToOwned::to_owned)
                    .collect()
            } else {
                Vec::new()
            };

            let is_external = is_external_dart(&source_str);

            imports.push(ImportInfo {
                source: source_str,
                symbols,
                is_external,
                is_side_effect: false,
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

            // class Name / abstract class Name / mixin Name / extension Name
            for kw in &["class ", "mixin ", "extension "] {
                if let Some(rest) = strip_dart_prefix(trimmed).strip_prefix(kw) {
                    let name = rest.split(['{', '<', ' ', '(']).next().unwrap_or("").trim();
                    if !name.is_empty() && name != "on" {
                        symbols.push(Symbol {
                            name: name.to_string(),
                            kind: SymbolKind::Class,
                            line: line_no,
                        });
                    }
                    break;
                }
            }

            // enum Name
            if let Some(rest) = trimmed.strip_prefix("enum ") {
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

            // typedef Name
            if let Some(rest) = trimmed.strip_prefix("typedef ") {
                // typedef Name = ... 또는 typedef ReturnType Name(...)
                let name = rest.split(['=', '(', '<', ' ']).next().unwrap_or("").trim();
                if !name.is_empty() {
                    symbols.push(Symbol {
                        name: name.to_string(),
                        kind: SymbolKind::Type,
                        line: line_no,
                    });
                    continue;
                }
            }

            // top-level 함수: ReturnType name( — 들여쓰기 없음
            if !trimmed.is_empty()
                && line.starts_with(|c: char| !c.is_whitespace())
                && trimmed.contains('(')
                && !trimmed.starts_with("import ")
                && !trimmed.starts_with("export ")
                && !trimmed.starts_with("class ")
                && !trimmed.starts_with("enum ")
                && !trimmed.starts_with("//")
                && !trimmed.starts_with("if ")
                && !trimmed.starts_with("return ")
            {
                let before_paren = trimmed.split('(').next().unwrap_or("");
                let parts: Vec<&str> = before_paren.split_whitespace().collect();
                if parts.len() >= 2 {
                    let name = parts[parts.len() - 1];
                    if name.starts_with(|c: char| c.is_lowercase() || c == '_') {
                        symbols.push(Symbol {
                            name: name.to_string(),
                            kind: SymbolKind::Function,
                            line: line_no,
                        });
                    }
                }
            }
        }

        symbols
    }
}

/// abstract / sealed 등 접두사 제거
fn strip_dart_prefix(s: &str) -> &str {
    let prefixes = ["abstract ", "sealed ", "base ", "final ", "interface "];
    let mut result = s;
    for p in &prefixes {
        if let Some(rest) = result.strip_prefix(p) {
            result = rest;
        }
    }
    result
}

/// '...' 에서 문자열 추출
fn extract_dart_string(s: &str) -> Option<String> {
    let start = s.find('\'')?;
    let end = s[start + 1..].find('\'')?;
    Some(s[start + 1..start + 1 + end].to_string())
}

/// package: → external, dart: → external(stdlib), 상대경로 → internal
fn is_external_dart(source: &str) -> bool {
    source.starts_with("package:") || source.starts_with("dart:")
}
