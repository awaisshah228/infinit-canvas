'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/docs/quickstart', label: 'Learn' },
  { href: '/docs/api-reference', label: 'Reference' },
  { href: '/docs/examples/overview', label: 'Examples' },
  { href: '/docs/pro-examples', label: 'Pro Examples', accent: true },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/docs/quickstart" className="navbar-brand">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <rect x="2" y="2" width="28" height="28" rx="6" stroke="currentColor" strokeWidth="2" />
            <rect x="7" y="7" width="8" height="8" rx="2" fill="var(--accent)" />
            <rect x="17" y="7" width="8" height="8" rx="2" fill="var(--accent)" opacity="0.6" />
            <rect x="7" y="17" width="8" height="8" rx="2" fill="var(--accent)" opacity="0.4" />
            <rect x="17" y="17" width="8" height="8" rx="2" fill="var(--accent)" opacity="0.2" />
          </svg>
          <span>Infinite Canvas</span>
        </Link>
        <div className="navbar-links">
          {NAV_LINKS.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`navbar-link${isActive ? ' active' : ''}${link.accent ? ' navbar-link-accent' : ''}`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
        <div className="navbar-right">
          <a
            href="https://github.com/user/react-infinite-canvas"
            target="_blank"
            rel="noopener noreferrer"
            className="navbar-icon"
            aria-label="GitHub"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
        </div>
      </div>
    </nav>
  );
}
