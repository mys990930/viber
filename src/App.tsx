import { Layout, Sidebar, SidebarSection } from './domains/shell';
import { ProjectSelector, SettingsPanel } from './domains/project';
import { GraphCanvas } from './domains/graph';
import { GitPanel } from './domains/git';

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
          <div style={{ marginTop: 'auto' }}>
            <SidebarSection title="Git" defaultOpen={true}>
              <GitPanel />
            </SidebarSection>
          </div>
        </Sidebar>
      }
      canvas={<GraphCanvas />}
    />
  );
}

export default App;
