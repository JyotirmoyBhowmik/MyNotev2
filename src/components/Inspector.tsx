import React, { memo } from 'react';
import { Settings, Info, History, Share2, Tag, Link } from 'lucide-react';
import { useGraphStore } from '../store/graphStore';
import { BacklinksPanel } from './BacklinksPanel';

export const Inspector: React.FC = memo(() => {
  const activePageId = useGraphStore(s => s.activePageId);
  
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

        <section className="flex-1 overflow-y-auto min-h-0">
          <h3 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[var(--electric-blue)] sticky top-0 bg-[var(--obsidian-surface)] z-10 py-1">
            <Link size={12} /> Linked References
          </h3>
          <div className="rounded-lg border border-[var(--glass-border)] bg-white/5 overflow-hidden">
            <BacklinksPanel pageId={activePageId || ''} />
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
