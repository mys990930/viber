use std::path::Path;

use serde::Serialize;

use crate::infra::parser::ParserRegistry;
use crate::shared::error::ViberError;
use crate::shared::event::{EventBus, ViberEvent};
use crate::shared::types::{GraphEdge, GraphNode, GraphNodeType, EdgeKind};

use super::builder;
use super::diff;

#[derive(Debug, Clone, Copy)]
pub enum GraphDepth {
    Packages,
    Modules,
    Files,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphData {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
}

pub struct GraphService {
    bus: EventBus,
    graph: GraphData,
}

impl GraphService {
    pub fn new(bus: EventBus) -> Self {
        Self {
            bus,
            graph: GraphData {
                nodes: Vec::new(),
                edges: Vec::new(),
            },
        }
    }

    pub fn get_graph(&self, depth: GraphDepth) -> GraphData {
        let allowed_node_types = match depth {
            GraphDepth::Packages => vec![GraphNodeType::Package],
            GraphDepth::Modules => vec![GraphNodeType::Package, GraphNodeType::Module],
            GraphDepth::Files => vec![GraphNodeType::Package, GraphNodeType::Module, GraphNodeType::File],
        };

        let allowed_edge_kinds = match depth {
            GraphDepth::Packages => vec![EdgeKind::PackageDep],
            GraphDepth::Modules => vec![EdgeKind::PackageDep, EdgeKind::ModuleImport],
            GraphDepth::Files => vec![EdgeKind::PackageDep, EdgeKind::ModuleImport, EdgeKind::FileImport],
        };

        let nodes: Vec<GraphNode> = self.graph.nodes.iter()
            .filter(|n| allowed_node_types.contains(&n.node_type))
            .cloned()
            .collect();

        let node_ids: std::collections::HashSet<&str> = nodes.iter().map(|n| n.id.as_str()).collect();

        let edges: Vec<GraphEdge> = self.graph.edges.iter()
            .filter(|e| {
                allowed_edge_kinds.contains(&e.kind)
                    && node_ids.contains(e.source.as_str())
                    && node_ids.contains(e.target.as_str())
            })
            .cloned()
            .collect();

        println!("[BE] get_graph depth={:?}: {} nodes, {} edges (full: {} nodes, {} edges)",
            depth, nodes.len(), edges.len(), self.graph.nodes.len(), self.graph.edges.len());

        GraphData { nodes, edges }
    }

    pub fn rebuild(&mut self, root: &Path, parser_registry: &ParserRegistry) -> Result<(), ViberError> {
        let next = builder::build_graph(root, parser_registry);
        let current = self.graph.clone();

        self.graph = next.clone();

        let graph_diff = diff::compute_diff(&current, &next);
        self.bus.emit(ViberEvent::GraphUpdated(graph_diff));

        Ok(())
    }

    pub fn clear(&mut self) {
        let current = self.graph.clone();
        let next = GraphData {
            nodes: Vec::new(),
            edges: Vec::new(),
        };

        self.graph = next.clone();

        let graph_diff = diff::compute_diff(&current, &next);
        self.bus.emit(ViberEvent::GraphUpdated(graph_diff));
    }
}
