'use client';
import './globals.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const navItems = [
    { label: 'Overview', href: '/' },
    { label: 'GEO Hub', href: '/geo-hub' },
    { label: 'Get Support', href: '/get-support' },
  ];
  return (
    <html lang="en">
      <body>
        {/* NAVBAR */}
        <nav style={{
          background: 'white',
          borderBottom: 'none',
          padding: '14px 40px',
          position: 'sticky',
          top: 0,
          zIndex: 999,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 7, background: '#7C3AED',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 22 22" fill="none">
                <circle cx="9.5" cy="9.5" r="5.5" stroke="white" strokeWidth="1.8" fill="none"/>
                <line x1="13.5" y1="13.5" x2="18" y2="18" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M7 9.5 Q8.5 7 9.5 9.5 Q10.5 12 12 9.5" stroke="white" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.9"/>
              </svg>
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.3px' }}>
              Percepta
            </span>
          </div>
          {/* Nav Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {navItems.map(({ label, href }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href} style={{
                  background: active ? '#EDE9FE' : 'transparent',
                  color: active ? '#7C3AED' : '#6B7280',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.88rem',
                  padding: '8px 48px',
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                  display: 'inline-block',
                }}>
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
