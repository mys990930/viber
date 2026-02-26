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

    pub fn expand_module(&self, module_path: &str) -> GraphData {
        // module_path에 해당하는 직속 파일 노드 + 그 파일들 간 엣지 반환
        let prefix = if module_path == "." {
            String::new()
        } else {
            format!("{}/", module_path)
        };

        let module_id = format!("module:{module_path}");

        // 직속 파일만 (서브디렉토리의 파일은 제외)
        let nodes: Vec<GraphNode> = self.graph.nodes.iter()
            .filter(|n| {
                if n.node_type != GraphNodeType::File {
                    return false;
                }
                let Some(ref path) = n.path else { return false };
                let path_str = path.to_string_lossy();

                if module_path == "." {
                    // 루트 모듈: 슬래시 없는 파일만
                    !path_str.contains('/')
                } else {
                    // 해당 디렉토리의 직속 파일
                    path_str.starts_with(&prefix)
                        && !path_str[prefix.len()..].contains('/')
                }
            })
            .cloned()
            .collect();

        let node_ids: std::collections::HashSet<&str> = nodes.iter()
            .map(|n| n.id.as_str())
            .collect();

        // 모듈→파일 엣지 + 파일↔파일 엣지 (source 또는 target이 이 파일셋에 속하는 것)
        let edges: Vec<GraphEdge> = self.graph.edges.iter()
            .filter(|e| {
                // 모듈→파일 (부모 관계)
                if e.source == module_id && node_ids.contains(e.target.as_str()) {
                    return true;
                }
                // 파일→파일 (import 관계) — 양쪽 다 이 모듈 파일이거나, 한쪽이 다른 모듈 파일
                if e.kind == EdgeKind::FileImport
                    && (node_ids.contains(e.source.as_str()) || node_ids.contains(e.target.as_str()))
                {
                    return true;
                }
                false
            })
            .cloned()
            .collect();

        println!("[BE] expand_module '{}': {} files, {} edges", module_path, nodes.len(), edges.len());

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
