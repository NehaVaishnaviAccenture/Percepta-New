'use client';

import React from 'react';

interface TabProps {
  result: any;
  resultComps: any[];
  setActiveParent: (n: number) => void;
  setActiveSub: (n: number) => void;
}

export default function GeoScoreProminenceTab({ result, resultComps, setActiveParent, setActiveSub }: TabProps) {
  return (
    <div className="promPlaceholder">Prominence analysis coming soon.</div>
  );
}
