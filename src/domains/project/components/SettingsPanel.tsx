import { useMemo, useState, useEffect } from 'react';
import styles from './SettingsPanel.module.css';
import { useProject } from '../hooks/useProject';
import type { ViberConfig, Language } from '../../../shared/types/project';

const LANGUAGES: Language[] = ['python', 'typescript', 'javascript', 'csharp', 'dart', 'rust', 'go'];

export function SettingsPanel() {
  const { config, updateConfig, isOpen } = useProject();

  const initialConfig = useMemo<ViberConfig | null>(() => config ?? null, [config]);
  const [localConfig, setLocalConfig] = useState<ViberConfig | null>(initialConfig);

  // keep local copy in sync when config changes
  useEffect(() => {
    setLocalConfig(initialConfig);
  }, [initialConfig]);

  if (!isOpen || !localConfig) return null;

  const toggleLanguage = (lang: Language) => {
    const set = new Set(localConfig.languages || []);
    if (set.has(lang)) set.delete(lang);
    else set.add(lang);
    setLocalConfig({ ...localConfig, languages: Array.from(set) });
  };

  const onExcludedChange = (value: string) => {
    // split by lines, trim, remove empty
    const paths = value
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    setLocalConfig({ ...localConfig, excludedPaths: paths });
  };

  const onSave = async () => {
    if (!localConfig) return;
    try {
      await updateConfig(localConfig);
    } catch (e) {
      // swallow - hook should surface errors; keep UI simple
      // eslint-disable-next-line no-console
      console.error('Failed to update config', e);
    }
  };

  return (
    <div className={styles.panel} role="region" aria-label="Project settings">
      <h3 className={styles.title}>Project Settings</h3>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>Languages</div>
        <div className={styles.languages}>
          {LANGUAGES.map((lang) => {
            const active = (localConfig.languages || []).includes(lang);
            return (
              <button
                key={lang}
                type="button"
                className={active ? styles.langTagActive : styles.langTag}
                onClick={() => toggleLanguage(lang)}
                aria-pressed={active}
              >
                {lang}
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>Excluded paths</div>
        <textarea
          className={styles.textarea}
          value={(localConfig.excludedPaths || []).join('\n')}
          onChange={(e) => onExcludedChange(e.target.value)}
          placeholder="One path per line, e.g. node_modules/\nbuild/"
        />
      </section>

      <div className={styles.actions}>
        <button className={styles.saveButton} onClick={onSave}>
          Save
        </button>
      </div>
    </div>
  );
}

export default SettingsPanel;
