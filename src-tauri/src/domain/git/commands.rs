use std::path::PathBuf;
use std::sync::Mutex;

use tauri::State;

use super::service::GitService;
use crate::domain::project::ProjectService;
use crate::shared::error::ViberError;
use crate::shared::types::GitStatus;

type GitState = Mutex<GitService>;
type ProjectState = Mutex<ProjectService>;

#[tauri::command]
pub fn git_status(
    git_state: State<'_, GitState>,
    project_state: State<'_, ProjectState>,
) -> Result<GitStatus, ViberError> {
    let root = resolve_repo_root(&project_state)?;
    let service = git_state
        .lock()
        .map_err(|e| ViberError::Other(format!("git state poisoned: {e}")))?;
    service.status(&root)
}

#[tauri::command]
pub fn git_stage(
    git_state: State<'_, GitState>,
    project_state: State<'_, ProjectState>,
    path: String,
) -> Result<GitStatus, ViberError> {
    let root = resolve_repo_root(&project_state)?;
    let service = git_state
        .lock()
        .map_err(|e| ViberError::Other(format!("git state poisoned: {e}")))?;
    service.stage(&root, vec![path])
}

#[tauri::command]
pub fn git_unstage(
    git_state: State<'_, GitState>,
    project_state: State<'_, ProjectState>,
    path: String,
) -> Result<GitStatus, ViberError> {
    let root = resolve_repo_root(&project_state)?;
    let service = git_state
        .lock()
        .map_err(|e| ViberError::Other(format!("git state poisoned: {e}")))?;
    service.unstage(&root, vec![path])
}

#[tauri::command]
pub fn git_commit(
    git_state: State<'_, GitState>,
    project_state: State<'_, ProjectState>,
    message: String,
) -> Result<String, ViberError> {
    let root = resolve_repo_root(&project_state)?;
    let service = git_state
        .lock()
        .map_err(|e| ViberError::Other(format!("git state poisoned: {e}")))?;
    service.commit(&root, &message)
}

fn resolve_repo_root(project_state: &State<'_, ProjectState>) -> Result<PathBuf, ViberError> {
    let project = project_state
        .lock()
        .map_err(|e| ViberError::Other(format!("project state poisoned: {e}")))?;
    project.current_root().ok_or(ViberError::ProjectNotOpen)
}
