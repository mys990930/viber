export type FileEventKind = 'create' | 'modify' | 'delete' | 'rename';

export interface FileEvent {
  path: string;
  kind: FileEventKind;
  timestamp: number;
}
