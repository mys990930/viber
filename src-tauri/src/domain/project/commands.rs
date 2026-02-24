use std::path::PathBuf;
use std::sync::Mutex;

use tauri::State;

use super::service::ProjectService;
use crate::infra::parser::ParserRegistry;
use crate::shared::error::ViberError;
use crate::shared::types::{PartialConfig, ProjectInfo, RecentProject, ViberConfig};

type ProjectState = Mutex<ProjectService>;

#[tauri::command]
pub fn project_open(
    state: State<'_, ProjectState>,
    parser_registry: State<'_, Mutex<ParserRegistry>>,
    path: String,
) -> Result<ProjectInfo, ViberError> {
    let mut service = state
        .lock()
        .map_err(|e| ViberError::Other(format!("project state poisoned: {e}")))?;
    let registry = parser_registry
        .lock()
        .map_err(|e| ViberError::Other(format!("parser registry state poisoned: {e}")))?;
    service.open(&PathBuf::from(path), &registry)
}

#[tauri::command]
pub fn project_close(state: State<'_, ProjectState>) -> Result<(), ViberError> {
    let mut service = state
        .lock()
        .map_err(|e| ViberError::Other(format!("project state poisoned: {e}")))?;
    service.close()
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
