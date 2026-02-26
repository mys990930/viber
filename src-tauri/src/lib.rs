pub mod domain;
pub mod infra;
pub mod shared;

use std::sync::Mutex;

use tauri::{Emitter, Manager};

use domain::git::GitService;
use domain::graph::GraphService;
use domain::project::ProjectService;
use infra::parser::ParserRegistry;
use shared::event::{EventBus, ViberEvent};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let event_bus = EventBus::default();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Mutex::new(ProjectService::new(event_bus.clone())))
        .manage(Mutex::new(GraphService::new(event_bus.clone())))
        .manage(Mutex::new(GitService::new(event_bus.clone())))
        .manage(Mutex::new(ParserRegistry::default()))
        .manage(event_bus)
        .setup(|app| {
            let bus = app.state::<EventBus>().inner().clone();
            let app_handle = app.handle().clone();

            tauri::async_runtime::spawn(async move {
                let mut rx = bus.subscribe();
                while let Ok(event) = rx.recv().await {
                    match event {
                        // ProjectOpened / ProjectClosed → command 쪽에서 graph 처리 완료.
                        // 여기서는 FE push만.
                        ViberEvent::ProjectOpened(_) => {
                            // graph rebuild는 project_open command에서 이미 수행
                        }
                        ViberEvent::ProjectClosed => {
                            // graph clear는 project_close command에서 이미 수행
                        }

                        // FileChanged → graph rebuild (watcher에서 옴)
                        ViberEvent::FileChanged(_) => {
                            // ProjectService 락을 최소한으로 잡고 root만 꺼냄
                            let root = {
                                app_handle
                                    .state::<Mutex<ProjectService>>()
                                    .lock()
                                    .ok()
                                    .and_then(|s| s.current_root())
                            };

                            if let Some(root) = root {
                                // 락 순서 고정: ParserRegistry → GraphService
                                let registry_state = app_handle.state::<Mutex<ParserRegistry>>();
                                let graph_state = app_handle.state::<Mutex<GraphService>>();
                                if let Ok(registry) = registry_state.inner().lock() {
                                    if let Ok(mut graph) = graph_state.inner().lock() {
                                        let _ = graph.rebuild(&root, &registry);
                                    }
                                }
                            }
                        }

                        // GraphUpdated → FE에 변경 시그널만 전송 (diff 데이터 X)
                        // FE가 graph_get command로 depth-filtered 데이터를 다시 요청
                        ViberEvent::GraphUpdated(_diff) => {
                            let _ = app_handle.emit("graph:changed", ());
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
            domain::graph::commands::graph_expand_module,
            domain::graph::commands::graph_collapse_module,
            domain::git::commands::git_status,
            domain::git::commands::git_stage,
            domain::git::commands::git_unstage,
            domain::git::commands::git_commit,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
