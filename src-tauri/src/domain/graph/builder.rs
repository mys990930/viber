use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};

use crate::infra::parser::ParserRegistry;
use crate::shared::types::{EdgeKind, GraphEdge, GraphNode, GraphNodeType, Language};

use super::service::GraphData;

pub fn build_graph(root: &Path, parser_registry: &ParserRegistry) -> GraphData {
    let mut nodes = Vec::new();
    let mut edges = Vec::new();

    // ─── 1. 파일 수집 ───
    let mut files = Vec::new();
    collect_files(root, &mut files);

    // ─── 2. 모듈(디렉토리) 노드 생성 ───
    let mut module_ids: HashSet<String> = HashSet::new();

    for file in &files {
        if is_excluded(file) {
            continue;
        }
        let relative = match file.strip_prefix(root) {
            Ok(p) => p,
            Err(_) => continue,
        };
        // 파일의 부모 디렉토리 = 모듈
        if let Some(parent) = relative.parent() {
            if parent.as_os_str().is_empty() {
                // 루트 디렉토리 파일 → 루트 모듈
                module_ids.insert(String::new());
            } else {
                // 중간 경로도 모듈로 등록 (e.g. src/utils/helpers.ts → src, src/utils)
                let mut current = PathBuf::new();
                for component in parent.components() {
                    current.push(component);
                    module_ids.insert(current.to_string_lossy().to_string());
                }
            }
        }
    }

    // 루트 모듈
    let root_module_id = "module:.".to_string();
    nodes.push(GraphNode {
        id: root_module_id.clone(),
        node_type: GraphNodeType::Module,
        label: root
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| ".".to_string()),
        path: Some(PathBuf::from(".")),
        language: None,
    });

    // 서브 모듈 노드
    let mut sorted_modules: Vec<String> = module_ids.iter().filter(|m| !m.is_empty()).cloned().collect();
    sorted_modules.sort();

    for module_path in &sorted_modules {
        let id = format!("module:{module_path}");
        let label = Path::new(module_path)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| module_path.clone());

        nodes.push(GraphNode {
            id: id.clone(),
            node_type: GraphNodeType::Module,
            label,
            path: Some(PathBuf::from(module_path)),
            language: None,
        });

        // 부모 모듈로의 엣지
        let parent_id = if let Some(parent) = Path::new(module_path).parent() {
            if parent.as_os_str().is_empty() {
                root_module_id.clone()
            } else {
                format!("module:{}", parent.display())
            }
        } else {
            root_module_id.clone()
        };

        edges.push(GraphEdge {
            id: format!("module_import:{parent_id}->{id}"),
            source: parent_id,
            target: id,
            kind: EdgeKind::ModuleImport,
        });
    }

    // ─── 3. 파일 노드 + 엣지 ───
    let mut python_node_by_module: HashMap<String, String> = HashMap::new();
    let mut python_files: Vec<PathBuf> = Vec::new();

    for file in &files {
        if is_excluded(file) {
            continue;
        }

        let relative = match file.strip_prefix(root) {
            Ok(path) => path,
            Err(_) => continue,
        };

        let language = parser_registry.detect_language(file);
        let id = format!("file:{}", relative.display());
        let label = relative
            .file_name()
            .map(|name| name.to_string_lossy().to_string())
            .unwrap_or_else(|| relative.display().to_string());

        nodes.push(GraphNode {
            id: id.clone(),
            node_type: GraphNodeType::File,
            label,
            path: Some(relative.to_path_buf()),
            language,
        });

        // 파일 → 소속 모듈 엣지
        let parent_module_id = if let Some(parent) = relative.parent() {
            if parent.as_os_str().is_empty() {
                root_module_id.clone()
            } else {
                format!("module:{}", parent.display())
            }
        } else {
            root_module_id.clone()
        };

        edges.push(GraphEdge {
            id: format!("file_import:{parent_module_id}->{id}"),
            source: parent_module_id,
            target: id.clone(),
            kind: EdgeKind::FileImport,
        });

        if language == Some(Language::Python) {
            python_files.push(relative.to_path_buf());
            for module_name in python_module_names(relative) {
                python_node_by_module.insert(module_name, id.clone());
            }
        }
    }

    // ─── 4. Python import 엣지 ───
    if let Some(parser) = parser_registry.get(Language::Python) {
        for relative in &python_files {
            let source_id = format!("file:{}", relative.display());
            let absolute = root.join(relative);
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

    // ─── 5. 패키지 의존성 ───
    let package_names = parse_package_dependencies(root);
    let mut seen_pkg = HashSet::new();

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
            id: format!("package_dep:{root_module_id}->{pkg_node_id}"),
            source: root_module_id.clone(),
            target: pkg_node_id,
            kind: EdgeKind::PackageDep,
        });
    }

    println!("[BE] build_graph: {} modules, {} files, {} packages, {} edges",
        sorted_modules.len() + 1,
        files.len(),
        seen_pkg.len(),
        edges.len(),
    );

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
        || path.components().any(|c| c.as_os_str() == "__pycache__")
        || path.components().any(|c| c.as_os_str() == ".venv")
        || path.components().any(|c| c.as_os_str() == "venv")
        || path.components().any(|c| c.as_os_str() == ".tox")
        || path.components().any(|c| c.as_os_str() == "dist")
        || path.components().any(|c| c.as_os_str() == "build")
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
