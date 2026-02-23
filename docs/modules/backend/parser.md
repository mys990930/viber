# Module: backend/parser

> 소스 코드를 AST 파싱하여 import/심볼/호출 정보를 추출. 다중 언어 지원.

## 책임
- Tree-sitter 기반 AST 파싱
- 언어별 파서 등록/관리
- import 정보, export 심볼, 함수 호출 추출

## Public API
```rust
pub trait LanguageParser: Send + Sync {
    fn language(&self) -> Language;
    fn parse_imports(&self, source: &str) -> Vec<ImportInfo>;
    fn parse_symbols(&self, source: &str) -> Vec<Symbol>;
    fn parse_calls(&self, source: &str) -> Vec<CallInfo>;
}

pub struct ParserRegistry {
    pub fn register(&mut self, parser: Box<dyn LanguageParser>);
    pub fn get(&self, lang: Language) -> Option<&dyn LanguageParser>;
    pub fn detect_language(&self, path: &Path) -> Option<Language>;
}
```

## 발행 이벤트
없음 (요청-응답 방식)

## 구독 이벤트
없음 (graph 모듈이 직접 호출)

## 의존 모듈
없음

## 공유 타입
```rust
pub struct ImportInfo {
    pub source: String,
    pub symbols: Vec<String>,
    pub is_external: bool,
    pub line: usize,
}
pub struct Symbol {
    pub name: String,
    pub kind: SymbolKind,       // Function, Class, Variable, Type, Interface
    pub line: usize,
}
pub struct CallInfo {
    pub caller: String,
    pub callee: String,
    pub line: usize,
}
pub enum Language { Python, TypeScript, CSharp, Dart }
```

## 내부 구조
```
infra/parser/
├── mod.rs              # ParserRegistry + LanguageParser trait
├── python.rs           # Phase 1
├── typescript.rs       # Phase 8
├── csharp.rs           # Phase 8
└── dart.rs             # Phase 8
```
