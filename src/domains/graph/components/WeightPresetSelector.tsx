import { useGraphStore } from '../store';
import type { WeightPreset } from '../store';
import styles from './WeightPresetSelector.module.css';

interface WeightPresetSelectorProps {
  onPresetChange?: (preset: WeightPreset) => void;
}

export function WeightPresetSelector({ onPresetChange }: WeightPresetSelectorProps): React.JSX.Element {
  const weightPreset = useGraphStore((s) => s.weightPreset);
  const setWeightPreset = useGraphStore((s) => s.setWeightPreset);

  const buttons: { label: string; value: WeightPreset; description: string }[] = [
    { label: 'Balanced', value: 'balanced', description: 'Bridge-focused' },
    { label: 'Influence', value: 'influence', description: 'High impact modules' },
    { label: 'Dependency', value: 'dependency', description: 'Highly depended modules' },
  ];

  const handlePresetChange = (preset: WeightPreset) => {
    setWeightPreset(preset);
    onPresetChange?.(preset);
  };

  return (
    <div className={styles.container} role="tablist" aria-label="Weight preset selector">
      {buttons.map((b) => (
        <button
          key={b.value}
          className={`${styles.button} ${weightPreset === b.value ? styles.active : ''}`}
          onClick={() => handlePresetChange(b.value)}
          type="button"
          aria-pressed={weightPreset === b.value}
          title={b.description}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
