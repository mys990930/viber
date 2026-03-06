export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  modified: string[];
  untracked: string[];
}

export interface BranchInfo {
  name: string;
  current?: boolean;
}

export interface CommitResult {
  hash?: string;
  message?: string;
}
