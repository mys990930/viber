use std::path::PathBuf;
use std::sync::Mutex;

use tauri::State;

use super::service::ProjectService;
use crate::domain::graph::GraphService;
use crate::infra::parser::ParserRegistry;
use crate::shared::error::ViberError;
use crate::shared::types::{PartialConfig, ProjectInfo, RecentProject, ViberConfig};

type ProjectState = Mutex<ProjectService>;

#[tauri::command]
pub fn project_validate_path(state: State<'_, ProjectState>, path: String) -> Result<(), ViberError> {
    let service = state
        .lock()
        .map_err(|e| ViberError::Other(format!("project state poisoned: {e}")))?;
    service.validate_path(&PathBuf::from(path))
}

#[tauri::command]
pub fn project_open(
    state: State<'_, ProjectState>,
    parser_registry: State<'_, Mutex<ParserRegistry>>,
    graph_state: State<'_, Mutex<GraphService>>,
    app: tauri::AppHandle,
    path: String,
) -> Result<ProjectInfo, ViberError> {
    // 1. 프로젝트 열기 (ParserRegistry 락은 여기서만 잡고 빨리 풀기)
    let info = {
        let mut service = state
            .lock()
            .map_err(|e| ViberError::Other(format!("project state poisoned: {e}")))?;
        let registry = parser_registry
            .lock()
            .map_err(|e| ViberError::Other(format!("parser registry state poisoned: {e}")))?;
        println!("[BE] project_open: opening path={}", path);
        let info = service.open(&PathBuf::from(&path), &registry)?;
        println!("[BE] project_open: opened, name={}, languages={:?}", info.name, info.languages);
        // registry 락 여기서 해제됨
        info
    };
    // state 락도 여기서 해제됨

    // 2. 그래프 빌드 (별도 락 획득 — 위 락들은 이미 풀림)
    {
        let registry = parser_registry
            .lock()
            .map_err(|e| ViberError::Other(format!("parser registry poisoned: {e}")))?;
        let mut graph = graph_state
            .lock()
            .map_err(|e| ViberError::Other(format!("graph state poisoned: {e}")))?;
        println!("[BE] project_open: rebuilding graph...");
        let _ = graph.rebuild(&info.root, &registry);
        println!("[BE] project_open: graph rebuild done");
    }

    Ok(info)
}

#[tauri::command]
pub fn project_close(
    state: State<'_, ProjectState>,
    graph_state: State<'_, Mutex<GraphService>>,
) -> Result<(), ViberError> {
    let mut service = state
        .lock()
        .map_err(|e| ViberError::Other(format!("project state poisoned: {e}")))?;
    service.close()?;

    // 그래프도 클리어
    if let Ok(mut graph) = graph_state.lock() {
        graph.clear();
    }

    Ok(())
}

#[tauri::command]
pub fn project_get_config(state: State<'_, ProjectState>) -> Result<ViberConfig, ViberError> {
    let service = state
        .lock()
        .map_err(|e| ViberError::Other(format!("project state poisoned: {e}")))?;
    service.get_config()
}

#[tauri::command]
pub fn project_update_config(
    state: State<'_, ProjectState>,
    config: PartialConfig,
) -> Result<ViberConfig, ViberError> {
    let mut service = state
        .lock()
        .map_err(|e| ViberError::Other(format!("project state poisoned: {e}")))?;
    service.update_config(config)
}

#[tauri::command]
pub fn project_recent(state: State<'_, ProjectState>) -> Result<Vec<RecentProject>, ViberError> {
    let service = state
        .lock()
        .map_err(|e| ViberError::Other(format!("project state poisoned: {e}")))?;
    Ok(service.recent_projects())
}
