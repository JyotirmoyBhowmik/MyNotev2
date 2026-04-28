import React from 'react';
import { useGraphStore } from '../store/graphStore';
import { useUIStore } from '../store/uiStore';
import { Trash2, RotateCcw, XCircle, FileText, Calendar } from 'lucide-react';

export const TrashView: React.FC = () => {
  const { trash, restorePage, permanentlyDeletePage } = useGraphStore();
  const { setTrashOpen } = useUIStore();

  const deletedPages = Object.values(trash.pages);

  return (
    <div className="flex flex-col h-full bg-[var(--obsidian-bg)] p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20">
            <Trash2 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Neural Recycle Bin</h1>
            <p className="text-sm text-[var(--text-secondary)]">Restore or permanently wipe neural data</p>
          </div>
        </div>
        <button 
          onClick={() => setTrashOpen(false)}
          className="px-4 py-2 rounded-lg bg-white/5 border border-[var(--glass-border)] text-xs text-[var(--text-secondary)] hover:text-white transition-all"
        >
          Close Bin
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deletedPages.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center h-64 text-[var(--text-secondary)] opacity-40 italic">
            <Trash2 size={48} className="mb-4 opacity-10" />
            <p>Your recycle bin is empty.</p>
          </div>
        ) : (
          deletedPages.map((page) => (
            <div key={page.id} className="p-5 rounded-2xl border border-[var(--glass-border)] bg-white/5 hover:border-red-500/30 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="text-xl opacity-60">
                    {page.type === 'journal' ? <Calendar size={18} /> : <FileText size={18} />}
                  </div>
                  <span className="font-medium text-[var(--text-primary)] truncate">{page.title}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => restorePage(page.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-[var(--electric-blue)]/10 text-[var(--electric-blue)] text-xs font-bold hover:bg-[var(--electric-blue)]/20 transition-all"
                >
                  <RotateCcw size={14} /> Restore
                </button>
                <button 
                  onClick={() => confirm(`Permanently wipe "${page.title}"?`) && permanentlyDeletePage(page.id)}
                  className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                >
                  <XCircle size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
