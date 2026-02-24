use std::collections::HashSet;
use std::path::{Path, PathBuf};

use crate::domain::project::config;
use crate::infra::parser::ParserRegistry;
use crate::infra::watcher;
use crate::infra::watcher::WatcherHandle;
use crate::shared::error::ViberError;
use crate::shared::event::{EventBus, ViberEvent};
use crate::shared::types::{PartialConfig, ProjectInfo, RecentProject, ViberConfig};

pub struct ProjectService {
    bus: EventBus,
    current_project: Option<ProjectInfo>,
    recent: Vec<RecentProject>,
    watcher: Option<WatcherHandle>,
}

impl ProjectService {
    pub fn new(bus: EventBus) -> Self {
        Self {
            bus,
            current_project: None,
            recent: Vec::new(),
            watcher: None,
        }
    }

    pub fn validate_path(&self, path: &Path) -> Result<(), ViberError> {
        if !path.exists() {
            return Err(ViberError::ProjectPathNotFound {
                path: path.display().to_string(),
            });
        }

        if !path.is_dir() {
            return Err(ViberError::ProjectPathNotDirectory {
                path: path.display().to_string(),
            });
        }

        Ok(())
    }

    pub fn open(&mut self, path: &Path, parser_registry: &ParserRegistry) -> Result<ProjectInfo, ViberError> {
        self.validate_path(path)?;

        let root = canonicalize_or_owned(path);
        let mut config = config::ensure_project_files(&root)?;

        if config.languages.is_empty() {
            config.languages = detect_project_languages(&root, parser_registry, &config.excluded_paths);
            config::save_config(&root, &config)?;
        }

        let excluded_paths = config.excluded_paths.clone();

        let info = ProjectInfo {
            name: root
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| root.display().to_string()),
            root: root.clone(),
            languages: config.languages.clone(),
            config,
        };

        if let Some(existing) = self.watcher.take() {
            watcher::stop(existing);
        }

        let watcher = watcher::start(&root, &excluded_paths, self.bus.clone())?;

        self.current_project = Some(info.clone());
        self.watcher = Some(watcher);
        self.update_recent(&info);
        self.bus.emit(ViberEvent::ProjectOpened(info.clone()));

        Ok(info)
    }

    pub fn close(&mut self) -> Result<(), ViberError> {
        if let Some(handle) = self.watcher.take() {
            watcher::stop(handle);
        }

        self.current_project = None;
        self.bus.emit(ViberEvent::ProjectClosed);
        Ok(())
    }

    pub fn get_config(&self) -> Result<ViberConfig, ViberError> {
        let project = self
            .current_project
            .as_ref()
            .ok_or(ViberError::ProjectNotOpen)?;

        config::load_config(&project.root)
    }

    pub fn update_config(&mut self, patch: PartialConfig) -> Result<ViberConfig, ViberError> {
        let project = self
            .current_project
            .as_mut()
            .ok_or(ViberError::ProjectNotOpen)?;

        let mut merged = config::load_config(&project.root)?;
        merged.apply_patch(patch);

        config::save_config(&project.root, &merged)?;

        project.languages = merged.languages.clone();
        project.config = merged.clone();

        self.bus.emit(ViberEvent::ConfigChanged(merged.clone()));

        Ok(merged)
    }

    pub fn recent_projects(&self) -> Vec<RecentProject> {
        self.recent.clone()
    }

    pub fn current_root(&self) -> Option<PathBuf> {
        self.current_project.as_ref().map(|project| project.root.clone())
    }

    fn update_recent(&mut self, info: &ProjectInfo) {
        let root = info.root.to_string_lossy().to_string();
        self.recent.retain(|p| p.root != root);
        self.recent.insert(
            0,
            RecentProject {
                name: info.name.clone(),
                root,
            },
        );
    }
}

fn canonicalize_or_owned(path: &Path) -> PathBuf {
    std::fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf())
}

fn detect_project_languages(
    root: &Path,
    parser_registry: &ParserRegistry,
    excluded_paths: &[String],
) -> Vec<crate::shared::types::Language> {
    let mut detected = HashSet::new();
    let mut stack = vec![root.to_path_buf()];

    while let Some(dir) = stack.pop() {
        let entries = match std::fs::read_dir(&dir) {
            Ok(entries) => entries,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let path = entry.path();

            if is_excluded_path(root, &path, excluded_paths) {
                continue;
            }

            if path.is_dir() {
                stack.push(path);
                continue;
            }

            if let Some(language) = parser_registry.detect_language(&path) {
                detected.insert(language);
            }
        }
    }

    let mut languages = detected.into_iter().collect::<Vec<_>>();
    languages.sort_by_key(language_sort_key);
    languages
}

fn is_excluded_path(root: &Path, path: &Path, excluded_paths: &[String]) -> bool {
    if path.components().any(|c| c.as_os_str() == ".git") {
        return true;
    }
    if path.components().any(|c| c.as_os_str() == "node_modules") {
        return true;
    }
    if path.components().any(|c| c.as_os_str() == "target") {
        return true;
    }

    if path.starts_with(root.join(".viber").join("backups")) {
        return true;
    }

    excluded_paths.iter().any(|excluded| {
        let trimmed = excluded.trim();
        if trimmed.is_empty() {
            return false;
        }

        let absolute = root.join(trimmed);
        path.starts_with(absolute)
    })
}

fn language_sort_key(language: &crate::shared::types::Language) -> u8 {
    match language {
        crate::shared::types::Language::Python => 0,
        crate::shared::types::Language::TypeScript => 1,
        crate::shared::types::Language::JavaScript => 2,
        crate::shared::types::Language::CSharp => 3,
        crate::shared::types::Language::Dart => 4,
        crate::shared::types::Language::Rust => 5,
        crate::shared::types::Language::Go => 6,
    }
}
