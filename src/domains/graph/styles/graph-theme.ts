/**
 * Cytoscape graph theme configuration
 * Note: Base styles are defined in useCytoscape.ts
 * This file can be extended for additional theme customization
 */

export const graphColors = {
  bg: {
    primary: '#0a0a0f',
    secondary: '#12121a',
    surface: '#1a1a2e',
  },
  accent: {
    primary: '#e94560',
    secondary: '#533483',
    tertiary: '#0f3460',
  },
  text: {
    primary: '#e0e0e0',
    secondary: '#8888aa',
    muted: '#555577',
  },
  edge: {
    package: '#e94560',
    module: '#533483',
    file: '#8888aa',
    default: '#555577',
  },
} as const;

export const graphSizes = {
  node: {
    package: 60,
    module: 50,
    file: 40,
  },
  font: {
    package: '14px',
    module: '12px',
    file: '10px',
  },
} as const;
