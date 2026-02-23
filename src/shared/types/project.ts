// BE shared/types.rs ↔ FE 1:1 대응
// serde(rename_all = "camelCase")에 의해 camelCase로 변환됨

export type Language = 'python' | 'typescript' | 'javascript' | 'csharp' | 'dart' | 'rust' | 'go';

export interface ProjectInfo {
  name: string;
  root: string;
  languages: Language[];
}

export interface ViberConfig {
  languages: Language[];
  excludedPaths: string[];
}
