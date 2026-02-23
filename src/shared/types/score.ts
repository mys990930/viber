export interface HealthScore {
  overall: number;
  metrics: ScoreMetrics;
}

export interface ScoreMetrics {
  singleResponsibility: number;
  dependencyInversion: number;
  circularDependencies: string[][];
  coupling: number;
  cohesion: number;
}
