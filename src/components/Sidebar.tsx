import React, { useState, useMemo } from 'react';
import { useGraphStore, type Page } from '../store/graphStore';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { useDrag, useDrop } from 'react-dnd';
import { 
  LogOut, FileText, Plus, Star, Calendar, Search, 
  ChevronRight, ChevronDown, Settings, Trash2, 
  Edit3, HelpCircle, FolderPlus 
} from 'lucide-react';
import { cn } from '../lib/utils';
import './Sidebar.css';

interface SidebarProps {
  onOpenAdmin: () => void;
  isAdmin: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenAdmin, isAdmin }) => {
  const { 
    pages, activePageId, setActivePage, createPage, createFolder,
    deletePage, renamePage, createDailyPage, movePage
  } = useGraphStore();
  const { signOut, user, profile } = useAuthStore();
  const { setCommandPaletteOpen } = useUIStore();

  const [expandedSections, setExpandedSections] = useState({ 
    favorites: true, pages: true, journal: true 
  });
  const [expandedPages, setExpandedPages] = useState<Record<string, boolean>>({});
  const [contextPage, setContextPage] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const allPages = Object.values(pages);
  const favoritePages = allPages.filter(p => p.is_favorite);
  const journalPages = allPages.filter(p => p.type === 'journal').sort((a, b) => b.created_at - a.created_at);
  
  // Group pages by parent
  const pageTree = useMemo(() => {
    const tree: Record<string, Page[]> = { root: [] };
    allPages.forEach(p => {
      if (p.type === 'journal') return;
      if (p.parent_page_id) {
        if (!tree[p.parent_page_id]) tree[p.parent_page_id] = [];
        tree[p.parent_page_id].push(p);
      } else {
        tree.root.push(p);
      }
    });
    return tree;
  }, [pages]);

  const toggleSection = (key: keyof typeof expandedSections) =>
    setExpandedSections(s => ({ ...s, [key]: !s[key] }));

  const togglePageExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPages(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNewPage = async (parentId: string | null = null) => {
    const title = prompt('Page title:');
    if (title) {
      const page = await createPage(title, 'normal', parentId);
      setActivePage(page.id);
      if (parentId) setExpandedPages(prev => ({ ...prev, [parentId]: true }));
    }
  };

  const handleNewFolder = async (parentId: string | null = null) => {
    const title = prompt('Folder name:');
    if (title) {
      const page = await createFolder(title, parentId);
      setActivePage(page.id);
      if (parentId) setExpandedPages(prev => ({ ...prev, [parentId]: true }));
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

  // Drop target for moving to root
  const [, dropRoot] = useDrop(() => ({
    accept: 'PAGE',
    drop: (item: { id: string }) => movePage(item.id, null),
  }));

  const PageItem = ({ page, depth = 0 }: { page: Page; depth?: number }) => {
    const hasChildren = pageTree[page.id] && pageTree[page.id].length > 0;
    const isExpanded = expandedPages[page.id];

    const [{ isDragging }, drag] = useDrag(() => ({
      type: 'PAGE',
      item: { id: page.id },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }));

    const [{ isOver }, drop] = useDrop(() => ({
      accept: 'PAGE',
      drop: (item: { id: string }, monitor) => {
        if (monitor.didDrop()) return;
        movePage(item.id, page.id);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver({ shallow: true }),
      }),
    }));

    return (
      <div 
        className={cn("page-tree-node", isDragging && "opacity-50")} 
        ref={(node) => { drag(node); drop(node); }}
      >
        <div
          className={cn(
            "sidebar-item", 
            activePageId === page.id && "active",
            isOver && "bg-accent/20"
          )}
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
          onClick={() => setActivePage(page.id)}
          onContextMenu={(e) => { e.preventDefault(); setContextPage(page.id); }}
        >
          <span className="sidebar-item-expander" onClick={(e) => togglePageExpand(page.id, e)}>
            {hasChildren ? (
              isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
            ) : (
              <span className="w-3" />
            )}
          </span>
          <span className="sidebar-item-icon">{page.icon || (page.type === 'folder' ? '📁' : '📄')}</span>
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
              <button onClick={() => handleNewPage(page.id)}>
                <Plus size={12} /> New Page
              </button>
              <button onClick={() => handleNewFolder(page.id)}>
                <FolderPlus size={12} /> New Folder
              </button>
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
        {isExpanded && hasChildren && (
          <div className="page-tree-children">
            {pageTree[page.id].map(child => (
              <PageItem key={child.id} page={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

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
        <button className="sidebar-quick-btn" onClick={() => handleNewPage(null)} title="New Page">
          <Plus size={14} /> Page
        </button>
        <button className="sidebar-quick-btn" onClick={() => handleNewFolder(null)} title="New Folder">
          <FolderPlus size={14} /> Folder
        </button>
        <button className="sidebar-quick-btn" onClick={async () => await createDailyPage()}>
          <Calendar size={14} /> Today
        </button>
      </div>

      <div className="sidebar-scroll" ref={(node) => { dropRoot(node); }}>
        {/* Favorites */}
        {favoritePages.length > 0 && (
          <div className="sidebar-section">
            <div className="sidebar-section-title" onClick={() => toggleSection('favorites')}>
              {expandedSections.favorites ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Star size={12} /> Favorites
            </div>
            {expandedSections.favorites && favoritePages.map(p => (
              <div key={p.id} className="sidebar-item" onClick={() => setActivePage(p.id)}>
                <span className="sidebar-item-icon">{p.icon || '📄'}</span>
                <span className="sidebar-item-label">{p.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Pages (Multi-level Tree with Drag & Drop) */}
        <div className="sidebar-section">
          <div className="sidebar-section-title" onClick={() => toggleSection('pages')}>
            {expandedSections.pages ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <FileText size={12} /> Pages
          </div>
          {expandedSections.pages && pageTree.root.map(p => <PageItem key={p.id} page={p} />)}
          {expandedSections.pages && pageTree.root.length === 0 && (
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
            {expandedSections.journal && journalPages.slice(0, 7).map(p => (
               <div key={p.id} className="sidebar-item" onClick={() => setActivePage(p.id)}>
                <span className="sidebar-item-icon">📅</span>
                <span className="sidebar-item-label">{p.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Features Guide */}
        <div className="sidebar-section">
          <div className="sidebar-section-title text-[10px] uppercase tracking-widest opacity-50 mt-4">
            Help & Info
          </div>
          <button className="sidebar-item text-accent" onClick={() => alert('Features:\n1. Multi-level Folders: Right-click pages to create sub-pages.\n2. Drag & Drop: Drag pages into folders to organize.\n3. Journal: Click "Today" or "Journal" for daily notes.\n4. Strategy: Click "Strategy" for OKR dashboard.\n5. Search: Press Ctrl+K or click the search icon.\n6. Editor Commands: Type "/" in any page for blocks.')}>
            <HelpCircle size={12} /> Features Guide
          </button>
        </div>
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

export default Sidebar;
