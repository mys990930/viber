use std::sync::Mutex;

use tauri::State;

use super::service::{GraphDepth, GraphService};
use crate::shared::error::ViberError;

type GraphState = Mutex<GraphService>;

#[tauri::command]
pub fn graph_get(state: State<'_, GraphState>, depth: String) -> Result<serde_json::Value, ViberError> {
    println!("[BE] graph_get called, depth={}", depth);
    let service = state
        .lock()
        .map_err(|e| ViberError::Other(format!("graph state poisoned: {e}")))?;

    let depth = parse_depth(&depth)?;
    let graph = service.get_graph(depth);
    println!("[BE] graph_get: nodes={}, edges={}", graph.nodes.len(), graph.edges.len());

    serde_json::to_value(graph).map_err(|e| ViberError::Other(format!("graph serialization failed: {e}")))
}

#[tauri::command]
pub fn graph_expand_module(state: State<'_, GraphState>, module_path: String) -> Result<serde_json::Value, ViberError> {
    let service = state
        .lock()
        .map_err(|e| ViberError::Other(format!("graph state poisoned: {e}")))?;

    let data = service.expand_module(&module_path);

    serde_json::to_value(data).map_err(|e| ViberError::Other(format!("graph serialization failed: {e}")))
}

#[tauri::command]
pub fn graph_collapse_module() -> Result<(), ViberError> {
    // BE는 상태 변경 없음 — FE가 cy.remove()로 처리
    Ok(())
}

fn parse_depth(raw: &str) -> Result<GraphDepth, ViberError> {
    match raw {
        "packages" => Ok(GraphDepth::Packages),
        "modules" => Ok(GraphDepth::Modules),
        _ => Err(ViberError::Other(format!("invalid graph depth: {raw}"))),
    }
}
