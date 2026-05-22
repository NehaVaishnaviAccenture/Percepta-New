'use client';

import React from 'react';

interface TabProps {
  result: any;
  resultComps: any[];
  setActiveParent: (n: number) => void;
  setActiveSub: (n: number) => void;
}

export default function GeoScoreSovTab({ result, resultComps, setActiveParent, setActiveSub }: TabProps) {
  return (
    <div className="sovPlaceholder">Share of Voice analysis coming soon.</div>
  );
}
