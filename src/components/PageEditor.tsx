import React, { useEffect, useState } from 'react';
import { useGraphStore } from '../store/graphStore';
import { useUIStore } from '../store/uiStore';
import { useLinkStore } from '../store/linkStore';
import { BlockMenu } from './BlockMenu';
import { CommandPalette } from './CommandPalette';
import { ContextMenu } from './ContextMenu';
import { BacklinksPanel } from './BacklinksPanel';
import { JournalView } from './JournalView';
import { BlockNode } from './BlockNode';
import { Edit3, Star, Eye, PanelRight } from 'lucide-react';
import './PageEditor.css';

export const PageEditor: React.FC = () => {
  const { activePageId, pages, addBlock, loadGraph, loading, renamePage, favoritePage, updatePageIcon } = useGraphStore();
  const { setCommandPaletteOpen, rightSidebarOpen, toggleRightSidebar, viewMode, toggleViewMode, journalOpen, setJournalOpen } = useUIStore();
  const { backlinks } = useLinkStore();

  const [init, setInit] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  // Initial load
  useEffect(() => {
    if (!init) {
      loadGraph().then(async () => {
        const state = useGraphStore.getState();
        const pageIds = Object.keys(state.pages);
        if (pageIds.length === 0) {
          const p = await state.createPage('Welcome to MyNote');
          state.setActivePage(p.id);
          await state.addBlock(p.id, null, 0, 'Welcome! Use **bold**, *italic*, `code`, [[links]], and #tags');
          await state.addBlock(p.id, null, 1, 'Type / to insert block types');
          await state.addBlock(p.id, null, 2, 'Press Ctrl+K to open the command palette');
        } else if (!state.activePageId) {
          state.setActivePage(pageIds[0]);
        }
        setInit(true);
      });
    }
  }, [init, loadGraph]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setCommandPaletteOpen(true); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); setCommandPaletteOpen(true); }
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') { e.preventDefault(); toggleRightSidebar(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') { e.preventDefault(); toggleViewMode(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (loading || !init) {
    return (
      <div className="page-loading">
        <div className="page-loading-spinner" />
        <span>Loading your notes...</span>
      </div>
    );
  }

  // Journal view overlay
  if (journalOpen) {
    return <JournalView onClose={() => setJournalOpen(false)} />;
  }

  if (!activePageId) {
    return (
      <div className="page-empty">
        <div className="page-empty-icon">📝</div>
        <p>Select or create a page to get started</p>
      </div>
    );
  }

  const page = pages[activePageId];
  if (!page) return null;

  const pageBacklinks = backlinks[activePageId] || [];

  const handleTitleSave = async () => {
    if (titleDraft.trim() && titleDraft !== page.title) {
      await renamePage(activePageId, titleDraft.trim());
    }
    setEditingTitle(false);
  };

  const handlePageClick = async () => {
    if (page.root_blocks.length === 0) {
      const nb = await addBlock(page.id, null, 0, '');
      setTimeout(() => document.getElementById(`block-${nb.uuid}`)?.focus(), 50);
    }
  };

  return (
    <div className="page-editor-container">
      {/* Main Editor */}
      <div className="page-editor">
        {/* Page header */}
        <div className="page-header">
          {/* Icon */}
          <div className="page-icon" onClick={() => {
            const icon = prompt('Enter an emoji for this page:', page.icon || '📄');
            if (icon !== null) updatePageIcon(page.id, icon);
          }}>
            {page.icon || '📄'}
          </div>

          {/* Title */}
          <div className="page-title-row">
            {editingTitle ? (
              <input
                className="page-title-input"
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={e => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') setEditingTitle(false); }}
                autoFocus
              />
            ) : (
              <h1 className="page-title" onClick={() => { setEditingTitle(true); setTitleDraft(page.title); }}>
                {page.title}
              </h1>
            )}
            <div className="page-actions">
              <button className="page-action-btn" onClick={() => { setEditingTitle(true); setTitleDraft(page.title); }} title="Rename">
                <Edit3 size={14} />
              </button>
              <button className={`page-action-btn ${page.is_favorite ? 'active' : ''}`} onClick={() => favoritePage(page.id, !page.is_favorite)} title={page.is_favorite ? 'Unfavorite' : 'Favorite'}>
                <Star size={14} fill={page.is_favorite ? 'currentColor' : 'none'} />
              </button>
              <button className={`page-action-btn ${viewMode === 'preview' ? 'active' : ''}`} onClick={toggleViewMode} title="Toggle preview (Ctrl+E)">
                <Eye size={14} />
              </button>
              <button className={`page-action-btn ${rightSidebarOpen ? 'active' : ''}`} onClick={toggleRightSidebar} title="Toggle right sidebar (Ctrl+\)">
                <PanelRight size={14} />
              </button>
            </div>
          </div>

          {/* Tags */}
          {page.tags && page.tags.length > 0 && (
            <div className="page-tags">
              {page.tags.map(tag => (
                <span key={tag} className="tag-chip">#{tag}</span>
              ))}
            </div>
          )}

          {/* Metadata row */}
          <div className="page-meta">
            <span className="page-meta-type">{page.type === 'journal' ? '📅 Journal' : '📄 Page'}</span>
            {pageBacklinks.length > 0 && (
              <span className="page-meta-links" onClick={toggleRightSidebar}>
                🔗 {pageBacklinks.length} backlink{pageBacklinks.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Blocks */}
        <div className={`page-content ${viewMode === 'preview' ? 'preview-mode' : ''}`} onClick={handlePageClick}>
          {page.root_blocks.length === 0 ? (
            <div className="empty-page-hint">
              Click here or press Enter to start writing...
              <br />
              <span className="hint-sub">Type <kbd>/</kbd> for block types • <kbd>Ctrl+K</kbd> to search</span>
            </div>
          ) : (
            page.root_blocks.map(blockId => (
              <BlockNode key={blockId} uuid={blockId} onNavigateToPage={(pid) => useGraphStore.getState().setActivePage(pid)} />
            ))
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      {rightSidebarOpen && (
        <div className="right-sidebar">
          <BacklinksPanel pageId={activePageId} />
        </div>
      )}

      {/* Overlays */}
      <BlockMenu />
      <CommandPalette onNavigateToPage={(pid) => useGraphStore.getState().setActivePage(pid)} />
      <ContextMenu />
    </div>
  );
};
