use std::collections::HashMap;

use crate::shared::types::GraphDiff;

use super::service::GraphData;

pub fn compute_diff(before: &GraphData, after: &GraphData) -> GraphDiff {
    let before_nodes = before
        .nodes
        .iter()
        .map(|node| (node.id.clone(), node))
        .collect::<HashMap<_, _>>();
    let after_nodes = after
        .nodes
        .iter()
        .map(|node| (node.id.clone(), node))
        .collect::<HashMap<_, _>>();

    let before_edges = before
        .edges
        .iter()
        .map(|edge| (edge.id.clone(), edge))
        .collect::<HashMap<_, _>>();
    let after_edges = after
        .edges
        .iter()
        .map(|edge| (edge.id.clone(), edge))
        .collect::<HashMap<_, _>>();

    let added_nodes = after
        .nodes
        .iter()
        .filter(|node| !before_nodes.contains_key(&node.id))
        .cloned()
        .collect();

    let removed_nodes = before
        .nodes
        .iter()
        .filter(|node| !after_nodes.contains_key(&node.id))
        .map(|node| node.id.clone())
        .collect();

    let added_edges = after
        .edges
        .iter()
        .filter(|edge| !before_edges.contains_key(&edge.id))
        .cloned()
        .collect();

    let removed_edges = before
        .edges
        .iter()
        .filter(|edge| !after_edges.contains_key(&edge.id))
        .map(|edge| edge.id.clone())
        .collect();

    GraphDiff {
        added_nodes,
        removed_nodes,
        added_edges,
        removed_edges,
        updated_nodes: Vec::new(),
    }
}
