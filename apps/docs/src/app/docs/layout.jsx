import Sidebar from '../../components/Sidebar';

export default function DocsLayout({ children }) {
  return (
    <div className="docs-layout">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
