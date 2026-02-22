# Feature 07 — 컨텍스트 팩 생성

> 선택한 모듈/플로우를 LLM에 먹일 수 있는 컨텍스트 문서로 변환.

---

## 백엔드

### ContextService
- GraphService + FlowService 참조
- 선택된 모듈의 구조/의존 관계/코드를 텍스트로 조합

### 타입
```rust
pub enum ContextFormat {
    Markdown,   // 구조화된 .md (섹션 나눔, 코드블록 포함)
    Prompt,     // 한 덩어리 텍스트, 복붙용, 짧게
}
pub struct ContextRequest {
    pub module_ids: Vec<ModuleId>,
    pub flow_id: Option<FlowId>,
    pub format: ContextFormat,
    pub max_tokens: Option<usize>,
}
pub struct ContextPack {
    pub content: String,
    pub format: ContextFormat,
    pub included_modules: Vec<ModuleId>,
    pub token_estimate: usize,
}
```

### 생성 로직
1. 선택 모듈의 **의존 관계** 요약 (어디서 import, 누가 import)
2. 각 모듈의 **export 심볼** 목록
3. 플로우 포함 시 **호출 체인** 설명
4. `max_tokens` 있으면 중요도 순 잘라냄
5. Markdown: 섹션별 정리 / Prompt: 한 블록 압축

---

## 프론트엔드

### ContextBuilder
- 그래프에서 모듈 다중 선택 → "Generate Context" 버튼
- 또는 플로우 즐겨찾기에서 "Context Pack" 버튼
- 포맷 선택: Markdown / Prompt
- 토큰 제한 슬라이더 (선택)

### ContextPreview
- 생성된 텍스트 미리보기 (syntax highlight)
- 토큰 추정치 표시

### CopyButton
- 클립보드에 복사 (Tauri clipboard API)
- 복사 완료 피드백 ("Copied!")

---

## API

```typescript
invoke('context:generate', {
  moduleIds: string[],
  flowId?: string,
  format: 'markdown' | 'prompt',
  maxTokens?: number,
}) → { content, tokenEstimate, includedModules }

invoke('context:copy', { content: string }) → void
```
