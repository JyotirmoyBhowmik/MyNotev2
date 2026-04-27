import React, { memo } from 'react';
import { Settings, Info, History, Share2, Tag, Layers } from 'lucide-react';

export const Inspector: React.FC = memo(() => {
  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-6 flex items-center justify-between border-b border-[var(--glass-border)] pb-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">Inspector</h2>
        <Settings size={14} className="text-[var(--text-secondary)]" />
      </div>

      <div className="flex flex-col gap-6">
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--electric-blue)]">
            <Tag size={12} /> Page Metadata
          </h3>
          <div className="rounded-lg border border-[var(--glass-border)] bg-white/5 p-3">
            <p className="text-xs text-[var(--text-secondary)]">No tags defined</p>
          </div>
        </section>

        <section>
          <h3 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--electric-blue)]">
            <Layers size={12} /> Connections
          </h3>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-white/5">
              <span className="text-xs">Backlinks</span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px]">0</span>
            </div>
            <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-white/5">
              <span className="text-xs">Outgoing</span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px]">0</span>
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--electric-blue)]">
            <History size={12} /> Recent Activity
          </h3>
          <div className="text-[10px] text-[var(--text-secondary)] italic">
            Just now: Refactored to v3.15
          </div>
        </section>
      </div>

      <div className="mt-auto flex gap-2 border-t border-[var(--glass-border)] pt-4">
        <button className="flex flex-1 items-center justify-center gap-2 rounded-md bg-white/5 py-2 text-[10px] font-bold transition-colors hover:bg-white/10">
          <Share2 size={12} /> Share
        </button>
        <button className="flex flex-1 items-center justify-center gap-2 rounded-md bg-white/5 py-2 text-[10px] font-bold transition-colors hover:bg-white/10">
          <Info size={12} /> Details
        </button>
      </div>
    </div>
  );
});

Inspector.displayName = 'Inspector';
