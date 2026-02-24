use crate::infra::parser::LanguageParser;
use crate::shared::types::{CallInfo, ImportInfo, Language, Symbol, SymbolKind};

pub struct CSharpParser;

impl LanguageParser for CSharpParser {
    fn language(&self) -> Language {
        Language::CSharp
    }

    fn parse_imports(&self, source: &str) -> Vec<ImportInfo> {
        let mut imports = Vec::new();

        for (index, line) in source.lines().enumerate() {
            let line_no = index + 1;
            let trimmed = line.trim();

            // using System;
            // using System.Collections.Generic;
            // using static System.Math;
            // using Alias = Some.Namespace;
            // global using ...
            let rest = if let Some(r) = trimmed.strip_prefix("global using ") {
                r
            } else if let Some(r) = trimmed.strip_prefix("using ") {
                r
            } else {
                continue;
            };

            // static using
            let rest = rest.strip_prefix("static ").unwrap_or(rest);
            let rest = rest.trim_end_matches(';').trim();

            if rest.is_empty() {
                continue;
            }

            // using Alias = Namespace → source = Namespace
            let source_str = if rest.contains('=') {
                rest.split('=').nth(1).unwrap_or("").trim().to_string()
            } else {
                rest.to_string()
            };

            if source_str.is_empty() {
                continue;
            }

            imports.push(ImportInfo {
                is_external: is_external_csharp(&source_str),
                source: source_str,
                symbols: Vec::new(),
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
            let stripped = strip_csharp_modifiers(trimmed);

            // class Name / record Name / struct Name
            for kw in &["class ", "record ", "struct "] {
                if let Some(rest) = stripped.strip_prefix(kw) {
                    let name = rest.split(['{', '<', ':', '(', ' ']).next().unwrap_or("").trim();
                    if !name.is_empty() {
                        symbols.push(Symbol {
                            name: name.to_string(),
                            kind: SymbolKind::Class,
                            line: line_no,
                        });
                    }
                    break;
                }
            }

            // interface IName
            if let Some(rest) = stripped.strip_prefix("interface ") {
                let name = rest.split(['{', '<', ':', ' ']).next().unwrap_or("").trim();
                if !name.is_empty() {
                    symbols.push(Symbol {
                        name: name.to_string(),
                        kind: SymbolKind::Interface,
                        line: line_no,
                    });
                    continue;
                }
            }

            // enum Name
            if let Some(rest) = stripped.strip_prefix("enum ") {
                let name = rest.split(['{', ':', ' ']).next().unwrap_or("").trim();
                if !name.is_empty() {
                    symbols.push(Symbol {
                        name: name.to_string(),
                        kind: SymbolKind::Type,
                        line: line_no,
                    });
                    continue;
                }
            }

            // 메서드: returnType Name( — 들여쓰기 있고 ( 포함
            // (class/struct 안 메서드 감지, 최소한의 휴리스틱)
            if !line.starts_with(|c: char| !c.is_whitespace())
                && stripped.contains('(')
                && !stripped.starts_with("if ")
                && !stripped.starts_with("for ")
                && !stripped.starts_with("while ")
                && !stripped.starts_with("switch ")
                && !stripped.starts_with("return ")
                && !stripped.starts_with("new ")
            {
                // type Name( 패턴
                let before_paren = stripped.split('(').next().unwrap_or("");
                let parts: Vec<&str> = before_paren.split_whitespace().collect();
                if parts.len() >= 2 {
                    let name = parts[parts.len() - 1];
                    // 생성자/메서드 이름은 대문자 시작이 관례
                    if name.starts_with(|c: char| c.is_uppercase()) || name.starts_with('_') {
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

    fn parse_calls(&self, _source: &str) -> Vec<CallInfo> {
        Vec::new()
    }
}

/// C# 접근 제한자/한정자 제거
fn strip_csharp_modifiers(s: &str) -> &str {
    let modifiers = [
        "public ",
        "private ",
        "protected ",
        "internal ",
        "static ",
        "abstract ",
        "sealed ",
        "partial ",
        "virtual ",
        "override ",
        "readonly ",
        "async ",
        "new ",
        "unsafe ",
    ];

    let mut result = s;
    let mut changed = true;
    while changed {
        changed = false;
        for m in &modifiers {
            if let Some(rest) = result.strip_prefix(m) {
                result = rest;
                changed = true;
            }
        }
    }
    result
}

/// System.* / Microsoft.* 은 stdlib, 그 외는 프로젝트 네임스페이스로 간주
fn is_external_csharp(source: &str) -> bool {
    source.starts_with("System")
        || source.starts_with("Microsoft")
        || source.starts_with("Newtonsoft")
        || source.starts_with("NUnit")
        || source.starts_with("Xunit")
}
