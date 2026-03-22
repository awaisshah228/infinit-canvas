'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  {
    title: 'Getting Started',
    links: [
      { href: '/docs/quickstart', label: 'Quick Start' },
    ],
  },
  {
    title: 'Core Concepts',
    links: [
      { href: '/docs/concepts/overview', label: 'Overview' },
      { href: '/docs/concepts/building-a-flow', label: 'Building a Flow' },
      { href: '/docs/concepts/adding-interactivity', label: 'Adding Interactivity' },
      { href: '/docs/concepts/the-viewport', label: 'The Viewport' },
      { href: '/docs/concepts/built-in-components', label: 'Built-in Components' },
    ],
  },
  {
    title: 'Customization',
    links: [
      { href: '/docs/nodes', label: 'Nodes' },
      { href: '/docs/custom-nodes', label: 'Custom Nodes' },
      { href: '/docs/handles', label: 'Handles' },
      { href: '/docs/edges', label: 'Edges' },
      { href: '/docs/custom-edges', label: 'Custom Edges' },
      { href: '/docs/edge-labels', label: 'Edge Labels' },
      { href: '/docs/theming', label: 'Theming' },
    ],
  },
  {
    title: 'Layouting',
    links: [
      { href: '/docs/sub-flows', label: 'Sub Flows' },
    ],
  },
  {
    title: 'Components',
    links: [
      { href: '/docs/controls', label: 'Controls' },
      { href: '/docs/minimap', label: 'MiniMap' },
      { href: '/docs/background', label: 'Background' },
      { href: '/docs/panel', label: 'Panel' },
      { href: '/docs/node-toolbar', label: 'NodeToolbar' },
      { href: '/docs/node-resizer', label: 'NodeResizer' },
    ],
  },
  {
    title: 'Advanced',
    links: [
      { href: '/docs/hooks', label: 'Hooks' },
      { href: '/docs/utilities', label: 'Utilities' },
    ],
  },
  {
    title: 'Examples',
    links: [
      { href: '/docs/examples/overview', label: 'Feature Overview' },
      { href: '/docs/examples/comprehensive', label: 'Comprehensive' },
      { href: '/docs/examples/drag-and-drop', label: 'Drag and Drop' },
      { href: '/docs/examples/save-restore', label: 'Save & Restore' },
      { href: '/docs/examples/stress-test', label: 'Stress Test' },
    ],
  },
  {
    title: 'Tutorials',
    links: [
      { href: '/docs/tutorials/mindmap', label: 'Mind Map App' },
      { href: '/docs/tutorials/slideshow', label: 'Slideshow App' },
    ],
  },
  {
    title: 'API Reference',
    links: [
      { href: '/docs/api-reference', label: 'InfiniteCanvas' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <Link href="/docs/quickstart" className="sidebar-logo">
        Infinite Canvas
      </Link>
      {NAV.map((section) => (
        <div key={section.title} className="sidebar-section">
          <div className="sidebar-section-title">{section.title}</div>
          {section.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`sidebar-link${pathname === link.href ? ' active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      ))}
    </aside>
  );
}
