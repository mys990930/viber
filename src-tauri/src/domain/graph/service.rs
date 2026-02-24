use std::path::Path;

use serde::Serialize;

use crate::infra::parser::ParserRegistry;
use crate::shared::error::ViberError;
use crate::shared::event::{EventBus, ViberEvent};
use crate::shared::types::{GraphEdge, GraphNode};

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

    pub fn get_graph(&self, _depth: GraphDepth) -> GraphData {
        self.graph.clone()
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
