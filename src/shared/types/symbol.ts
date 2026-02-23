export type SymbolKind = 'function' | 'class' | 'variable' | 'type' | 'interface';

export interface Symbol {
  name: string;
  kind: SymbolKind;
  line: number;
}
