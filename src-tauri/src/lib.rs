mod domain;
mod infra;
mod shared;

use std::sync::Mutex;

use tauri::{Emitter, Manager};

use domain::graph::GraphService;
use domain::project::ProjectService;
use infra::parser::ParserRegistry;
use shared::event::{EventBus, ViberEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 이벤트 버스 생성 (앱 전역)
    let event_bus = EventBus::default();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Mutex::new(ProjectService::new(event_bus.clone())))
        .manage(Mutex::new(GraphService::new(event_bus.clone())))
        .manage(Mutex::new(ParserRegistry::default()))
        .manage(event_bus) // Tauri State로 등록 → 모든 command에서 접근 가능
        .setup(|app| {
            let bus = app.state::<EventBus>().inner().clone();
            let app_handle = app.handle().clone();

            tauri::async_runtime::spawn(async move {
                let mut rx = bus.subscribe();
                while let Ok(event) = rx.recv().await {
                    match event {
                        ViberEvent::ProjectOpened(info) => {
                            if let Ok(parser_registry) = app_handle.state::<Mutex<ParserRegistry>>().lock() {
                                if let Ok(mut graph_service) = app_handle.state::<Mutex<GraphService>>().lock() {
                                    let _ = graph_service.rebuild(&info.root, &parser_registry);
                                }
                            }
                        }
                        ViberEvent::FileChanged(_) => {
                            let root = app_handle
                                .state::<Mutex<ProjectService>>()
                                .lock()
                                .ok()
                                .and_then(|project_service| project_service.current_root());

                            if let Some(root) = root {
                                if let Ok(parser_registry) = app_handle.state::<Mutex<ParserRegistry>>().lock() {
                                    if let Ok(mut graph_service) = app_handle.state::<Mutex<GraphService>>().lock() {
                                        let _ = graph_service.rebuild(&root, &parser_registry);
                                    }
                                }
                            }
                        }
                        ViberEvent::GraphUpdated(diff) => {
                            let _ = app_handle.emit("graph:updated", diff);
                        }
                        ViberEvent::ProjectClosed => {
                            if let Ok(mut graph_service) = app_handle.state::<Mutex<GraphService>>().lock() {
                                graph_service.clear();
                            }
                        }
                        _ => {}
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            domain::project::commands::project_validate_path,
            domain::project::commands::project_open,
            domain::project::commands::project_close,
            domain::project::commands::project_get_config,
            domain::project::commands::project_update_config,
            domain::project::commands::project_recent,
            domain::graph::commands::graph_get,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
