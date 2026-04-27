import React, { useEffect, useState, useRef } from 'react';
import { useGraphStore } from '../store/graphStore';
import { useUIStore } from '../store/uiStore';
import { useLinkStore } from '../store/linkStore';
import { BlockMenu } from './BlockMenu';
import { CommandPalette } from './CommandPalette';
import { ContextMenu } from './ContextMenu';
import { JournalView } from './JournalView';
import { TopBar } from './TopBar';
import { TemplateModal } from './TemplateModal';
import { NexusEditor } from './NexusEditor';
import { Edit3, Star, Eye, PanelRight, BookMarked, Share2, Trash2, RotateCcw } from 'lucide-react';
import { exportPageToMarkdown, downloadMarkdown } from '../hooks/useExport';
import { ShareModal } from './ShareModal';
import { KanbanView } from './KanbanView';
import { supabase } from '../lib/supabase';
import './PageEditor.css';

export const PageEditor: React.FC = () => {
  const { activePageId, pages, trash, blocks, loadGraph, loading, renamePage, favoritePage, updatePageIcon, restorePage, permanentlyDeletePage } = useGraphStore();
  const { setCommandPaletteOpen, rightSidebarOpen, toggleRightSidebar, viewMode, toggleViewMode, journalOpen, setJournalOpen } = useUIStore();
  const { backlinks } = useLinkStore();

  const [init, setInit] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [splitView, setSplitView] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const loadingRef = useRef(false);

  useEffect(() => {
    if (!init && !loadingRef.current) {
      loadingRef.current = true;
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
        loadingRef.current = false;
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

  // Only show the full-screen loader if we have NO pages yet (initial cold load)
  const isInitialLoad = (loading || !init) && Object.keys(pages).length === 0;

  if (isInitialLoad) {
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

  let page = pages[activePageId];
  let isTrashed = false;
  
  if (!page) {
    page = trash.pages[activePageId];
    if (page) isTrashed = true;
  }

  if (!page) return null;

  const pageBacklinks = backlinks[activePageId] || [];

  const getBreadcrumbs = () => {
    const crumbs: any[] = [];
    let currentId = page.parent_page_id;
    while (currentId) {
      const parent = pages[currentId];
      if (parent) {
        crumbs.unshift(parent);
        currentId = parent.parent_page_id;
      } else break;
    }
    return crumbs;
  };

  const handleTitleSave = async () => {
    if (titleDraft.trim() && titleDraft !== page.title) {
      await renamePage(activePageId, titleDraft.trim());
    }
    setEditingTitle(false);
  };


  return (
    <div className="page-editor-container">
      <div className="page-editor-main">
        {/* Top navigation bar */}
        <TopBar
          onExport={handleExport}
          onSplitView={() => setSplitView(v => !v)}
          splitView={splitView}
        />

        {isTrashed && (
          <div className="trash-banner">
            <div className="trash-banner-text">
              <Trash2 size={16} /> This page is in the trash
            </div>
            <div className="trash-banner-actions">
              <button className="trash-banner-btn secondary" onClick={() => restorePage(activePageId)}>
                <RotateCcw size={14} className="inline mr-1" /> Restore
              </button>
              <button className="trash-banner-btn primary" onClick={() => { if (confirm('Permanently delete this page?')) permanentlyDeletePage(activePageId); }}>
                Delete Permanently
              </button>
            </div>
          </div>
        )}

        {/* Editor area - split or single */}
        <div className={`page-editor-body ${splitView ? 'split' : ''}`}>
          <div className={`page-editor ${isTrashed ? 'trashed' : ''}`}>
            {page.type === 'kanban' ? (
              <KanbanView pageId={activePageId} />
            ) : (
              <>
                <div className="page-header">
                  {/* Breadcrumbs */}
                  <div className="page-breadcrumbs">
                    {getBreadcrumbs().map((crumb) => (
                      <React.Fragment key={crumb.id}>
                        <span 
                          className="breadcrumb-item" 
                          onClick={() => useGraphStore.getState().setActivePage(crumb.id)}
                        >
                          {crumb.title}
                        </span>
                        <span className="breadcrumb-separator">/</span>
                      </React.Fragment>
                    ))}
                    <span className="breadcrumb-current">{page.title}</span>
                  </div>

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
                      <button className="page-action-btn" onClick={() => setShareOpen(true)} title="Share Page">
                        <Share2 size={14} />
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
                <select 
                  className="page-type-select"
                  value={page.type}
                  onChange={async (e) => {
                    const newType = e.target.value as any;
                    await supabase.from('pages').update({ type: newType, updated_at: Date.now() }).eq('id', page.id);
                    useGraphStore.setState(s => ({ 
                      pages: { ...s.pages, [page.id]: { ...s.pages[page.id], type: newType } } 
                    }));
                  }}
                >
                  <option value="normal">📄 Page</option>
                  <option value="journal">📅 Journal</option>
                  <option value="kanban">📋 Kanban Board</option>
                  <option value="folder">📁 Folder</option>
                </select>
                
                {pageBacklinks.length > 0 && (
                  <span className="page-meta-links" onClick={toggleRightSidebar}>
                    🔗 {pageBacklinks.length} backlink{pageBacklinks.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
                </div>

                <div className="page-editor-content-area">
                  <NexusEditor 
                    pageId={activePageId} 
                    onNavigateToPage={(pid) => useGraphStore.getState().setActivePage(pid)} 
                    readOnly={isTrashed}
                  />
                </div>
              </>
            )}
          </div>
          
          {splitView && (
            <div className="split-preview">
              <div className="split-preview-label">Preview</div>
              <div className="page-editor">
                <div className="page-editor-content-area preview-only">
                   <NexusEditor 
                      pageId={activePageId} 
                      onNavigateToPage={(pid) => useGraphStore.getState().setActivePage(pid)} 
                      readOnly={true}
                    />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>



      {/* Overlays */}
      <BlockMenu />
      <CommandPalette onNavigateToPage={(pid) => useGraphStore.getState().setActivePage(pid)} />
      <ContextMenu />
      {showTemplates && activePageId && (
        <TemplateModal 
          onClose={() => setShowTemplates(false)} 
          onApply={async (content) => {
            await useGraphStore.getState().savePageContent(activePageId, content);
            setShowTemplates(false);
          }}
        />
      )}
      {shareOpen && (
        <ShareModal pageTitle={page?.title || 'Page'} onClose={() => setShareOpen(false)} />
      )}
    </div>
  );
};
