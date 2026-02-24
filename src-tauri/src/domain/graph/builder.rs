use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};

use petgraph::graph::DiGraph;

use crate::infra::parser::ParserRegistry;
use crate::shared::types::{EdgeKind, GraphEdge, GraphNode, GraphNodeType, Language};

use super::service::GraphData;

pub fn build_graph(root: &Path, parser_registry: &ParserRegistry) -> GraphData {
    let mut graph = DiGraph::<String, EdgeKind>::new();
    let mut nodes = Vec::new();
    let mut edges = Vec::new();

    let root_id = "module:project".to_string();

    let mut files = Vec::new();
    collect_files(root, &mut files);

    let mut python_node_by_module = HashMap::new();
    let mut python_files = Vec::new();

    for file in files {
        if is_excluded(&file) {
            continue;
        }

        let relative = match file.strip_prefix(root) {
            Ok(path) => path,
            Err(_) => continue,
        };

        let language = parser_registry.detect_language(&file);
        let id = format!("file:{}", relative.display());
        let label = relative
            .file_name()
            .map(|name| name.to_string_lossy().to_string())
            .unwrap_or_else(|| relative.display().to_string());

        graph.add_node(id.clone());
        nodes.push(GraphNode {
            id: id.clone(),
            node_type: GraphNodeType::File,
            label,
            path: Some(relative.to_path_buf()),
            language,
        });

        if language == Some(Language::Python) {
            python_files.push(relative.to_path_buf());
            for module_name in python_module_names(relative) {
                python_node_by_module.insert(module_name, id.clone());
            }
        }
    }

    if let Some(parser) = parser_registry.get(Language::Python) {
        for relative in python_files {
            let source_id = format!("file:{}", relative.display());
            let absolute = root.join(&relative);
            let source = match std::fs::read_to_string(&absolute) {
                Ok(content) => content,
                Err(_) => continue,
            };

            let imports = parser.parse_imports(&source);
            for import in imports {
                if let Some(target_id) = python_node_by_module.get(&import.source) {
                    let edge_id = format!("file_import:{source_id}->{target_id}");
                    edges.push(GraphEdge {
                        id: edge_id,
                        source: source_id.clone(),
                        target: target_id.clone(),
                        kind: EdgeKind::FileImport,
                    });
                }
            }
        }
    }

    let package_names = parse_package_dependencies(root);
    let mut seen_pkg = HashSet::new();

    if !package_names.is_empty() {
        nodes.push(GraphNode {
            id: root_id.clone(),
            node_type: GraphNodeType::Module,
            label: "project".to_string(),
            path: Some(PathBuf::from(".")),
            language: None,
        });
    }

    for package in package_names {
        if !seen_pkg.insert(package.clone()) {
            continue;
        }

        let pkg_node_id = format!("package:{package}");
        nodes.push(GraphNode {
            id: pkg_node_id.clone(),
            node_type: GraphNodeType::Package,
            label: package.clone(),
            path: None,
            language: None,
        });

        edges.push(GraphEdge {
            id: format!("package_dep:{root_id}->{pkg_node_id}"),
            source: root_id.clone(),
            target: pkg_node_id,
            kind: EdgeKind::PackageDep,
        });
    }

    let _ = &graph;

    GraphData { nodes, edges }
}

fn collect_files(dir: &Path, files: &mut Vec<PathBuf>) {
    let entries = match std::fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_files(&path, files);
        } else {
            files.push(path);
        }
    }
}

fn is_excluded(path: &Path) -> bool {
    path.components().any(|c| c.as_os_str() == ".git")
        || path.components().any(|c| c.as_os_str() == "node_modules")
        || path.components().any(|c| c.as_os_str() == "target")
        || path.components().any(|c| c.as_os_str() == ".viber")
}

fn python_module_names(relative: &Path) -> Vec<String> {
    if relative.extension().and_then(|ext| ext.to_str()) != Some("py") {
        return Vec::new();
    }

    let mut names = Vec::new();
    let normalized = relative.to_string_lossy().replace('\\', "/");

    if normalized.ends_with("/__init__.py") {
        let package = normalized
            .trim_end_matches("/__init__.py")
            .replace('/', ".");
        if !package.is_empty() {
            names.push(package);
        }
        return names;
    }

    let module = normalized.trim_end_matches(".py").replace('/', ".");
    if !module.is_empty() {
        names.push(module.clone());
    }

    if let Some(last) = module.split('.').last() {
        if !last.is_empty() {
            names.push(last.to_string());
        }
    }

    names
}

fn parse_package_dependencies(root: &Path) -> Vec<String> {
    let mut packages = Vec::new();

    let requirements = root.join("requirements.txt");
    if let Ok(content) = std::fs::read_to_string(requirements) {
        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }

            if let Some(name) = parse_requirement_name(trimmed) {
                packages.push(name);
            }
        }
    }

    let pyproject = root.join("pyproject.toml");
    if let Ok(content) = std::fs::read_to_string(pyproject) {
        packages.extend(parse_pyproject_dependencies(&content));
    }

    packages
}

fn parse_requirement_name(line: &str) -> Option<String> {
    let mut end = line.len();
    for (index, ch) in line.char_indices() {
        if matches!(ch, '=' | '<' | '>' | '!' | '~' | '[' | ';' | ' ') {
            end = index;
            break;
        }
    }

    let name = line[..end].trim();
    if name.is_empty() {
        None
    } else {
        Some(name.to_string())
    }
}

fn parse_pyproject_dependencies(content: &str) -> Vec<String> {
    let mut packages = Vec::new();
    let mut in_project_deps = false;
    let mut in_poetry_deps = false;

    for line in content.lines() {
        let trimmed = line.trim();

        if trimmed.starts_with('[') && trimmed.ends_with(']') {
            in_project_deps = trimmed == "[project]";
            in_poetry_deps = trimmed == "[tool.poetry.dependencies]";
            continue;
        }

        if in_project_deps && trimmed.starts_with("dependencies") && trimmed.contains('[') {
            if let Some((_, right)) = trimmed.split_once('[') {
                let list = right.trim_end_matches(']').trim();
                for token in list.split(',') {
                    let dep = token.trim().trim_matches('"').trim_matches('\'');
                    if let Some(name) = parse_requirement_name(dep) {
                        packages.push(name);
                    }
                }
            }
            continue;
        }

        if in_poetry_deps {
            if trimmed.is_empty() || trimmed.starts_with('#') {
                continue;
            }
            if let Some((name, _)) = trimmed.split_once('=') {
                let name = name.trim();
                if name != "python" && !name.is_empty() {
                    packages.push(name.to_string());
                }
            }
        }
    }

    packages
}
