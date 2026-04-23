import React, { useEffect, useState } from 'react';
import { useGraphStore } from '../store/graphStore';
import { BlockNode } from './BlockNode';
import './PageEditor.css';

export const PageEditor: React.FC = () => {
  const { activePageId, pages, addBlock, loadGraph, loading } = useGraphStore();
  const [init, setInit] = useState(false);

  useEffect(() => {
    if (!init) {
      loadGraph().then(async () => {
        // For prototyping: create a default page if none exists
        const state = useGraphStore.getState();
        const pageIds = Object.keys(state.pages);
        if (pageIds.length === 0) {
          const newPage = await state.createPage('My First Page');
          state.setActivePage(newPage.id);
        } else if (!state.activePageId) {
          state.setActivePage(pageIds[0]);
        }
        setInit(true);
      });
    }
  }, [init, loadGraph]);

  if (loading || !init) {
    return <div className="page-editor-loading">Loading graph...</div>;
  }

  if (!activePageId) {
    return <div className="page-editor-empty">No page selected</div>;
  }

  const page = pages[activePageId];
  if (!page) return null;

  const handleTitleClick = async () => {
      if (page.root_blocks.length === 0) {
          const newBlock = await addBlock(page.id, null, 0, '');
          setTimeout(() => {
             document.getElementById(`block-${newBlock.uuid}`)?.focus();
          }, 50);
      }
  };

  return (
    <div className="page-editor">
      <div className="page-header">
        <h1 className="page-title">{page.title}</h1>
      </div>
      <div className="page-content" onClick={handleTitleClick}>
        {page.root_blocks.length === 0 ? (
          <div className="empty-page-hint">Click to start typing...</div>
        ) : (
          page.root_blocks.map(blockId => (
            <BlockNode key={blockId} uuid={blockId} />
          ))
        )}
      </div>
    </div>
  );
};
