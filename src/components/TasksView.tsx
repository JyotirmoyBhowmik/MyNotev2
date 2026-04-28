import React, { useMemo } from 'react';
import { useGraphStore } from '../store/graphStore';
import { useUIStore } from '../store/uiStore';
import { CheckCircle2, Circle, Clock, Tag, ChevronRight, Filter } from 'lucide-react';
import './TasksView.css';

export const TasksView: React.FC = () => {
  const { blocks, pages, setActivePage } = useGraphStore();
  const { setTasksOpen } = useUIStore();

  const allTasks = useMemo(() => {
    return Object.values(blocks).filter(b => 
      b.block_type === 'task' || 
      (b.block_type === 'text' && (b.content.includes('- [ ]') || b.content.includes('- [x]')))
    ).map(b => {
      const isCompleted = b.content.includes('[x]');
      const cleanContent = b.content.replace(/- \[[x ]\]\s*/, '');
      const page = pages[b.page_id];
      return {
        id: b.uuid,
        pageId: b.page_id,
        pageTitle: page?.title || 'Unknown Page',
        content: cleanContent,
        completed: isCompleted,
        updatedAt: b.updated_at
      };
    }).sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
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
        <div className="tasks-empty-icon">✓</div>
        <h2>All Caught Up!</h2>
        <p>Your neural task matrix is clear. Add tasks using the task list block in any document.</p>
        <button onClick={() => setTasksOpen(false)} className="tasks-back-btn">Back to Workspace</button>
      </div>
    );
  }

  return (
    <div className="tasks-container">
      <div className="tasks-header">
        <div className="tasks-title-group">
          <h1>Neural Task Matrix</h1>
          <div className="tasks-stats">
            <span>{stats.pending} Pending</span>
            <span className="tasks-sep">•</span>
            <span>{stats.completed} Completed</span>
          </div>
        </div>
        <div className="tasks-header-actions">
          <button className="tasks-filter-btn"><Filter size={14} /> Filter</button>
          <button onClick={() => setTasksOpen(false)} className="tasks-close-btn">Close</button>
        </div>
      </div>

      <div className="tasks-content">
        <div className="tasks-grid">
          {allTasks.map(task => (
            <div 
              key={task.id} 
              className={`task-card ${task.completed ? 'completed' : ''}`}
              onClick={() => {
                setActivePage(task.pageId);
                setTasksOpen(false);
              }}
            >
              <div className="task-card-header">
                {task.completed ? <CheckCircle2 size={16} className="task-icon-done" /> : <Circle size={16} className="task-icon-todo" />}
                <span className="task-page-tag">
                  <Tag size={10} /> {task.pageTitle}
                </span>
              </div>
              <p className="task-text">{task.content}</p>
              <div className="task-footer">
                <span className="task-date">
                  <Clock size={10} /> {new Date(task.updatedAt || 0).toLocaleDateString()}
                </span>
                <ChevronRight size={14} className="task-arrow" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
