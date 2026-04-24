import { ClerkProvider } from '@clerk/nextjs'
import { currentUser } from '@clerk/nextjs/server'
import './globals.css';
import Link from 'next/link';

const navItems = [
  { label: 'Overview', href: '/' },
  { label: 'GEO Hub', href: '/geo-hub' },
  { label: 'Get Support', href: '/get-support' },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();

  return (
    <ClerkProvider>
      <html lang="en">
        <body>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {navItems.map(({ label, href }) => (
                <Link key={href} href={href} style={{
                  color: '#6B7280',
                  borderRadius: 8,
                  fontWeight: 500,
                  fontSize: '0.88rem',
                  padding: '8px 48px',
                  textDecoration: 'none',
                }}>
                  {label}
                </Link>
              ))}
            </div>
          {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                  {user.emailAddresses[0]?.emailAddress}
                </span>
                <a href="/sign-out" style={{
                  fontSize: '0.82rem',
                  color: '#7C3AED',
                  fontWeight: 600,
                  textDecoration: 'none',
                  background: '#EDE9FE',
                  padding: '6px 14px',
                  borderRadius: 8,
                }}>
                  Sign Out
                </a>
              </div>
            )}
          </nav>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
