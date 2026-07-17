'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  onNewAnalysis?: () => void;
  breadcrumb?: { section?: string; label?: string };
}

const LogoSvg = () => (
  <svg width="14" height="14" viewBox="0 0 22 22" fill="none">
    <circle cx="9.5" cy="9.5" r="5.5" stroke="white" strokeWidth="1.8" fill="none"/>
    <line x1="13.5" y1="13.5" x2="18" y2="18" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M7 9.5 Q8.5 7 9.5 9.5 Q10.5 12 12 9.5" stroke="white" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.9"/>
  </svg>
);

export default function Sidebar({ onNewAnalysis, breadcrumb }: SidebarProps) {
  const router = useRouter();
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const expanded = pinned || hovered;

  function handleNewAnalysis(close?: () => void) {
    if (onNewAnalysis) onNewAnalysis();
    close?.();
    router.push('/geo-hub');
  }

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        id="percepta-sidebar"
        className={`sidebar${expanded ? ' sidebar--expanded' : ''}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="sidebarHeader">
          <Link href="/" className="sidebarLogo">
            <div className="sidebarLogoIcon"><LogoSvg/></div>
            <span className="sidebarLogoName">Percepta</span>
          </Link>
          <button
            className="sidebarPinBtn"
            onClick={() => setPinned(p => !p)}
            title={pinned ? 'Collapse sidebar' : 'Pin sidebar open'}
          >
            {pinned
              ? <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="10,3 5,8 10,13"/></svg>
              : <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="6,3 11,8 6,13"/></svg>
            }
          </button>
        </div>

        <button className="sidebarNewBtn" onClick={() => handleNewAnalysis()}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}>
            <line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/>
          </svg>
          <span className="sidebarBtnLabel">New Analysis</span>
        </button>

        <div className="sidebarDivider"/>

        <Link href="/" className="sidebarNavItem">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{flexShrink:0}}><path d="M2 6l6-4 6 4v8H2V6z"/></svg>
          <span className="sidebarNavLabel">Home</span>
        </Link>

        <Link href="/geo-optimization-services" className="sidebarNavItem">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{flexShrink:0}}><circle cx="8" cy="8" r="6"/><path d="M6.5 6.5a1.5 1.5 0 0 1 3 .5c0 1-1.5 1.5-1.5 2.5"/><circle cx="8" cy="12" r=".6" fill="currentColor" stroke="none"/></svg>
          <span className="sidebarNavLabel">Optimization Services</span>
        </Link>

        <div className="sidebarBottom">
          <div className="sidebarDivider" style={{margin:'6px 0'}}/>
          <Link href="/sign-out" className="sidebarLogoutBtn">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{flexShrink:0}}><path d="M10.5 8H4M7 5.5l-3 2.5 3 2.5"/><path d="M8.5 3h4a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-4"/></svg>
            <span className="sidebarBtnLabel">Log out</span>
          </Link>
        </div>
      </aside>

      {/* ── Mobile topbar ── */}
      <div className="mobileTopbar">
        <div className="mobileTopbarLeft">
          <Link href="/" className="mobileTopbarLogo">
            <div className="sidebarLogoIcon"><LogoSvg/></div>
          </Link>
          <span className="mobileTopbarPath">
            <span className="mobileTopbarBrand">Percepta</span>
            {breadcrumb?.section && (
              <><span className="mobileTopbarSep">/</span><span className="mobileTopbarSection">{breadcrumb.section}</span></>
            )}
            {breadcrumb?.label && (
              <><span className="mobileTopbarSep">/</span><span className="mobileTopbarLabel">{breadcrumb.label}</span></>
            )}
          </span>
        </div>
        <button className="mobileHamburger" onClick={() => setDrawerOpen(true)} aria-label="Open navigation">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="3" y1="6" x2="17" y2="6"/>
            <line x1="3" y1="10" x2="17" y2="10"/>
            <line x1="3" y1="14" x2="17" y2="14"/>
          </svg>
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      <>
        <div className={`mobileDrawerDim${drawerOpen ? ' mobileDrawerDim--open' : ''}`} onClick={() => setDrawerOpen(false)}/>
        <div className={`mobileDrawer${drawerOpen ? ' mobileDrawer--open' : ''}`}>
          <div className="mobileDrawerHeader">
              <Link href="/" className="sidebarLogo" onClick={() => setDrawerOpen(false)}>
                <div className="sidebarLogoIcon"><LogoSvg/></div>
                <span className="sidebarLogoName">Percepta</span>
              </Link>
              <button className="mobileDrawerClose" onClick={() => setDrawerOpen(false)} aria-label="Close navigation">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/>
                </svg>
              </button>
            </div>

            <button className="sidebarNewBtn" style={{margin:'0 12px 12px'}} onClick={() => handleNewAnalysis(() => setDrawerOpen(false))}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}>
                <line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/>
              </svg>
              New Analysis
            </button>

            <div className="sidebarDivider"/>

            <Link href="/" className="sidebarNavItem" style={{padding:'0 14px'}} onClick={() => setDrawerOpen(false)}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{flexShrink:0}}><path d="M2 6l6-4 6 4v8H2V6z"/></svg>
              Home
            </Link>

            <Link href="/geo-optimization-services" className="sidebarNavItem" style={{padding:'0 14px'}} onClick={() => setDrawerOpen(false)}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{flexShrink:0}}><circle cx="8" cy="8" r="6"/><path d="M6.5 6.5a1.5 1.5 0 0 1 3 .5c0 1-1.5 1.5-1.5 2.5"/><circle cx="8" cy="12" r=".6" fill="currentColor" stroke="none"/></svg>
              Optimization Services
            </Link>

            <div className="sidebarBottom">
              <div className="sidebarDivider" style={{margin:'6px 0'}}/>
              <Link href="/sign-out" className="sidebarLogoutBtn" style={{margin:'4px 12px 0'}} onClick={() => setDrawerOpen(false)}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{flexShrink:0}}><path d="M10.5 8H4M7 5.5l-3 2.5 3 2.5"/><path d="M8.5 3h4a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-4"/></svg>
                Log out
              </Link>
            </div>
        </div>
      </>
    </>
  );
}
