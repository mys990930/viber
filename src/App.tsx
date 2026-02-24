import { Layout, Sidebar, SidebarSection } from './domains/shell';
import { ProjectSelector, SettingsPanel } from './domains/project';

function App() {
  return (
    <Layout
      sidebar={
        <Sidebar>
          <SidebarSection title="Project" defaultOpen={true}>
            <ProjectSelector />
          </SidebarSection>
          <SidebarSection title="Settings" defaultOpen={true}>
            <SettingsPanel />
          </SidebarSection>
        </Sidebar>
      }
      canvas={
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--text-muted)',
          fontSize: '14px',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <span style={{ fontSize: '48px', opacity: 0.3 }}>⚜️</span>
          <span>Graph canvas will render here</span>
        </div>
      }
    />
  );
}

export default App;
