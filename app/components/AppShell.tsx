'use client';
import React from 'react';
import Link from 'next/link';

const sbIcon = (active = false): React.CSSProperties => ({
  width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: active ? '#A100FF' : 'rgba(255,255,255,0.12)',
  background: active ? 'rgba(161,0,255,0.12)' : 'transparent',
});

interface AppShellProps {
  breadcrumb: string;
  showLiveBadge?: boolean;
  onNewAnalysis?: () => void;
  children: React.ReactNode;
}

export function AppShell({ breadcrumb, showLiveBadge = false, onNewAnalysis, children }: AppShellProps) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0F0F11' }}>
      <style>{`@keyframes d3live{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>

      {/* Sidebar */}
      <aside style={{ width: 52, background: '#0F0F11', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0 16px', flexShrink: 0 }}>
        <Link href="/" style={{ width: 24, height: 24, background: '#A100FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk',sans-serif", fontSize: 11, fontWeight: 700, color: 'white', marginBottom: 8, textDecoration: 'none' }}>P</Link>
        <div title="New Analysis" onClick={onNewAnalysis} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: onNewAnalysis ? 'pointer' : 'default', border: '1px solid rgba(161,0,255,0.35)', color: '#A100FF', background: 'rgba(161,0,255,0.10)', marginBottom: 10, flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/></svg>
        </div>
        <div style={{ width: 28, height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 8 }} />
        <div style={sbIcon()}><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6l6-4 6 4v8H2V6z"/></svg></div>
        <div style={sbIcon(true)}><svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="2" width="5" height="5"/><rect x="9" y="2" width="5" height="5"/><rect x="2" y="9" width="5" height="5"/><rect x="9" y="9" width="5" height="5"/></svg></div>
        <div style={sbIcon()}><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="2,12 6,6 10,9 14,3"/></svg></div>
        <div style={sbIcon()}><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="5" r="2.5"/><path d="M3 14c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5"/></svg></div>
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ width: 28, height: 1, background: 'rgba(255,255,255,0.07)', margin: '6px 0' }} />
          <div style={sbIcon()}><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="6" r="2.5"/><path d="M3 14c0-3 2.5-5 5-5s5 2 5 5"/></svg></div>
          <div style={sbIcon()}><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.5 8H4M7 5.5l-3 2.5 3 2.5"/><path d="M8.5 3h4a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-4"/></svg></div>
        </div>
      </aside>

      {/* Content column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Topbar */}
        <div style={{ height: 44, background: '#0F0F11', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'Inter,sans-serif' }}>
            <span>Percepta GEO</span>
            <span style={{ color: 'rgba(255,255,255,0.12)' }}>/</span>
            <span style={{ color: 'rgba(255,255,255,0.92)', fontWeight: 500 }}>{breadcrumb}</span>
          </div>
          {showLiveBadge && (
            <div style={{ marginLeft: 'auto' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#00D1C7', background: 'rgba(0,209,199,0.08)', border: '1px solid rgba(0,209,199,0.18)', padding: '3px 8px', fontFamily: 'Inter,sans-serif' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00D1C7', display: 'inline-block', animation: 'd3live 2s ease-in-out infinite' }} />
                Live
              </span>
            </div>
          )}
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </div>

      </div>
    </div>
  );
}
