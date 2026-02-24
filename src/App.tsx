import { Layout, Sidebar, SidebarSection } from './domains/shell';
import { ProjectSelector, SettingsPanel } from './domains/project';
import { GraphCanvas } from './domains/graph';

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
      canvas={<GraphCanvas />}
    />
  );
}

export default App;
