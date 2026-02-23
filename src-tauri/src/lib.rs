mod shared;

use shared::event::EventBus;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 이벤트 버스 생성 (앱 전역)
    let event_bus = EventBus::default();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(event_bus) // Tauri State로 등록 → 모든 command에서 접근 가능
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
