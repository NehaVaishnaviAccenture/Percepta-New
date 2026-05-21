'use client';

import React from 'react';

interface TabProps {
  result: any;
  resultComps: any[];
  setActiveParent: (n: number) => void;
  setActiveSub: (n: number) => void;
}

export default function TrendsTab({ result, resultComps, setActiveParent, setActiveSub }: TabProps) {
  return (
    <div style={{padding:'40px 0',textAlign:'center' as const,color:'#9CA3AF',fontSize:'0.85rem'}}>Trends analysis available after your second run.</div>
  );
}
