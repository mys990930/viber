use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};

use crate::infra::parser::{ParserRegistry, COMMON_EXCLUDED_DIRS};
use crate::shared::types::{EdgeKind, GraphEdge, GraphNode, GraphNodeType, Language};

use super::service::GraphData;

/// Project-level configuration for graph building.
/// Loaded from `.viber/config.toml` if present.
#[derive(Debug, Clone, Default)]
pub struct GraphConfig {
    /// Additional directories to exclude (on top of COMMON_EXCLUDED_DIRS).
    pub exclude_dirs: Vec<String>,
    /// Directories treated as external/infra (shown as packages, not modules).
    pub external_dirs: Vec<String>,
}

impl GraphConfig {
    /// Load from `.viber/config.toml` in the project root.
    /// Returns default if file doesn't exist or can't be parsed.
    pub fn load(root: &Path) -> Self {
        let config_path = root.join(".viber").join("config.toml");
        let content = match std::fs::read_to_string(&config_path) {
            Ok(c) => c,
            Err(_) => return Self::default(),
        };
        Self::parse_toml(&content)
    }

    fn parse_toml(content: &str) -> Self {
        let mut config = Self::default();
        let mut in_graph = false;

        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with('[') {
                in_graph = trimmed == "[graph]";
                continue;
            }
            if !in_graph { continue; }

            if let Some((key, value)) = trimmed.split_once('=') {
                let key = key.trim();
                let value = value.trim();
                match key {
                    "exclude_dirs" => config.exclude_dirs = parse_toml_string_array(value),
                    "external_dirs" => config.external_dirs = parse_toml_string_array(value),
                    _ => {}
                }
            }
        }
        config
    }
}

fn parse_toml_string_array(value: &str) -> Vec<String> {
    let inner = value.trim().trim_start_matches('[').trim_end_matches(']');
    inner.split(',')
        .map(|s| s.trim().trim_matches('"').trim_matches('\'').to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

pub fn build_graph(root: &Path, parser_registry: &ParserRegistry) -> GraphData {
    let config = GraphConfig::load(root);
    build_graph_with_config(root, parser_registry, &config)
}

pub fn build_graph_with_config(
    root: &Path,
    parser_registry: &ParserRegistry,
    config: &GraphConfig,
) -> GraphData {
    let mut nodes = Vec::new();
    let mut edges = Vec::new();

    // Build combined exclude set
    let exclude_set: HashSet<&str> = COMMON_EXCLUDED_DIRS.iter()
        .copied()
        .chain(config.exclude_dirs.iter().map(|s| s.as_str()))
        .collect();
    let external_set: HashSet<&str> = config.external_dirs.iter()
        .map(|s| s.as_str())
        .collect();

    // ─── 1. Collect parseable files only ───
    let mut parseable_files: Vec<(PathBuf, PathBuf, Language)> = Vec::new(); // (absolute, relative, lang)
    collect_parseable_files(root, root, parser_registry, &exclude_set, &external_set, &mut parseable_files);

    // ─── 2. Module (directory) nodes ───
    // Track which directories have direct parseable files
    let mut module_ids: HashSet<String> = HashSet::new();
    let mut modules_with_files: HashSet<String> = HashSet::new();

    for (_, relative, _) in &parseable_files {
        if let Some(parent) = relative.parent() {
            let file_name = relative.file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("");
            // __init__.py alone doesn't make a directory a "real" module
            let is_init_only = file_name == "__init__.py";

            if parent.as_os_str().is_empty() {
                // Root dir
                module_ids.insert(String::new());
                if !is_init_only {
                    modules_with_files.insert(String::new());
                }
            } else {
                // Register all ancestor directories as modules
                let mut current = PathBuf::new();
                for component in parent.components() {
                    current.push(component);
                    let key = current.to_string_lossy().to_string();
                    module_ids.insert(key.clone());
                }
                // Only the direct parent has files (if not just __init__.py)
                if !is_init_only {
                    let direct_parent = parent.to_string_lossy().to_string();
                    modules_with_files.insert(direct_parent);
                }
            }
        }
    }

    // Remove dirs with no parseable files (and no child modules with files)
    let all_module_ids: Vec<String> = module_ids.iter().cloned().collect();
    for m in &all_module_ids {
        if m.is_empty() { continue; }
        if modules_with_files.contains(m) { continue; }
        let has_child_with_files = modules_with_files.iter().any(|child| {
            child.starts_with(m) && child.len() > m.len() && child.as_bytes().get(m.len()) == Some(&b'/')
        });
        if !has_child_with_files {
            module_ids.remove(m);
        }
    }

    // Root module node
    let root_module_id = "module:.".to_string();
    nodes.push(GraphNode {
        id: root_module_id.clone(),
        node_type: GraphNodeType::Group,
        label: root
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| ".".to_string()),
        path: Some(PathBuf::from(".")),
        language: None,
    });

    // Sub-module nodes
    let mut sorted_modules: Vec<String> = module_ids.iter()
        .filter(|m| !m.is_empty())
        .cloned()
        .collect();
    sorted_modules.sort();

    for module_path in &sorted_modules {
        let id = format!("module:{module_path}");
        let label = Path::new(module_path)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| module_path.clone());

        // Group = directory with no direct parseable files (organizational folder)
        let node_type = if modules_with_files.contains(module_path) {
            GraphNodeType::Module
        } else {
            GraphNodeType::Group
        };

        nodes.push(GraphNode {
            id: id.clone(),
            node_type,
            label,
            path: Some(PathBuf::from(module_path)),
            language: None,
        });

        // Contains edge to parent
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
            id: format!("contains:{parent_id}->{id}"),
            source: parent_id,
            target: id,
            kind: EdgeKind::Contains,
        });
    }

    // ─── 3. File nodes ───
    let mut file_node_ids: HashSet<String> = HashSet::new();
    let mut module_name_to_file_id: HashMap<String, String> = HashMap::new();

    for (_, relative, language) in &parseable_files {
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
            language: Some(*language),
        });

        // Contains edge: module → file
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
            id: format!("contains:{parent_module_id}->{id}"),
            source: parent_module_id,
            target: id.clone(),
            kind: EdgeKind::Contains,
        });

        file_node_ids.insert(id.clone());

        // Register module names for import resolution
        match language {
            Language::Python => {
                for name in python_module_names(relative) {
                    module_name_to_file_id.insert(name, id.clone());
                }
            }
            _ => {
                // For non-Python: use relative path without extension as module name
                let path_str = relative.to_string_lossy().replace('\\', "/");
                module_name_to_file_id.insert(path_str.clone(), id.clone());
                if let Some(without_ext) = path_str.rsplit_once('.') {
                    module_name_to_file_id.insert(without_ext.0.to_string(), id.clone());
                }
            }
        }
    }

    // ─── 4. Import edges (file → file) ───
    let mut seen_import_edges: HashSet<String> = HashSet::new();
    let mut module_import_pairs: HashSet<(String, String)> = HashSet::new();

    for (absolute, relative, language) in &parseable_files {
        let source_id = format!("file:{}", relative.display());
        let source_module = get_module_id(relative, &root_module_id);

        let source_content = match std::fs::read_to_string(absolute) {
            Ok(c) => c,
            Err(_) => continue,
        };

        if let Some(parser) = parser_registry.get(*language) {
            let imports = parser.parse_imports(&source_content);
            for import in imports {
                // Try to resolve import to a file node
                let target_id = resolve_import(&import.source, &module_name_to_file_id, relative, *language);
                if let Some(target_id) = target_id {
                    if target_id == source_id { continue; } // skip self-imports

                    let edge_kind = if import.is_side_effect {
                        EdgeKind::SideEffectImport
                    } else {
                        EdgeKind::FileImport
                    };
                    let prefix = if import.is_side_effect { "side_effect" } else { "file_import" };
                    let edge_id = format!("{prefix}:{source_id}->{target_id}");

                    if seen_import_edges.insert(edge_id.clone()) {
                        edges.push(GraphEdge {
                            id: edge_id,
                            source: source_id.clone(),
                            target: target_id.clone(),
                            kind: edge_kind,
                        });

                        // Track module-level import (skip side-effect for module edges)
                        if !import.is_side_effect {
                            let target_relative = target_id.strip_prefix("file:").unwrap_or("");
                            let target_module = get_module_id(
                                Path::new(target_relative),
                                &root_module_id,
                            );
                            if source_module != target_module {
                                module_import_pairs.insert((source_module.clone(), target_module));
                            }
                        }
                    }
                }
            }
        }
    }

    // ─── 5. Module import edges (derived from file imports) ───
    for (source_mod, target_mod) in &module_import_pairs {
        let edge_id = format!("module_import:{source_mod}->{target_mod}");
        edges.push(GraphEdge {
            id: edge_id,
            source: source_mod.clone(),
            target: target_mod.clone(),
            kind: EdgeKind::ModuleImport,
        });
    }

    // ─── 6. Package dependencies (external) ───
    let mut external_packages: Vec<String> = Vec::new();

    // From requirements.txt / pyproject.toml
    external_packages.extend(parse_package_dependencies(root));

    // external_dirs from config → package nodes
    for dir_name in &config.external_dirs {
        // Only add if the directory actually exists and was found as a module
        let dir_module_id = format!("module:{dir_name}");
        if module_ids.contains(dir_name.as_str()) {
            // Remove as module, add as package instead
            nodes.retain(|n| n.id != dir_module_id);
            edges.retain(|e| e.source != dir_module_id && e.target != dir_module_id);
            // Also remove child modules/files of this dir
            let prefix = format!("{dir_name}/");
            let child_ids: Vec<String> = nodes.iter()
                .filter(|n| {
                    n.path.as_ref()
                        .map(|p| p.to_string_lossy().starts_with(&prefix))
                        .unwrap_or(false)
                })
                .map(|n| n.id.clone())
                .collect();
            nodes.retain(|n| !child_ids.contains(&n.id));
            edges.retain(|e| !child_ids.contains(&e.source) && !child_ids.contains(&e.target));

            if !external_packages.contains(dir_name) {
                external_packages.push(dir_name.clone());
            }
        }
    }

    let mut seen_pkg = HashSet::new();
    for package in external_packages {
        if !seen_pkg.insert(package.clone()) { continue; }

        let pkg_node_id = format!("package:{package}");
        nodes.push(GraphNode {
            id: pkg_node_id.clone(),
            node_type: GraphNodeType::Package,
            label: package,
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

    let module_count = sorted_modules.len() + 1;
    let file_count = parseable_files.len();
    let pkg_count = seen_pkg.len();
    println!(
        "[BE] build_graph: {} modules, {} files, {} packages, {} edges ({} module_imports)",
        module_count, file_count, pkg_count, edges.len(), module_import_pairs.len()
    );

    GraphData { nodes, edges }
}

// ─── Helper functions ───

/// Recursively collect parseable files, skipping excluded and external dirs.
fn collect_parseable_files(
    dir: &Path,
    root: &Path,
    registry: &ParserRegistry,
    exclude_set: &HashSet<&str>,
    external_set: &HashSet<&str>,
    out: &mut Vec<(PathBuf, PathBuf, Language)>,
) {
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name();
        let name_str = name.to_string_lossy();

        if path.is_dir() {
            // Skip excluded dirs
            if exclude_set.contains(name_str.as_ref()) { continue; }
            // Skip external dirs (only at top level relative to root)
            if let Ok(rel) = path.strip_prefix(root) {
                if rel.components().count() == 1 && external_set.contains(name_str.as_ref()) {
                    continue;
                }
            }
            collect_parseable_files(&path, root, registry, exclude_set, external_set, out);
        } else {
            // Only include files the parser can handle
            if let Some(lang) = registry.detect_language(&path) {
                if let Ok(relative) = path.strip_prefix(root) {
                    out.push((path.clone(), relative.to_path_buf(), lang));
                }
            }
        }
    }
}

/// Get the module ID for a file's parent directory.
fn get_module_id(relative: &Path, root_module_id: &str) -> String {
    if let Some(parent) = relative.parent() {
        if parent.as_os_str().is_empty() {
            root_module_id.to_string()
        } else {
            format!("module:{}", parent.display())
        }
    } else {
        root_module_id.to_string()
    }
}

/// Try to resolve an import source string to a file node ID.
fn resolve_import(
    import_source: &str,
    module_map: &HashMap<String, String>,
    importer_path: &Path,
    language: Language,
) -> Option<String> {
    // Direct match
    if let Some(id) = module_map.get(import_source) {
        return Some(id.clone());
    }

    match language {
        Language::Python => resolve_python_import(import_source, module_map),
        Language::TypeScript | Language::JavaScript => {
            resolve_ts_import(import_source, module_map, importer_path)
        }
        Language::Rust => resolve_rust_import(import_source, module_map, importer_path),
        Language::CSharp => resolve_csharp_import(import_source, module_map, importer_path),
        Language::Dart => resolve_dart_import(import_source, module_map, importer_path),
        Language::Go => resolve_go_import(import_source, module_map, importer_path),
    }
}

fn resolve_python_import(
    import_source: &str,
    module_map: &HashMap<String, String>,
) -> Option<String> {
    let slash_form = import_source.replace('.', "/");
    if let Some(id) = module_map.get(&slash_form) {
        return Some(id.clone());
    }
    let py_form = format!("{slash_form}.py");
    if let Some(id) = module_map.get(&py_form) {
        return Some(id.clone());
    }
    let init_form = format!("{slash_form}/__init__.py");
    if let Some(id) = module_map.get(&init_form) {
        return Some(id.clone());
    }
    None
}

fn resolve_ts_import(
    import_source: &str,
    module_map: &HashMap<String, String>,
    importer_path: &Path,
) -> Option<String> {
    // Skip external packages (no ./ or ../)
    if !import_source.starts_with('.') {
        return None;
    }

    // Resolve relative path against importer's directory
    let importer_dir = importer_path.parent().unwrap_or(Path::new(""));
    let resolved = normalize_path(&importer_dir.join(import_source));
    let resolved_str = resolved.to_string_lossy().replace('\\', "/");

    // Try exact match, then with extensions
    let candidates = [
        resolved_str.clone(),
        format!("{resolved_str}.ts"),
        format!("{resolved_str}.tsx"),
        format!("{resolved_str}.js"),
        format!("{resolved_str}.jsx"),
        format!("{resolved_str}/index.ts"),
        format!("{resolved_str}/index.tsx"),
        format!("{resolved_str}/index.js"),
    ];

    for candidate in &candidates {
        if let Some(id) = module_map.get(candidate) {
            return Some(id.clone());
        }
    }
    None
}

fn resolve_rust_import(
    import_source: &str,
    module_map: &HashMap<String, String>,
    importer_path: &Path,
) -> Option<String> {
    // crate::domain::graph::builder → src-tauri/src/domain/graph/builder.rs
    // super::builder → resolve relative to importer
    // self::something → same module

    if let Some(rest) = import_source.strip_prefix("crate::") {
        // crate:: → project-relative path
        // Take the first meaningful segments (module path, not the item name)
        let slash_form = rest.replace("::", "/");
        return try_rust_path(&slash_form, module_map);
    }

    if let Some(rest) = import_source.strip_prefix("super::") {
        let importer_dir = importer_path.parent().unwrap_or(Path::new(""));
        let parent = importer_dir.parent().unwrap_or(Path::new(""));
        let slash_form = rest.replace("::", "/");
        let resolved = normalize_path(&parent.join(&slash_form));
        let resolved_str = resolved.to_string_lossy().replace('\\', "/");
        return try_rust_path(&resolved_str, module_map);
    }

    if let Some(rest) = import_source.strip_prefix("self::") {
        let importer_dir = importer_path.parent().unwrap_or(Path::new(""));
        let slash_form = rest.replace("::", "/");
        let resolved = importer_dir.join(&slash_form);
        let resolved_str = resolved.to_string_lossy().replace('\\', "/");
        return try_rust_path(&resolved_str, module_map);
    }

    None
}

/// Try various Rust file patterns: path.rs, path/mod.rs
fn try_rust_path(
    slash_path: &str,
    module_map: &HashMap<String, String>,
) -> Option<String> {
    // Try progressively shorter prefixes (import might include item name)
    let mut path = slash_path.to_string();
    loop {
        let candidates = [
            path.clone(),
            format!("{path}.rs"),
            format!("{path}/mod.rs"),
        ];
        for c in &candidates {
            if let Some(id) = module_map.get(c) {
                return Some(id.clone());
            }
        }
        // Strip last segment (might be an item name, not a file)
        if let Some(pos) = path.rfind('/') {
            path = path[..pos].to_string();
        } else {
            break;
        }
    }
    None
}

/// Normalize a path by resolving `.` and `..` without filesystem access.
fn normalize_path(path: &Path) -> PathBuf {
    let mut components = Vec::new();
    for component in path.components() {
        match component {
            std::path::Component::CurDir => {}
            std::path::Component::ParentDir => { components.pop(); }
            other => components.push(other),
        }
    }
    components.iter().collect()
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

    // Full dotted path: "core.database"
    let module = normalized.trim_end_matches(".py").replace('/', ".");
    if !module.is_empty() {
        names.push(module.clone());
    }

    // Short name: "database" (for `from core import database` style)
    if let Some(last) = module.split('.').last() {
        if !last.is_empty() {
            names.push(last.to_string());
        }
    }

    // Also register the slash form for path-based resolution
    let slash_form = normalized.trim_end_matches(".py").to_string();
    names.push(slash_form);

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
    if name.is_empty() { None } else { Some(name.to_string()) }
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
            if trimmed.is_empty() || trimmed.starts_with('#') { continue; }
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

// ─── C# Import Resolution ───

/// Resolve C# using directive to file node.
/// using MyProject.Services → MyProject/Services/*.cs
fn resolve_csharp_import(
    import_source: &str,
    module_map: &HashMap<String, String>,
    importer_path: &Path,
) -> Option<String> {
    // C# namespaces map to directory structure
    // MyProject.Services → MyProject/Services/
    let path_form = import_source.replace('.', "/");

    // Try to find any file in that namespace directory
    let candidates = generate_csharp_candidates(&path_form);

    // Also check relative to importer's project root
    let importer_dir = importer_path.parent().unwrap_or(Path::new(""));

    for candidate in &candidates {
        // Direct match
        if let Some(id) = module_map.get(candidate) {
            return Some(id.clone());
        }

        // Try relative to importer's directory (same project)
        let relative = normalize_path(&importer_dir.join(candidate));
        let relative_str = relative.to_string_lossy().replace('\\', "/");
        if let Some(id) = module_map.get(&relative_str) {
            return Some(id.clone());
        }

        // Try from project root (walk up to find .csproj or similar)
        if let Some(id) = try_from_project_root(candidate, importer_path, module_map) {
            return Some(id.clone());
        }
    }

    None
}

fn generate_csharp_candidates(namespace_path: &str) -> Vec<String> {
    let mut candidates = Vec::new();

    // Directory itself
    candidates.push(namespace_path.to_string());

    // Common file patterns in that directory
    // We can't know exact file names, so try to match partial paths
    // The module_map should have registered paths like "Services/UserService.cs"
    // So we check if any key starts with the namespace path

    candidates
}

fn try_from_project_root(
    candidate: &str,
    importer_path: &Path,
    module_map: &HashMap<String, String>,
) -> Option<String> {
    // Walk up from importer to find project root (where .csproj exists)
    let mut current = importer_path;
    while let Some(parent) = current.parent() {
        // Check for .csproj file
        if std::fs::read_dir(parent)
            .ok()?
            .filter_map(|e| e.ok())
            .any(|e| e.path().extension().map(|ext| ext == "csproj").unwrap_or(false))
        {
            // Found project root, try candidate from here
            let full_path = normalize_path(&parent.join(candidate));
            let full_str = full_path.to_string_lossy().replace('\\', "/");

            // Check for prefix match in module_map (any file in this namespace)
            for (key, id) in module_map {
                if key.starts_with(&full_str) || key.starts_with(&format!("{}/", full_str)) {
                    return Some(id.clone());
                }
            }
            break;
        }
        current = parent;
    }
    None
}

// ─── Dart Import Resolution ───

/// Resolve Dart import to file node.
/// import 'src/models/user.dart' → relative path
/// import 'package:my_app/src/models/user.dart' → lib/src/models/user.dart
fn resolve_dart_import(
    import_source: &str,
    module_map: &HashMap<String, String>,
    importer_path: &Path,
) -> Option<String> {
    let path_str = if import_source.starts_with("package:") {
        // package:my_app/src/models/user.dart → lib/src/models/user.dart
        // Remove "package:" prefix
        let rest = import_source.strip_prefix("package:")?;
        // Split on first '/' to get package name and path
        let (package_name, path) = rest.split_once('/')?;
        // The path is relative to lib/ directory
        format!("lib/{}", path)
    } else if import_source.starts_with("dart:") {
        // dart:core, dart:async → SDK, skip
        return None;
    } else {
        // Relative import: 'src/models/user.dart' or '../services/api.dart'
        import_source.to_string()
    };

    // Resolve relative path
    let importer_dir = importer_path.parent().unwrap_or(Path::new(""));
    let resolved = normalize_path(&importer_dir.join(&path_str));
    let resolved_str = resolved.to_string_lossy().replace('\\', "/");

    // Try with and without extension
    let candidates = if path_str.ends_with(".dart") {
        vec![resolved_str]
    } else {
        vec![resolved_str.clone(), format!("{}.dart", resolved_str)]
    };

    for candidate in &candidates {
        if let Some(id) = module_map.get(candidate) {
            return Some(id.clone());
        }
    }

    // Also try direct path match (for package imports that might be registered)
    if let Some(id) = module_map.get(&path_str) {
        return Some(id.clone());
    }

    None
}

// ─── Go Import Resolution ───

/// Resolve Go import to file node.
/// import "github.com/user/project/internal/utils" → internal/utils/*.go
fn resolve_go_import(
    import_source: &str,
    module_map: &HashMap<String, String>,
    importer_path: &Path,
) -> Option<String> {
    // External packages (contain domain) are skipped
    // Only resolve internal packages
    // We need to know the module name from go.mod

    // Try to find go.mod and extract module name
    let module_name = find_go_module(importer_path)?;

    // Check if this is an internal package
    if !import_source.starts_with(&module_name) {
        return None; // External package
    }

    // Strip module name prefix to get relative path
    let relative = import_source.strip_prefix(&module_name)?;
    let relative = relative.trim_start_matches('/');

    // Try to find any file in this package directory
    for (key, id) in module_map {
        // key is like "internal/utils/helper.go"
        if key.starts_with(relative) || key.starts_with(&format!("{}/", relative)) {
            return Some(id.clone());
        }
    }

    // Also try direct match
    if let Some(id) = module_map.get(relative) {
        return Some(id.clone());
    }

    None
}

/// Find Go module name from go.mod
fn find_go_module(importer_path: &Path) -> Option<String> {
    let mut current = importer_path;
    loop {
        let go_mod = current.join("go.mod");
        if let Ok(content) = std::fs::read_to_string(&go_mod) {
            // Find module declaration
            for line in content.lines() {
                let trimmed = line.trim();
                if let Some(rest) = trimmed.strip_prefix("module ") {
                    return Some(rest.trim().to_string());
                }
            }
        }
        current = current.parent()?;
    }
}
