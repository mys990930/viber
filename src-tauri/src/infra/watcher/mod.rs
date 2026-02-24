use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use notify::event::{CreateKind, ModifyKind, RemoveKind};
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};

use crate::shared::error::ViberError;
use crate::shared::event::{EventBus, ViberEvent};
use crate::shared::types::{FileEvent, FileEventKind};

const DEBOUNCE_WINDOW: Duration = Duration::from_millis(100);

pub struct WatcherHandle {
    _watcher: RecommendedWatcher,
}

pub fn start(root: &Path, excluded: &[String], bus: EventBus) -> Result<WatcherHandle, ViberError> {
    let root = root.to_path_buf();
    let state = Arc::new(Mutex::new(WatcherState::new(root.clone(), excluded)));

    let callback_state = Arc::clone(&state);
    let mut watcher = RecommendedWatcher::new(
        move |result: notify::Result<Event>| {
            let Ok(event) = result else {
                return;
            };

            let kind = to_file_event_kind(&event.kind);
            let Some(kind) = kind else {
                return;
            };

            for path in event.paths {
                let Ok(mut state) = callback_state.lock() else {
                    continue;
                };

                if state.should_skip(&path) {
                    continue;
                }

                if !state.should_emit(&path) {
                    continue;
                }

                bus.emit(ViberEvent::FileChanged(FileEvent {
                    path,
                    kind: kind.clone(),
                    timestamp: chrono::Utc::now().timestamp_millis() as u64,
                }));
            }
        },
        Config::default(),
    )
    .map_err(|err| ViberError::Other(format!("watcher init failed: {err}")))?;

    watcher
        .watch(&root, RecursiveMode::Recursive)
        .map_err(|err| ViberError::Other(format!("watcher start failed: {err}")))?;

    Ok(WatcherHandle { _watcher: watcher })
}

pub fn stop(_handle: WatcherHandle) {}

fn to_file_event_kind(kind: &EventKind) -> Option<FileEventKind> {
    match kind {
        EventKind::Create(CreateKind::Any)
        | EventKind::Create(CreateKind::File)
        | EventKind::Create(CreateKind::Folder) => Some(FileEventKind::Create),
        EventKind::Modify(ModifyKind::Any)
        | EventKind::Modify(ModifyKind::Data(_))
        | EventKind::Modify(ModifyKind::Metadata(_))
        | EventKind::Modify(ModifyKind::Other) => Some(FileEventKind::Modify),
        EventKind::Modify(ModifyKind::Name(_)) => Some(FileEventKind::Rename),
        EventKind::Remove(RemoveKind::Any)
        | EventKind::Remove(RemoveKind::File)
        | EventKind::Remove(RemoveKind::Folder)
        | EventKind::Remove(RemoveKind::Other) => Some(FileEventKind::Delete),
        _ => None,
    }
}

struct WatcherState {
    excluded_paths: Vec<PathBuf>,
    last_seen: HashMap<PathBuf, Instant>,
}

impl WatcherState {
    fn new(root: PathBuf, excluded: &[String]) -> Self {
        let excluded_paths = excluded
            .iter()
            .map(|path| {
                let p = PathBuf::from(path);
                if p.is_absolute() { p } else { root.join(p) }
            })
            .collect();

        Self {
            excluded_paths,
            last_seen: HashMap::new(),
        }
    }

    fn should_skip(&self, path: &Path) -> bool {
        if has_component(path, ".git") || has_component(path, "node_modules") {
            return true;
        }

        if has_nested_component(path, ".viber", "backups") {
            return true;
        }

        self.excluded_paths.iter().any(|excluded| path.starts_with(excluded))
    }

    fn should_emit(&mut self, path: &Path) -> bool {
        let now = Instant::now();
        if let Some(last) = self.last_seen.get(path) {
            if now.duration_since(*last) < DEBOUNCE_WINDOW {
                return false;
            }
        }

        self.last_seen.insert(path.to_path_buf(), now);
        true
    }
}

fn has_component(path: &Path, name: &str) -> bool {
    path.components()
        .any(|component| component.as_os_str().to_string_lossy() == name)
}

fn has_nested_component(path: &Path, first: &str, second: &str) -> bool {
    let mut prev_matches = false;
    for component in path.components() {
        let current = component.as_os_str().to_string_lossy();
        if prev_matches && current == second {
            return true;
        }
        prev_matches = current == first;
    }
    false
}
