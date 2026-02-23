import { Layout } from './domains/shell';
import { Sidebar } from './domains/shell';

function App() {
  return (
    <Layout
      sidebar={<Sidebar />}
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
