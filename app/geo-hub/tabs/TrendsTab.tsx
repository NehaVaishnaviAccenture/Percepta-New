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
    <div className="trPlaceholder">Trends analysis available after your second run.</div>
  );
}
