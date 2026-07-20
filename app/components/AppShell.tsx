'use client';
import React from 'react';
import Sidebar from '../geo-hub/Sidebar';
import '../geo-hub/geo-hub.css';

interface AppShellProps {
  breadcrumb: string;
  children: React.ReactNode;
}

export function AppShell({ breadcrumb, children }: AppShellProps) {
  return (
    <div className="shell">
      <Sidebar breadcrumb={{ section: breadcrumb }} />

      <div className="contentCol">
        <div className="topbar">
          <span className="topbarBreadcrumb">
            Percepta
            <span className="topbarSep"> / </span>
            <span className="topbarBreadcrumbActive">{breadcrumb}</span>
          </span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
