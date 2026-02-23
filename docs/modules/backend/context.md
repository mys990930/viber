# Module: backend/context

> 선택한 모듈/플로우를 LLM용 컨텍스트 문서로 변환.

## 책임
- 모듈/플로우 선택 → 구조화된 텍스트 생성
- Markdown / Prompt 포맷
- 토큰 추정
- 클립보드 복사 지원

## Public API
```rust
pub fn generate(req: ContextRequest) -> Result<ContextPack>
pub fn copy_to_clipboard(content: &str) -> Result<()>
```

## 발행 이벤트
없음 (요청-응답)

## 구독 이벤트
없음

## 의존 모듈
- `graph` — 모듈 구조/의존 관계 조회 (쿼리)
- `flow` — 플로우 경로 조회 (쿼리)

## 내부 구조
```
domain/context/
├── mod.rs              # ContextService
└── formatter.rs        # Markdown/Prompt 포맷 생성
```

## 타입
```rust
pub enum ContextFormat { Markdown, Prompt }
pub struct ContextRequest {
    pub module_ids: Vec<String>,
    pub flow_id: Option<String>,
    pub format: ContextFormat,
    pub max_tokens: Option<usize>,
}
pub struct ContextPack {
    pub content: String,
    pub format: ContextFormat,
    pub included_modules: Vec<String>,
    pub token_estimate: usize,
}
```

## 생성 로직
1. 선택 모듈의 의존 관계 요약
2. 각 모듈의 export 심볼 목록
3. 플로우 포함 시 호출 체인 설명
4. `max_tokens` 있으면 중요도 순 잘라냄
5. Markdown: 섹션별 정리 + 코드블록 / Prompt: 한 블록 압축
