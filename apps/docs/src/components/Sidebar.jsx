'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  {
    title: 'Getting Started',
    links: [
      { href: '/docs/quickstart', label: 'Quickstart' },
    ],
  },
  {
    title: 'Adding Nodes',
    links: [
      { href: '/docs/nodes', label: 'Create node objects' },
      { href: '/docs/custom-nodes', label: 'Custom nodes' },
    ],
  },
  {
    title: 'Adding Edges',
    links: [
      { href: '/docs/edges', label: 'Create an edge' },
    ],
  },
  {
    title: 'Canvas Features',
    links: [
      { href: '/docs/controls', label: 'Controls' },
      { href: '/docs/background', label: 'Background' },
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
