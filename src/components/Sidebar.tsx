import React from 'react';
import { useGraphStore } from '../store/graphStore';
import { useAuthStore } from '../store/authStore';
import { LogOut, FileText, Plus } from 'lucide-react';
import './Sidebar.css';

export const Sidebar: React.FC = () => {
  const { pages, activePageId, setActivePage, createPage } = useGraphStore();
  const { signOut, user } = useAuthStore();

  const handleCreatePage = async () => {
    const title = prompt('Page Title:');
    if (title) {
      const page = await createPage(title);
      setActivePage(page.id);
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="workspace-name">
          {/* We will use a generic placeholder name for now until user specifies one */}
          Personal Knowledge
        </div>
      </div>
      
      <div className="sidebar-section">
        <div className="sidebar-section-title">Pages</div>
        <div className="sidebar-items">
          {Object.values(pages).map(page => (
            <div 
              key={page.id}
              className={`sidebar-item ${activePageId === page.id ? 'active' : ''}`}
              onClick={() => setActivePage(page.id)}
            >
              <FileText size={16} className="sidebar-icon" />
              <span className="sidebar-item-label">{page.title}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar-actions">
        <button className="sidebar-btn" onClick={handleCreatePage}>
          <Plus size={16} /> New Page
        </button>
      </div>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar">{user?.email?.charAt(0).toUpperCase() || 'U'}</div>
          <span className="username">{user?.email || 'Local User'}</span>
        </div>
        <button className="icon-btn" onClick={signOut} title="Sign Out">
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
};
