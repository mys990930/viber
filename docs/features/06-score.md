# Feature 06 — 의존성 점수 (SOLID)

> 프로젝트 의존성 건강도를 SOLID 원칙 기반으로 점수화.

---

## 백엔드

### ScoreService
- GraphService 참조 → 그래프 구조에서 메트릭 계산
- 그래프 변경 시 자동 재계산 → 이벤트 push

### 메트릭
```rust
pub struct HealthScore {
    pub overall: f64,                   // 0-100 (가중 평균)
    pub metrics: ScoreMetrics,
}
pub struct ScoreMetrics {
    pub single_responsibility: f64,     // 모듈당 export 수, LOC 기반
    pub dependency_inversion: f64,      // 추상→구체 방향 비율
    pub circular_dependencies: Vec<Cycle>,
    pub coupling: f64,                  // 모듈당 평균 의존 수 (낮을수록 좋음)
    pub cohesion: f64,                  // 모듈 내 심볼 간 참조율 (높을수록 좋음)
}
pub struct Cycle {
    pub modules: Vec<ModuleId>,
}
```

### 계산 로직
- **SRP**: 모듈당 export 심볼 수 + LOC → 임계값 초과 시 감점
- **DIP**: 간선 방향 분석 — 추상 모듈→구체 모듈 비율
- **순환**: Tarjan's SCC 알고리즘
- **결합도**: out-degree 평균
- **응집도**: 모듈 내 심볼 간 내부 참조 비율

---

## 프론트엔드

### ScoreCard
- 툴바에 전체 점수 배지 (색상으로 건강도 표시)
- 클릭 → 상세 패널 열기

### MetricBreakdown
- 각 메트릭 막대 그래프
- 메트릭별 설명 + 개선 제안

### CycleWarning
- 순환 의존성 경고 목록
- 클릭 → 그래프에서 순환 경로 하이라이트

---

## API

```typescript
invoke('score:get') → HealthScore
invoke('score:module', { moduleId }) → { moduleId, score, issues: string[] }

listen('score:updated', (e: HealthScore) => void)
```
