import Link from 'next/link';

const PRO_EXAMPLES = [
  {
    slug: 'helper-lines',
    title: 'Helper Lines',
    description: 'Visual guides and snapping for nodes while dragging.',
    icon: '📐',
  },
  {
    slug: 'copy-paste',
    title: 'Copy & Paste',
    description: 'Copy, cut, and paste nodes with keyboard shortcuts.',
    icon: '📋',
  },
  {
    slug: 'undo-redo',
    title: 'Undo & Redo',
    description: 'Snapshot-based undo/redo with Ctrl+Z keyboard support.',
    icon: '↩️',
  },
  {
    slug: 'expand-collapse',
    title: 'Expand / Collapse',
    description: 'Tree structures with expandable and collapsible nodes.',
    icon: '🌳',
  },
  {
    slug: 'shapes',
    title: 'Shapes',
    description: 'Custom shape nodes for flowcharts and diagrams.',
    icon: '🔷',
  },
  {
    slug: 'auto-layout',
    title: 'Auto Layout',
    description: 'Automatic graph layout with dagre, d3, and ELK algorithms.',
    icon: '📊',
  },
  {
    slug: 'force-layout',
    title: 'Force Layout',
    description: 'Physics-based force-directed graph layout with d3-force.',
    icon: '⚡',
  },
  {
    slug: 'editable-edge',
    title: 'Editable Edge',
    description: 'Freely routable edges with draggable control points.',
    icon: '✏️',
  },
];

export default function ProExamplesPage() {
  return (
    <div className="page-content">
      <h1>Pro Examples</h1>
      <p>
        Production-ready examples that demonstrate advanced patterns and techniques
        for building real-world applications with Infinite Canvas.
      </p>

      <div className="pro-examples-grid">
        {PRO_EXAMPLES.map((example) => (
          <Link
            key={example.slug}
            href={`/docs/pro-examples/${example.slug}`}
            className="pro-example-card"
          >
            <div className="pro-example-card-preview">
              {example.icon}
            </div>
            <div className="pro-example-card-body">
              <div className="pro-example-card-title">{example.title}</div>
              <div className="pro-example-card-desc">{example.description}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
