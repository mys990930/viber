# Viber Backend API — FastAPI 서비스 설계

> 프론트/데스크톱 클라이언트를 위한 인증/프로젝트/AI 연동 백엔드.
> 목표: 모듈 경계가 명확하고, 확장 가능한 API 서버.

## 스택

| 레이어 | 기술 |
|--------|------|
| API 서버 | FastAPI (Python 3.12+) |
| 인증 | JWT (Access + Refresh Rotation) |
| DB | PostgreSQL |
| ORM/DB 접근 | SQLAlchemy 2.x + Alembic |
| 캐시/큐(선택) | Redis |
| 오브젝트 스토리지 | AWS S3 |
| 백그라운드 작업 | FastAPI BackgroundTasks / Celery(확장 시) |
| 관측성 | Structlog + OpenTelemetry + Prometheus |
| 배포 | Docker + (AWS ECS or EC2) |

## 문서 구조

| 파일 | 내용 |
|------|------|
| `PROJECT.backend.md` | 백엔드 전체 컨텍스트 + 모듈 맵 |
| `docs/backend/ARCHITECTURE.md` | 계층/바운디드 컨텍스트/트랜잭션 전략 |
| `docs/backend/ROADMAP.md` | 백엔드 구현 순서 + 마일스톤 |
| `docs/backend/CONTRIBUTING.md` | 코딩 룰/테스트/운영 가이드 |
| `docs/backend/contracts/api.md` | OpenAPI 기준 엔드포인트 계약 |
| `docs/backend/contracts/events.md` | 도메인 이벤트/비동기 계약 |
| `docs/backend/contracts/storage.md` | S3 키 네이밍/수명주기/권한 규칙 |
| **모듈 (Backend API)** | |
| `docs/backend/modules/auth.md` | 회원가입/로그인/토큰갱신/로그아웃 |
| `docs/backend/modules/users.md` | 사용자 프로필/권한/설정 |
| `docs/backend/modules/projects.md` | 프로젝트 메타/멤버/권한 |
| `docs/backend/modules/assets.md` | 이미지/바이너리 업로드, S3 관리 |
| `docs/backend/modules/graph.md` | 의존성 그래프 저장/조회 API |
| `docs/backend/modules/flow.md` | 유스케이스 플로우 생성/조회 |
| `docs/backend/modules/context-pack.md` | LLM 컨텍스트 팩 생성 API |
| `docs/backend/modules/git.md` | Git 메타 연동(커밋/브랜치 기록) |
| `docs/backend/modules/guardrail.md` | 스코프 정책/위반 기록 |
| `docs/backend/modules/score.md` | 의존성 건강도 산출/조회 |
| `docs/backend/modules/notifications.md` | 알림/웹훅/실시간 이벤트 |
| `docs/backend/modules/admin.md` | 운영자 기능/감사 로그 |
| **공통 인프라** | |
| `docs/backend/modules/core.md` | 설정/보안/미들웨어/예외 |
| `docs/backend/modules/persistence.md` | DB 세션/UoW/리포지토리 패턴 |
| `docs/backend/modules/storage.md` | S3 어댑터/프리사인 URL |

## 모듈 경계 (clean-dev 기준)

- 기본 계층: `router -> service -> repository -> model/schema`
- 모듈 간 직접 DB 접근 금지. 교차 접근은 `service` + `contracts` 경유
- 외부 의존성(S3, Redis, 외부 AI)은 각 모듈이 아닌 `infrastructure adapter`로만 접근
- 트랜잭션 경계는 서비스 레이어에서 시작/종료
- 이벤트 발행은 서비스 완료 시점(커밋 이후)으로 제한

## 백엔드 기능 상세

### 1) 인증/세션 (Auth)
- `signup`, `signin`, `refresh`, `logout`
- Access(단기) + Refresh(장기) 토큰 분리
- Refresh 토큰 회전(rotation) + 해시 저장
- 디바이스 단위 세션 관리(선택적 강제 로그아웃)

### 2) 사용자/권한 (Users)
- 사용자 프로필 조회/수정
- 권한(Role) 및 프로젝트 단위 접근 제어
- 감사 로그 추적(권한 변경, 보안 이벤트)

### 3) 프로젝트 관리 (Projects)
- 프로젝트 생성/조회/설정 변경
- 멤버 초대/역할 부여/제거
- 프로젝트별 문서/설정 버전 관리

### 4) 에셋 저장소 (Assets + S3)
- 이미지/바이너리 업로드: 프리사인 URL 방식
- S3 key 규칙: `env/project_id/category/yyyy/mm/dd/uuid`
- 아카이브 데이터 보관 정책(Glacier 전환 가능)
- DB에는 메타데이터/권한/상태만 저장

### 5) 분석 API (Graph/Flow/Score)
- 의존성 그래프 스냅샷 저장/조회
- 엔트리포인트 기준 플로우 질의
- 건강도 점수 계산 결과 저장/비교

### 6) 컨텍스트 팩 (Context Pack)
- 선택 범위 기반 문서 생성 요청
- 생성 결과를 S3 + DB 메타로 관리
- 다운로드/재생성/버전 비교 지원

### 7) Git/가드레일/알림
- Git 이벤트 수집(커밋/브랜치/변경 범위)
- 스코프 위반 기록 + 알림 트리거
- Webhook/SSE/WS 기반 실시간 통지

## API 기준 엔드포인트 (초안)

- `POST /v1/auth/signup`
- `POST /v1/auth/signin`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`
- `GET /v1/users/me`
- `PATCH /v1/users/me`
- `POST /v1/projects`
- `GET /v1/projects/{project_id}`
- `POST /v1/assets/presign-upload`
- `POST /v1/assets/complete`
- `GET /v1/graph/{project_id}`
- `POST /v1/flow/query`
- `POST /v1/context-packs`
- `GET /v1/scores/{project_id}`

## 데이터 저장 원칙

- PostgreSQL: 정합성이 필요한 도메인 데이터 (유저, 프로젝트, 권한, 세션, 메타)
- S3: 대용량 바이너리(이미지, 아카이브 파일, 생성 문서 원본)
- 민감정보: 암호화/해시 후 저장 (비밀번호, refresh token)
- 소프트 삭제 + 감사 로그 기본 적용

## 비기능 요구사항

- 보안: JWT 키 롤오버, rate limit, CORS allowlist, 입력 검증
- 성능: p95 API latency 목표 정의(예: 300ms 이하)
- 가용성: 헬스체크/레디니스/그레이스풀 셧다운
- 운영성: 구조화 로그 + trace id + 에러 코드 표준화
- 테스트: 단위/통합/API 계약 테스트 분리

## 초기 구현 우선순위 (MVP)

1. `auth` + `users` + `projects` 최소 기능
2. `assets(S3)` 업로드/조회
3. `graph/flow` 조회 API
4. `context-pack` 생성/저장
5. `guardrail/notifications` 확장

## 디렉토리 초안

```text
backend/
  app/
    main.py
    core/                # config, security, middleware, exceptions
    modules/
      auth/
      users/
      projects/
      assets/
      graph/
      flow/
      context_pack/
      git/
      guardrail/
      score/
      notifications/
      admin/
    infrastructure/
      db/
      s3/
      cache/
      messaging/
  alembic/
  tests/
    unit/
    integration/
    contract/
```

---

이 문서는 프론트 `PROJECT.md`와 맞물리는 백엔드 기준 문서이며,
모듈별 상세 설계는 각 `docs/backend/modules/*.md`에서 3개 문서 단위로 쪼개 작성한다.
