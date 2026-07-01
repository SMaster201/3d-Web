import React from 'react';

export default function DetectionHistory() {
  return (
    <div className="glass-panel p-8 rounded-xl h-[calc(100vh-8rem)]">
      <h2 className="text-on-surface font-headline-lg mb-6">Detection History</h2>
      <p className="text-on-surface-variant font-body-md">
        This page will display past anomalies and printer logs.
      </p>
    </div>
  );
}
