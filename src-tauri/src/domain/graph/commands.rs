use std::sync::Mutex;

use tauri::State;

use super::service::{GraphDepth, GraphService};
use crate::shared::error::ViberError;

type GraphState = Mutex<GraphService>;

#[tauri::command]
pub fn graph_get(state: State<'_, GraphState>, depth: String) -> Result<serde_json::Value, ViberError> {
    let service = state
        .lock()
        .map_err(|e| ViberError::Other(format!("graph state poisoned: {e}")))?;

    let depth = parse_depth(&depth)?;
    let graph = service.get_graph(depth);

    serde_json::to_value(graph).map_err(|e| ViberError::Other(format!("graph serialization failed: {e}")))
}

fn parse_depth(raw: &str) -> Result<GraphDepth, ViberError> {
    match raw {
        "packages" => Ok(GraphDepth::Packages),
        "modules" => Ok(GraphDepth::Modules),
        "files" => Ok(GraphDepth::Files),
        _ => Err(ViberError::Other(format!("invalid graph depth: {raw}"))),
    }
}
