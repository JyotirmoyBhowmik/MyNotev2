import React, { useEffect } from 'react';
import { useUIStore } from '../store/uiStore';
import { useGraphStore } from '../store/graphStore';
import { Trash2, Edit3, Star, Copy, ExternalLink, Hash } from 'lucide-react';
import './ContextMenu.css';

export const PageContextMenu: React.FC = () => {
  const { pageContextMenu, setPageContextMenu } = useUIStore();
  const { deletePage, favoritePage, renamePage, pages } = useGraphStore();

  useEffect(() => {
    const close = () => setPageContextMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    return () => window.removeEventListener('click', close);
  }, []);

  if (!pageContextMenu) return null;

  const { x, y, pageId } = pageContextMenu;
  const page = pages[pageId];
  if (!page) return null;

  return (
    <div
      className="context-menu"
      style={{ top: Math.min(y, window.innerHeight - 200), left: Math.min(x, window.innerWidth - 200) }}
      onClick={e => e.stopPropagation()}
    >
      <div className="context-section-label">Page Actions</div>
      
      <button className="context-item" onClick={() => {
        const newTitle = prompt('Rename page:', page.title);
        if (newTitle) renamePage(pageId, newTitle);
        setPageContextMenu(null);
      }}>
        <Edit3 size={12} /> Rename
      </button>

      <button className="context-item" onClick={() => {
        favoritePage(pageId, !page.is_favorite);
        setPageContextMenu(null);
      }}>
        <Star size={12} className={page.is_favorite ? "fill-yellow-400 text-yellow-400" : ""} /> 
        {page.is_favorite ? 'Unfavorite' : 'Favorite'}
      </button>

      <div className="context-divider" />

      <button className="context-item danger" onClick={async () => {
        if (confirm(`Delete "${page.title}"?`)) {
          await deletePage(pageId);
        }
        setPageContextMenu(null);
      }}>
        <Trash2 size={12} /> Delete
      </button>
    </div>
  );
};
