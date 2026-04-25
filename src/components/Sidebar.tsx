import React, { useState } from 'react';
import { useGraphStore } from '../store/graphStore';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { LogOut, FileText, Plus, Star, Calendar, Search, ChevronRight, ChevronDown, Settings, Trash2, Edit3, Target } from 'lucide-react';
import { cn } from '../lib/utils';
import './Sidebar.css';

interface SidebarProps {
  onOpenAdmin: () => void;
  isAdmin: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenAdmin, isAdmin }) => {
  const { pages, activePageId, setActivePage, createPage, deletePage, renamePage, createDailyPage } = useGraphStore();
  const { signOut, user, profile } = useAuthStore();
  const { setCommandPaletteOpen, setJournalOpen, setStrategyOpen, strategyOpen, journalOpen } = useUIStore();

  const [expandedSections, setExpandedSections] = useState({ favorites: true, pages: true, journal: true });
  const [contextPage, setContextPage] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const allPages = Object.values(pages);
  const favoritePages = allPages.filter(p => p.is_favorite);
  const journalPages = allPages.filter(p => p.type === 'journal').sort((a, b) => b.created_at - a.created_at);
  const normalPages = allPages.filter(p => p.type === 'normal' && !p.parent_page_id);

  const toggleSection = (key: keyof typeof expandedSections) =>
    setExpandedSections(s => ({ ...s, [key]: !s[key] }));

  const handleNewPage = async () => {
    const title = prompt('Page title:');
    if (title) {
      const page = await createPage(title);
      setActivePage(page.id);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this page and all its blocks?')) {
      await deletePage(id);
    }
    setContextPage(null);
  };

  const handleRename = async (id: string) => {
    if (renameDraft.trim()) await renamePage(id, renameDraft.trim());
    setRenaming(null);
  };

  const PageItem = ({ page }: { page: any }) => (
    <div
      key={page.id}
      className={`sidebar-item ${activePageId === page.id ? 'active' : ''}`}
      onClick={() => setActivePage(page.id)}
      onContextMenu={(e) => { e.preventDefault(); setContextPage(page.id); }}
    >
      <span className="sidebar-item-icon">{page.icon || (page.type === 'journal' ? '📅' : '📄')}</span>
      {renaming === page.id ? (
        <input
          className="sidebar-rename-input"
          value={renameDraft}
          onChange={e => setRenameDraft(e.target.value)}
          onBlur={() => handleRename(page.id)}
          onKeyDown={e => { if (e.key === 'Enter') handleRename(page.id); if (e.key === 'Escape') setRenaming(null); }}
          autoFocus
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <span className="sidebar-item-label">{page.title}</span>
      )}
      {contextPage === page.id && (
        <div className="sidebar-context-menu" onClick={e => e.stopPropagation()}>
          <button onClick={() => { setRenaming(page.id); setRenameDraft(page.title); setContextPage(null); }}>
            <Edit3 size={12} /> Rename
          </button>
          <button onClick={() => handleDelete(page.id)} className="danger">
            <Trash2 size={12} /> Delete
          </button>
          <button onClick={() => setContextPage(null)}>Cancel</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="sidebar" onClick={() => setContextPage(null)}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="workspace-name">
          <span className="workspace-icon">🧠</span>
          <span>MyNote</span>
        </div>
        <button className="sidebar-icon-btn" onClick={() => setCommandPaletteOpen(true)} title="Search (Ctrl+K)">
          <Search size={15} />
        </button>
      </div>

      {/* Quick Actions */}
      <div className="sidebar-quick">
        <button className="sidebar-quick-btn" onClick={handleNewPage}>
          <Plus size={14} /> New
        </button>
        <button className="sidebar-quick-btn" onClick={async () => await createDailyPage()}>
          <Calendar size={14} /> Today
        </button>
        <button className={cn("sidebar-quick-btn", journalOpen && "active")} onClick={() => { setJournalOpen(!journalOpen); setStrategyOpen(false); }}>
          <Calendar size={14} /> Journal
        </button>
        <button className={cn("sidebar-quick-btn", strategyOpen && "active")} onClick={() => { setStrategyOpen(!strategyOpen); setJournalOpen(false); }}>
          <Target size={14} /> Strategy
        </button>
      </div>

      <div className="sidebar-scroll">
        {/* Favorites */}
        {favoritePages.length > 0 && (
          <div className="sidebar-section">
            <div className="sidebar-section-title" onClick={() => toggleSection('favorites')}>
              {expandedSections.favorites ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Star size={12} /> Favorites
            </div>
            {expandedSections.favorites && favoritePages.map(p => <PageItem key={p.id} page={p} />)}
          </div>
        )}

        {/* Pages */}
        <div className="sidebar-section">
          <div className="sidebar-section-title" onClick={() => toggleSection('pages')}>
            {expandedSections.pages ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <FileText size={12} /> Pages
          </div>
          {expandedSections.pages && normalPages.map(p => <PageItem key={p.id} page={p} />)}
          {expandedSections.pages && normalPages.length === 0 && (
            <div className="sidebar-empty">No pages yet</div>
          )}
        </div>

        {/* Journal */}
        {journalPages.length > 0 && (
          <div className="sidebar-section">
            <div className="sidebar-section-title" onClick={() => toggleSection('journal')}>
              {expandedSections.journal ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Calendar size={12} /> Journal
            </div>
            {expandedSections.journal && journalPages.slice(0, 7).map(p => <PageItem key={p.id} page={p} />)}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        {isAdmin && (
          <button className="sidebar-admin-btn" onClick={onOpenAdmin}>
            <Settings size={14} /> Admin Panel
          </button>
        )}
        <div className="sidebar-user">
          <div className="avatar">{user?.email?.charAt(0).toUpperCase() || 'U'}</div>
          <div className="user-info">
            <span className="user-email">{user?.email}</span>
            <span className="user-role">{profile?.role}</span>
          </div>
          <button className="sidebar-icon-btn" onClick={signOut} title="Sign Out">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
