use std::fs;
use std::path::Path;

use crate::shared::error::ViberError;
use crate::shared::types::ViberConfig;

const VIBER_DIR: &str = ".viber";
const CONFIG_FILE: &str = "config.json";

pub fn ensure_project_files(project_root: &Path) -> Result<ViberConfig, ViberError> {
    let viber_dir = project_root.join(VIBER_DIR);
    fs::create_dir_all(&viber_dir).map_err(|source| ViberError::IoWithContext {
        context: format!("failed to create {}", viber_dir.display()),
        source,
    })?;

    let config_path = viber_dir.join(CONFIG_FILE);
    if !config_path.exists() {
        let default_config = ViberConfig::default();
        save_config(project_root, &default_config)?;
        return Ok(default_config);
    }

    load_config(project_root)
}

pub fn load_config(project_root: &Path) -> Result<ViberConfig, ViberError> {
    let config_path = config_path(project_root);

    if !config_path.exists() {
        return Err(ViberError::NotProject {
            path: project_root.display().to_string(),
        });
    }

    let content = fs::read_to_string(&config_path).map_err(|source| ViberError::IoWithContext {
        context: format!("failed to read {}", config_path.display()),
        source,
    })?;

    serde_json::from_str(&content).map_err(|source| ViberError::ConfigParse {
        path: config_path.display().to_string(),
        message: source.to_string(),
    })
}

pub fn save_config(project_root: &Path, config: &ViberConfig) -> Result<(), ViberError> {
    let config_path = config_path(project_root);
    let content = serde_json::to_string_pretty(config).map_err(|e| ViberError::Other(e.to_string()))?;

    fs::write(&config_path, content).map_err(|source| ViberError::IoWithContext {
        context: format!("failed to write {}", config_path.display()),
        source,
    })
}

pub fn config_path(project_root: &Path) -> std::path::PathBuf {
    project_root.join(VIBER_DIR).join(CONFIG_FILE)
}
