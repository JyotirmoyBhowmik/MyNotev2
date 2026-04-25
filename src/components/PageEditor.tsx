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
import { InlineToolbar } from './InlineToolbar';
import { TopBar } from './TopBar';
import { TemplateModal } from './TemplateModal';
import { Edit3, Star, Eye, PanelRight, BookMarked } from 'lucide-react';
import { exportPageToMarkdown, downloadMarkdown } from '../hooks/useExport';
import './PageEditor.css';

export const PageEditor: React.FC = () => {
  const { activePageId, pages, blocks, addBlock, loadGraph, loading, renamePage, favoritePage, updatePageIcon } = useGraphStore();
  const { setCommandPaletteOpen, rightSidebarOpen, toggleRightSidebar, viewMode, toggleViewMode, journalOpen, setJournalOpen } = useUIStore();
  const { backlinks } = useLinkStore();

  const [init, setInit] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [splitView, setSplitView] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    if (!init) {
      loadGraph().then(async () => {
        const state = useGraphStore.getState();
        const pageIds = Object.keys(state.pages);
        if (pageIds.length === 0) {
          const p = await state.createPage('Welcome to MyNote 🧠');
          state.setActivePage(p.id);
          await state.addBlock(p.id, null, 0, 'Welcome! Type **/** to open the block menu', 'text');
          await state.addBlock(p.id, null, 1, 'Press **Ctrl+K** to open the command palette', 'text');
          await state.addBlock(p.id, null, 2, 'Use **[[Page Name]]** to create page links', 'text');
          await state.addBlock(p.id, null, 3, 'Select text to see the formatting toolbar', 'callout');
        } else if (!state.activePageId) {
          state.setActivePage(pageIds[0]);
        }
        setInit(true);
      });
    }
  }, [init, loadGraph]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setCommandPaletteOpen(true); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); setCommandPaletteOpen(true); }
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') { e.preventDefault(); toggleRightSidebar(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') { e.preventDefault(); toggleViewMode(); }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') { e.preventDefault(); setShowTemplates(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleExport = () => {
    if (!activePageId) return;
    const page = pages[activePageId];
    if (!page) return;
    const md = exportPageToMarkdown(page, blocks);
    downloadMarkdown(md, page.title);
  };

  if (loading || !init) {
    return (
      <div className="page-loading">
        <div className="page-loading-spinner" />
        <span>Loading your notes...</span>
      </div>
    );
  }

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

  const EditorPane = () => (
    <div className="page-editor">
      <div className="page-header">
        <div className="page-icon" onClick={() => {
          const icon = prompt('Enter an emoji for this page:', page.icon || '📄');
          if (icon !== null) updatePageIcon(page.id, icon);
        }}>
          {page.icon || (page.type === 'journal' ? '📅' : '📄')}
        </div>

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
            <button className="page-action-btn" onClick={() => setShowTemplates(true)} title="Insert template (Ctrl+Shift+T)">
              <BookMarked size={14} />
            </button>
            <button className={`page-action-btn ${viewMode === 'preview' ? 'active' : ''}`} onClick={toggleViewMode} title="Preview (Ctrl+E)">
              <Eye size={14} />
            </button>
            <button className={`page-action-btn ${rightSidebarOpen ? 'active' : ''}`} onClick={toggleRightSidebar} title="Right panel (Ctrl+\)">
              <PanelRight size={14} />
            </button>
          </div>
        </div>

        {page.tags?.length > 0 && (
          <div className="page-tags">
            {page.tags.map(tag => <span key={tag} className="tag-chip">#{tag}</span>)}
          </div>
        )}

        <div className="page-meta">
          <span className="page-meta-type">{page.type === 'journal' ? '📅 Journal' : '📄 Page'}</span>
          {pageBacklinks.length > 0 && (
            <span className="page-meta-links" onClick={toggleRightSidebar}>
              🔗 {pageBacklinks.length} backlink{pageBacklinks.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className={`page-content ${viewMode === 'preview' ? 'preview-mode' : ''}`} onClick={handlePageClick}>
        {page.root_blocks.length === 0 ? (
          <div className="empty-page-hint">
            Click here or press Enter to start writing...
            <br />
            <span className="hint-sub">
              Type <kbd>/</kbd> for blocks • <kbd>Ctrl+K</kbd> to search • <kbd>Ctrl+Shift+T</kbd> for templates
            </span>
          </div>
        ) : (
          page.root_blocks.map(blockId => (
            <BlockNode
              key={blockId}
              uuid={blockId}
              onNavigateToPage={(pid) => useGraphStore.getState().setActivePage(pid)}
            />
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="page-editor-container">
      <div className="page-editor-main">
        {/* Top navigation bar */}
        <TopBar
          onExport={handleExport}
          onSplitView={() => setSplitView(v => !v)}
          splitView={splitView}
        />

        {/* Editor area - split or single */}
        <div className={`page-editor-body ${splitView ? 'split' : ''}`}>
          <EditorPane />
          {splitView && (
            <div className="split-preview">
              <div className="split-preview-label">Preview</div>
              <div className="page-editor">
                <div className="page-content preview-mode">
                  {page.root_blocks.map(blockId => (
                    <BlockNode key={blockId} uuid={blockId} onNavigateToPage={(pid) => useGraphStore.getState().setActivePage(pid)} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right sidebar */}
      {rightSidebarOpen && (
        <div className="right-sidebar">
          <BacklinksPanel pageId={activePageId} />
        </div>
      )}

      {/* Overlays */}
      <InlineToolbar />
      <BlockMenu />
      <CommandPalette onNavigateToPage={(pid) => useGraphStore.getState().setActivePage(pid)} />
      <ContextMenu />
      {showTemplates && activePageId && (
        <TemplateModal pageId={activePageId} onClose={() => setShowTemplates(false)} />
      )}
    </div>
  );
};
