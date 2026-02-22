# Viber — 바이브 코딩 모듈화 도우미

> 모듈 간 의존성을 실시간 시각화하고, Git 버전 관리를 자동화하며, AI 에이전트와 연동되는 로컬 개발 도구.

---

## 🎯 프로젝트 목표

바이브 코딩에서 **모듈화된 프로젝트 개발**을 돕는 데스크톱 앱.
코드베이스의 구조를 한눈에 파악하고, 빠르게 버전 관리하고, AI 에이전트가 직접 조작할 수 있게 한다.

---

## 🧩 핵심 기능

### 1. 의존성 그래프 시각화
- Obsidian graph view 스타일의 인터랙티브 그래프
- **노드** = 모듈(파일), **간선** = import/의존 관계
- 간선 hover → 의존 객체(함수, 클래스, 변수) 하이라이트
- 패키지(외부 라이브러리) 의존성도 표시
- 3단계 로딩: 패키지 → 모듈 import → 심볼 (지연 로딩)

### 2. Git 퀵 커밋/브랜치
- UI 버튼으로 즉시 커밋, 브랜치 생성/전환
- 사람이 수동 실행 가능 + AI 에이전트가 API로 실행 가능
- daemon이 "명시적 tool API"로 제공, 에이전트는 해당 API(MCP 포함) 호출

### 3. 실시간 트래킹
- 파일 변경 감지 → 의존성 그래프 자동 갱신
- WebSocket으로 UI에 즉시 반영

### 4. 다중 언어 지원
- Python, C#, Dart 등
- Tree-sitter 기반 AST 파싱
- 언어별 파서 모듈로 확장 가능

---

## 🏗️ 아키텍처

```
┌─────────────────────────────────────────────┐
│              React + Cytoscape.js            │  ← 프론트엔드 (UI)
│              (TypeScript, Vite)              │
└──────────────────┬──────────────────────────┘
                   │ Tauri IPC + WebSocket
┌──────────────────┴──────────────────────────┐
│              Rust Backend (Tauri)             │  ← daemon
│  ┌──────────┐ ┌────────┐ ┌───────────────┐  │
│  │ watcher  │ │ parser │ │   git engine   │  │
│  │(notify)  │ │(tree-  │ │  (git2-rs)     │  │
│  │          │ │sitter) │ │                │  │
│  └──────────┘ └────────┘ └───────────────┘  │
│  ┌──────────────┐ ┌─────────────────────┐   │
│  │ graph engine │ │   MCP server        │   │
│  │ (petgraph)   │ │ (에이전트 연동)      │   │
│  └──────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────┘
```

### 앱 형태
- **로컬 데스크톱 앱** (Tauri v2)
- Rust 백엔드 = daemon (파일 감시, 파싱, Git, API)
- React 프론트엔드 = UI (그래프 뷰, Git 패널)

---

## 🔧 기술 스택

| 레이어 | 기술 | 용도 |
|--------|------|------|
| 프론트엔드 | React + TypeScript + Vite | UI |
| 그래프 시각화 | Cytoscape.js | Obsidian 스타일 그래프 |
| 데스크톱 프레임워크 | Tauri v2 | 경량 데스크톱 앱 |
| 백엔드 | Rust | daemon / 핵심 엔진 |
| 파일 감시 | notify (Rust crate) | 실시간 파일 변경 감지 |
| AST 파싱 | tree-sitter | 다중 언어 의존성 추출 |
| Git 조작 | git2-rs (libgit2) | 프로그래매틱 Git |
| 그래프 자료구조 | petgraph | 의존성 그래프 관리 |
| AI 연동 | MCP 서버 | 에이전트 tool API |

---

## 📁 디렉토리 구조

```
viber/
├── src-tauri/                # Rust 백엔드
│   ├── src/
│   │   ├── main.rs           # 엔트리포인트
│   │   ├── lib.rs            # Tauri 설정
│   │   ├── watcher/          # 파일 감시 (notify)
│   │   ├── parser/           # 언어별 Tree-sitter 파서
│   │   │   ├── mod.rs
│   │   │   ├── python.rs
│   │   │   ├── csharp.rs
│   │   │   └── dart.rs
│   │   ├── git/              # Git 엔진 (git2-rs)
│   │   ├── graph/            # 의존성 그래프 (petgraph)
│   │   ├── api/              # Tauri commands (IPC)
│   │   └── mcp/              # MCP 서버
│   └── Cargo.toml
├── src/                      # React 프론트엔드
│   ├── components/
│   │   ├── GraphView/        # Cytoscape.js 그래프 뷰
│   │   ├── GitPanel/         # Git 커밋/브랜치 UI
│   │   └── ModuleDetail/     # 모듈 상세 (hover 심볼)
│   ├── hooks/
│   ├── App.tsx
│   └── main.tsx
├── PROJECT.md                # 이 파일
├── package.json
├── tauri.conf.json
└── vite.config.ts
```

---

## 🗺️ 로드맵

| 단계 | 범위 | 상태 |
|------|------|------|
| **v0.1** | Python 의존성 파싱 + 그래프 뷰 + 실시간 감시 | 🔜 |
| **v0.2** | Git 퀵 커밋/브랜치 UI + API | ⏳ |
| **v0.3** | MCP 서버 (에이전트 연동) | ⏳ |
| **v0.4** | C#, Dart 파서 추가 | ⏳ |
| **v0.5** | 간선 hover 심볼 상세 + UX 개선 | ⏳ |

---

## 🚀 개발 환경

```bash
# 의존성 설치
pnpm install

# 개발 모드 실행
pnpm tauri dev

# 빌드
pnpm tauri build
```

### 필수 설치
- Rust (rustup)
- Node.js + pnpm
- Xcode Command Line Tools (macOS)

---

## 💡 설계 원칙

1. **daemon이 모든 기능을 API로 제공** — UI와 에이전트가 동일한 인터페이스 사용
2. **심볼 파싱은 지연 로딩** — 패키지 → 모듈 → 심볼 3단계로 필요할 때만
3. **언어 파서는 모듈로 분리** — 새 언어 추가 시 파서 모듈만 작성
4. **Git은 직접 조작하지 않음** — 반드시 daemon API를 통해서만 (안전성)
