# Module: backend/score

> 의존성 건강도 점수. SOLID 원칙 기반 메트릭 계산.

## 책임
- 그래프 기반 메트릭 계산
- 순환 의존성 탐지
- 결합도/응집도 계산
- 모듈별 점수 + 개선 제안

## Public API
```rust
pub fn get_score() -> HealthScore
pub fn get_module_score(module_id: &str) -> ModuleScore
```

## 발행 이벤트
| 이벤트 | Payload | 설명 |
|--------|---------|------|
| `score::Updated` | `HealthScore` | 그래프 변경 후 재계산 완료 |

## 구독 이벤트
| 이벤트 | 발행자 | 처리 |
|--------|--------|------|
| `graph::Updated` | graph | 메트릭 재계산 → 점수 발행 |

## 의존 모듈
- `graph` — 그래프 구조 조회 (쿼리)

## 내부 구조
```
domain/score/
├── mod.rs              # ScoreService
└── metrics.rs          # 개별 메트릭 계산 로직
```

## 타입
```rust
pub struct HealthScore {
    pub overall: f64,               // 0-100
    pub metrics: ScoreMetrics,
}
pub struct ScoreMetrics {
    pub single_responsibility: f64,
    pub dependency_inversion: f64,
    pub circular_dependencies: Vec<Cycle>,
    pub coupling: f64,
    pub cohesion: f64,
}
pub struct Cycle {
    pub modules: Vec<String>,
}
pub struct ModuleScore {
    pub module_id: String,
    pub score: f64,
    pub issues: Vec<String>,
}
```

## 계산 로직
- **SRP**: 모듈당 export 수 + LOC → 임계값 초과 시 감점
- **DIP**: 간선 방향 — 추상→구체 비율
- **순환**: Tarjan's SCC 알고리즘
- **결합도**: out-degree 평균 (낮을수록 좋음)
- **응집도**: 모듈 내 심볼 간 내부 참조율 (높을수록 좋음)
