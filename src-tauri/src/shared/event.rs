/// 이벤트 버스 — 모듈 간 통신의 중추
///
/// 모든 BE 모듈은 EventBus를 통해 비동기로 소통한다.
/// - 발행: `bus.emit(ViberEvent::GraphUpdated(diff))`
/// - 구독: `let mut rx = bus.subscribe();`
///
/// 이벤트는 broadcast 채널로 전달되므로 모든 구독자가 받는다.
/// 프론트엔드 push는 Tauri의 `app.emit()`을 이벤트 핸들러에서 호출.

use serde::Serialize;
use tokio::sync::broadcast;

use super::types::*;

// ─── 이벤트 정의 ───

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", content = "payload")]
pub enum ViberEvent {
    // watcher →
    FileChanged(FileEvent),

    // project →
    ProjectOpened(ProjectInfo),
    ProjectClosed,
    ConfigChanged(ViberConfig),

    // graph →
    GraphUpdated(GraphDiff),

    // git →
    GitStatusChanged(GitStatus),

    // guardrail →
    GuardrailViolation(Violation),

    // score →
    ScoreUpdated(HealthScore),
}

// ─── 이벤트 버스 ───

#[derive(Clone)]
pub struct EventBus {
    tx: broadcast::Sender<ViberEvent>,
}

impl EventBus {
    /// 새 이벤트 버스 생성. capacity = 버퍼 크기.
    pub fn new(capacity: usize) -> Self {
        let (tx, _) = broadcast::channel(capacity);
        Self { tx }
    }

    /// 이벤트 발행. 구독자가 없어도 에러 아님.
    pub fn emit(&self, event: ViberEvent) {
        let _ = self.tx.send(event);
    }

    /// 구독자 생성. 이후 발행되는 이벤트를 수신.
    pub fn subscribe(&self) -> broadcast::Receiver<ViberEvent> {
        self.tx.subscribe()
    }
}

impl Default for EventBus {
    fn default() -> Self {
        Self::new(256)
    }
}
