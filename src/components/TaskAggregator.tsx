import React, { useMemo } from 'react';
import { useGraphStore } from '../store/graphStore';
import { useUIStore } from '../store/uiStore';
import { CheckCircle2, Circle, Clock, ArrowRight, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';

export const TaskAggregator: React.FC = () => {
  const { blocks, pages, setActivePage } = useGraphStore();
  const { setTasksOpen } = useUIStore();

  // Aggregate all tasks (Kanban items and checklist items)
  const allTasks = useMemo(() => {
    const tasks: any[] = [];
    if (!blocks || !pages) return tasks;
    
    Object.values(blocks).forEach(block => {
      if (block.deleted_at) return;
      
      const page = pages[block.page_id];
      if (!page || page.deleted_at) return;

      // 1. Kanban items (Inside Kanban pages)
      if (page.type === 'kanban') {
        tasks.push({
          id: block.uuid,
          content: block.content,
          pageId: page.id,
          pageTitle: page.title,
          type: 'kanban',
          status: block.properties?.status || 'todo',
          priority: block.properties?.priority || 'med',
          updatedAt: block.updated_at
        });
      }
      
      // 2. Checklist items (Parsed from HTML content)
      // Note: This is a simple regex check, for production we might want a proper HTML parser
      if (block.content.includes('data-type="taskList"')) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(block.content, 'text/html');
        const items = doc.querySelectorAll('li[data-type="taskItem"]');
        
        items.forEach((item, index) => {
          const isDone = item.getAttribute('data-checked') === 'true';
          const text = item.textContent?.trim() || 'Untitled Task';
          
          tasks.push({
            id: `${block.uuid}-task-${index}`,
            blockId: block.uuid,
            content: text,
            pageId: page.id,
            pageTitle: page.title,
            type: 'checklist',
            isDone,
            updatedAt: block.updated_at
          });
        });
      }
    });

    return tasks.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [blocks, pages]);

  const stats = useMemo(() => {
    const total = allTasks.length;
    const completed = allTasks.filter(t => t.isDone || t.status === 'done').length;
    return { total, completed, pending: total - completed };
  }, [allTasks]);

  return (
    <div className="flex flex-col h-full bg-[var(--obsidian-bg)] border-l border-[var(--glass-border)] animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-6 border-b border-[var(--glass-border)] glass-blur">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--electric-blue)]/20 text-[var(--electric-blue)]">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Neural Task Matrix</h2>
              <p className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)] font-medium">Aggregated across {Object.keys(pages).length} nodes</p>
            </div>
          </div>
          <button 
            onClick={() => setTasksOpen(false)}
            className="text-[var(--text-secondary)] hover:text-white transition-colors"
          >
            <ArrowRight size={20} />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-white/5 border border-[var(--glass-border)]">
            <div className="text-xl font-bold text-[var(--text-primary)]">{stats.total}</div>
            <div className="text-[9px] uppercase text-[var(--text-secondary)]">Total</div>
          </div>
          <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
            <div className="text-xl font-bold text-green-400">{stats.completed}</div>
            <div className="text-[9px] uppercase text-green-500/70">Done</div>
          </div>
          <div className="p-3 rounded-xl bg-[var(--electric-blue)]/10 border border-[var(--electric-blue)]/20">
            <div className="text-xl font-bold text-[var(--electric-blue)]">{stats.pending}</div>
            <div className="text-[9px] uppercase text-[var(--electric-blue)]/70">Pending</div>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {allTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center opacity-40 italic">
            <Clock size={48} className="mb-4 opacity-20" />
            <p className="text-sm">No neural tasks detected.</p>
            <p className="text-xs mt-1">Add a Kanban board or Checklist to begin.</p>
          </div>
        ) : (
          allTasks.map((task) => (
            <div 
              key={task.id}
              className="group p-4 rounded-xl border border-[var(--glass-border)] bg-white/5 hover:bg-white/[0.08] hover:border-[var(--electric-blue)]/30 transition-all cursor-pointer"
              onClick={() => setActivePage(task.pageId)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {task.isDone || task.status === 'done' ? (
                    <CheckCircle2 size={16} className="text-green-400" />
                  ) : (
                    <Circle size={16} className="text-[var(--text-secondary)] group-hover:text-[var(--electric-blue)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "text-sm font-medium truncate mb-1",
                    (task.isDone || task.status === 'done') ? "text-[var(--text-secondary)] line-through" : "text-[var(--text-primary)]"
                  )}>
                    {task.content}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--electric-blue)] flex items-center gap-1 font-bold uppercase tracking-tight">
                      <ExternalLink size={10} /> {task.pageTitle}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)] opacity-50">•</span>
                    <span className="text-[10px] text-[var(--text-secondary)] opacity-50 uppercase">{task.type}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
