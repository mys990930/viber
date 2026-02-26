use std::path::{Path, PathBuf};

use git2::{BranchType, Repository, Signature, Status, StatusOptions};

use crate::shared::error::ViberError;
use crate::shared::event::{EventBus, ViberEvent};
use crate::shared::types::GitStatus;

pub struct GitService {
    bus: EventBus,
}

impl GitService {
    pub fn new(bus: EventBus) -> Self {
        Self { bus }
    }

    pub fn status(&self, repo_root: &Path) -> Result<GitStatus, ViberError> {
        let repo = open_repo(repo_root)?;

        let branch = repo
            .head()
            .ok()
            .and_then(|h| h.shorthand().map(|s| s.to_string()))
            .unwrap_or_else(|| "HEAD".to_string());

        let (ahead, behind) = match repo.head() {
            Ok(head) => {
                if let Ok(upstream) = head.resolve().and_then(|h| h.upstream()) {
                    match (head.target(), upstream.target()) {
                        (Some(local), Some(remote)) => repo.graph_ahead_behind(local, remote).unwrap_or((0, 0)),
                        _ => (0, 0),
                    }
                } else {
                    (0, 0)
                }
            }
            Err(_) => (0, 0),
        };

        let mut opts = StatusOptions::new();
        opts.include_untracked(true)
            .recurse_untracked_dirs(true)
            .include_ignored(false)
            .renames_head_to_index(true)
            .renames_index_to_workdir(true);

        let statuses = repo
            .statuses(Some(&mut opts))
            .map_err(|e| ViberError::GitError { message: e.message().to_string() })?;

        let mut staged = Vec::new();
        let mut modified = Vec::new();
        let mut untracked = Vec::new();

        for entry in statuses.iter() {
            let Some(path) = entry.path() else { continue };
            let s = entry.status();

            if is_staged(s) {
                staged.push(path.to_string());
            }
            if is_modified(s) {
                modified.push(path.to_string());
            }
            if s.contains(Status::WT_NEW) {
                untracked.push(path.to_string());
            }
        }

        Ok(GitStatus {
            branch,
            ahead,
            behind,
            staged,
            modified,
            untracked,
        })
    }

    pub fn stage(&self, repo_root: &Path, paths: Vec<String>) -> Result<GitStatus, ViberError> {
        let repo = open_repo(repo_root)?;
        let mut index = repo
            .index()
            .map_err(|e| ViberError::GitError { message: e.message().to_string() })?;

        if paths.is_empty() {
            index
                .add_all(["*"], git2::IndexAddOption::DEFAULT, None)
                .map_err(|e| ViberError::GitError { message: e.message().to_string() })?;
        } else {
            for path in &paths {
                index
                    .add_path(Path::new(path))
                    .map_err(|e| ViberError::GitError { message: e.message().to_string() })?;
            }
        }

        index
            .write()
            .map_err(|e| ViberError::GitError { message: e.message().to_string() })?;

        let status = self.status(repo_root)?;
        self.bus.emit(ViberEvent::GitStatusChanged(status.clone()));
        Ok(status)
    }

    pub fn unstage(&self, repo_root: &Path, paths: Vec<String>) -> Result<GitStatus, ViberError> {
        let repo = open_repo(repo_root)?;

        if !paths.is_empty() {
            repo.reset_default(None, paths.iter().map(|s| s.as_str()))
                .map_err(|e| ViberError::GitError { message: e.message().to_string() })?;
        }

        let status = self.status(repo_root)?;
        self.bus.emit(ViberEvent::GitStatusChanged(status.clone()));
        Ok(status)
    }

    pub fn commit(&self, repo_root: &Path, message: &str) -> Result<String, ViberError> {
        let repo = open_repo(repo_root)?;

        let sig = repo
            .signature()
            .or_else(|_| Signature::now("viber", "viber@example.com"))
            .map_err(|e| ViberError::GitError { message: e.message().to_string() })?;

        let mut index = repo
            .index()
            .map_err(|e| ViberError::GitError { message: e.message().to_string() })?;
        let tree_id = index
            .write_tree()
            .map_err(|e| ViberError::GitError { message: e.message().to_string() })?;
        let tree = repo
            .find_tree(tree_id)
            .map_err(|e| ViberError::GitError { message: e.message().to_string() })?;

        let oid = match repo.head() {
            Ok(head) => {
                let parent = head
                    .peel_to_commit()
                    .map_err(|e| ViberError::GitError { message: e.message().to_string() })?;
                repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &[&parent])
                    .map_err(|e| ViberError::GitError { message: e.message().to_string() })?
            }
            Err(_) => repo
                .commit(Some("HEAD"), &sig, &sig, message, &tree, &[])
                .map_err(|e| ViberError::GitError { message: e.message().to_string() })?,
        };

        let status = self.status(repo_root)?;
        self.bus.emit(ViberEvent::GitStatusChanged(status));

        Ok(oid.to_string())
    }

    pub fn branches(&self, repo_root: &Path) -> Result<Vec<String>, ViberError> {
        let repo = open_repo(repo_root)?;
        let mut out = Vec::new();

        let iter = repo
            .branches(Some(BranchType::Local))
            .map_err(|e| ViberError::GitError { message: e.message().to_string() })?;

        for item in iter {
            let (branch, _) = item.map_err(|e| ViberError::GitError { message: e.message().to_string() })?;
            if let Some(name) = branch
                .name()
                .map_err(|e| ViberError::GitError { message: e.message().to_string() })?
            {
                out.push(name.to_string());
            }
        }

        Ok(out)
    }

    pub fn create_branch(&self, repo_root: &Path, name: &str) -> Result<(), ViberError> {
        let repo = open_repo(repo_root)?;
        let head = repo
            .head()
            .map_err(|e| ViberError::GitError { message: e.message().to_string() })?;
        let commit = head
            .peel_to_commit()
            .map_err(|e| ViberError::GitError { message: e.message().to_string() })?;

        repo.branch(name, &commit, false)
            .map_err(|e| ViberError::GitError { message: e.message().to_string() })?;
        Ok(())
    }

    pub fn checkout(&self, repo_root: &Path, name: &str) -> Result<(), ViberError> {
        let repo = open_repo(repo_root)?;
        let reference = format!("refs/heads/{name}");

        repo.set_head(&reference)
            .map_err(|e| ViberError::GitError { message: e.message().to_string() })?;
        repo.checkout_head(None)
            .map_err(|e| ViberError::GitError { message: e.message().to_string() })?;
        Ok(())
    }
}

fn open_repo(repo_root: &Path) -> Result<Repository, ViberError> {
    Repository::discover(repo_root)
        .or_else(|_| Repository::open(repo_root))
        .map_err(|e| ViberError::GitError { message: e.message().to_string() })
}

fn is_staged(status: Status) -> bool {
    status.intersects(
        Status::INDEX_NEW
            | Status::INDEX_MODIFIED
            | Status::INDEX_DELETED
            | Status::INDEX_RENAMED
            | Status::INDEX_TYPECHANGE,
    )
}

fn is_modified(status: Status) -> bool {
    status.intersects(
        Status::WT_MODIFIED | Status::WT_DELETED | Status::WT_RENAMED | Status::WT_TYPECHANGE,
    )
}
