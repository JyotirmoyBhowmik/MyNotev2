import React, { useMemo } from 'react';
import { useGraphStore } from '../store/graphStore';
import { useUIStore } from '../store/uiStore';
import { CheckCircle2, Circle, Clock, Tag, ChevronRight, Filter, Search, Calendar } from 'lucide-react';
import './TasksView.css';

export const TasksView: React.FC = () => {
  const { blocks, pages, setActivePage } = useGraphStore();
  const { setTasksOpen } = useUIStore();

  const allTasks = useMemo(() => {
    const tasks: any[] = [];
    if (!blocks || !pages) return tasks;
    
    Object.values(blocks).forEach(block => {
      if (block.deleted_at) return;
      const page = pages[block.page_id];
      if (!page || page.deleted_at) return;

      // 1. Kanban items
      if (page.type === 'kanban') {
        tasks.push({
          id: block.uuid,
          content: block.content,
          pageId: page.id,
          pageTitle: page.title,
          type: 'kanban',
          status: block.properties?.status || 'todo',
          completed: block.properties?.status === 'done',
          updatedAt: block.updated_at
        });
      }
      
      // 2. Checklist items (Markdown format)
      if (block.content.includes('- [ ]') || block.content.includes('- [x]')) {
        const isCompleted = block.content.includes('[x]');
        const cleanContent = block.content.replace(/- \[[x ]\]\s*/, '');
        tasks.push({
          id: block.uuid,
          content: cleanContent,
          pageId: page.id,
          pageTitle: page.title,
          type: 'checklist',
          completed: isCompleted,
          updatedAt: block.updated_at
        });
      }
    });

    return tasks.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [blocks, pages]);

  const stats = useMemo(() => {
    const total = allTasks.length;
    const completed = allTasks.filter(t => t.completed).length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [allTasks]);

  if (allTasks.length === 0) {
    return (
      <div className="tasks-empty-state">
        <div className="tasks-empty-icon">🧠</div>
        <h2>Neural Matrix Clear</h2>
        <p>No pending tasks found across your neural nodes. Use <code>- [ ]</code> in any document to create one.</p>
        <button onClick={() => setTasksOpen(false)} className="tasks-back-btn">Return to Workspace</button>
      </div>
    );
  }

  return (
    <div className="tasks-container">
      <div className="tasks-header-wrapper">
        <div className="tasks-header-content">
          <div className="tasks-title-group">
            <div className="tasks-icon-bg">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h1>Neural Task Matrix</h1>
              <div className="tasks-meta-stats">
                <span className="pending">{stats.pending} Pending</span>
                <span className="sep">•</span>
                <span className="done">{stats.completed} Done</span>
                <span className="sep">•</span>
                <span className="total">{stats.total} Total Nodes</span>
              </div>
            </div>
          </div>
          
          <div className="tasks-actions">
            <div className="tasks-search-bar">
              <Search size={14} />
              <input type="text" placeholder="Search tasks..." />
            </div>
            <button onClick={() => setTasksOpen(false)} className="tasks-close-btn">
              Back to Editor
            </button>
          </div>
        </div>
      </div>

      <div className="tasks-main-content custom-scrollbar">
        <div className="tasks-grid-layout">
          {allTasks.map(task => (
            <div 
              key={task.id} 
              className={`task-card-v2 ${task.completed ? 'is-completed' : ''}`}
              onClick={() => {
                setActivePage(task.pageId);
                setTasksOpen(false);
              }}
            >
              <div className="task-card-top">
                <div className="task-status-indicator">
                  {task.completed ? <CheckCircle2 size={18} className="icon-done" /> : <Circle size={18} className="icon-todo" />}
                </div>
                <div className="task-body">
                  <p className="task-content-text">{task.content}</p>
                  <div className="task-tags">
                    <span className="task-page-link">
                      <Tag size={10} /> {task.pageTitle}
                    </span>
                    <span className={`task-type-badge ${task.type}`}>
                      {task.type}
                    </span>
                  </div>
                </div>
              </div>
              <div className="task-card-footer">
                <span className="task-timestamp">
                  <Calendar size={10} /> {new Date(task.updatedAt).toLocaleDateString()}
                </span>
                <ChevronRight size={14} className="task-go-icon" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
