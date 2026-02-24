/// 통합 에러 타입
use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum ViberError {
    #[error("Project not open")]
    ProjectNotOpen,

    #[error("File not found: {path}")]
    FileNotFound { path: String },

    #[error("Project path not found: {path}")]
    ProjectPathNotFound { path: String },

    #[error("Project path is not a directory: {path}")]
    ProjectPathNotDirectory { path: String },

    #[error("Not a Viber project: {path}")]
    NotProject { path: String },

    #[error("Config parse error at {path}: {message}")]
    ConfigParse { path: String, message: String },

    #[error("IO error ({context}): {source}")]
    IoWithContext {
        context: String,
        #[source]
        source: std::io::Error,
    },

    #[error("Git error: {message}")]
    GitError { message: String },

    #[error("Parser error: {message}")]
    ParserError { message: String },

    #[error("Scope not found: {id}")]
    ScopeNotFound { id: String },

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("{0}")]
    Other(String),
}

// Tauri command에서 에러를 반환하려면 Serialize 필요
impl Serialize for ViberError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut s = serializer.serialize_struct("ViberError", 3)?;

        let (code, domain) = match self {
            ViberError::ProjectNotOpen => ("PROJECT_NOT_OPEN", "project"),
            ViberError::FileNotFound { .. } => ("FILE_NOT_FOUND", "project"),
            ViberError::ProjectPathNotFound { .. } => ("PROJECT_PATH_NOT_FOUND", "project"),
            ViberError::ProjectPathNotDirectory { .. } => {
                ("PROJECT_PATH_NOT_DIRECTORY", "project")
            }
            ViberError::NotProject { .. } => ("NOT_PROJECT", "project"),
            ViberError::ConfigParse { .. } => ("CONFIG_PARSE_ERROR", "project"),
            ViberError::GitError { .. } => ("GIT_ERROR", "git"),
            ViberError::ParserError { .. } => ("PARSER_ERROR", "parser"),
            ViberError::ScopeNotFound { .. } => ("SCOPE_NOT_FOUND", "guardrail"),
            ViberError::Io(_) => ("IO_ERROR", "system"),
            ViberError::IoWithContext { .. } => ("IO_ERROR", "system"),
            ViberError::Other(_) => ("UNKNOWN", "system"),
        };

        s.serialize_field("code", code)?;
        s.serialize_field("message", &self.to_string())?;
        s.serialize_field("domain", domain)?;
        s.end()
    }
}
