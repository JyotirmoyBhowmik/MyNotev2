import React, { useRef, useEffect, useState } from 'react';
import { useGraphStore } from '../store/graphStore';
import type { BlockType } from '../store/graphStore';
import { useUIStore } from '../store/uiStore';
import { useDrag, useDrop } from 'react-dnd';
import { parseInlineContent } from '../hooks/useInlineFormat';
import { ChevronRight, GripVertical, Plus } from 'lucide-react';
import { DatabaseView } from './database/DatabaseView';
import './BlockNode.css';

interface BlockNodeProps {
  uuid: string;
  onNavigateToPage?: (pageId: string) => void;
}

const BLOCK_DND_TYPE = 'BLOCK';

export const BlockNode: React.FC<BlockNodeProps> = ({ uuid, onNavigateToPage }) => {
  const { blocks, pages, updateBlock, updateBlockType, addBlock, indentBlock, outdentBlock, deleteBlock, moveBlock } = useGraphStore();
  const { openSlashMenu, closeSlashMenu, setSlashQuery, slashMenuOpen, slashMenuBlockId, setContextMenu, collapsedBlocks, toggleCollapsed } = useUIStore();
  const block = blocks[uuid];
  const contentRef = useRef<HTMLDivElement>(null);
  const [showAddBtn, setShowAddBtn] = useState(false);
  // editingRef mirrors isEditing but is always current (no stale closure)
  const editingRef = React.useRef(false);

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const [{ isDragging }, drag, dragPreview] = useDrag(() => ({
    type: BLOCK_DND_TYPE,
    item: { uuid },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }), [uuid]);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: BLOCK_DND_TYPE,
    drop: (item: { uuid: string }) => {
      if (item.uuid === uuid) return;
      const targetBlock = blocks[uuid];
      if (!targetBlock) return;
      const parentArray = targetBlock.parent_id
        ? blocks[targetBlock.parent_id]?.children
        : pages[targetBlock.page_id]?.root_blocks;
      const index = (parentArray ?? []).indexOf(uuid);
      moveBlock(item.uuid, targetBlock.parent_id, index);
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  }), [uuid, blocks, pages]);

  // ── Sync parsed HTML when block content changes externally ──────────────────
  // Only runs when the block is NOT focused (editingRef prevents mid-type stomps)
  useEffect(() => {
    if (!editingRef.current && contentRef.current) {
      contentRef.current.innerHTML = parseInlineContent(block?.content || '');
    }
  }, [block?.content]);

  if (!block) return null;

  const isCollapsed = !!collapsedBlocks[uuid] || block.is_collapsed;
  const hasChildren = block.children.length > 0;

  // ── Keyboard handler ───────────────────────────────────────────────────────
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLDivElement>) => {
    const sel = window.getSelection();
    const cursorOffset = sel?.anchorOffset ?? 0;
    const rawText = contentRef.current?.innerText ?? '';

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const before = rawText.substring(0, cursorOffset);
      const after = rawText.substring(cursorOffset);
      await updateBlock(uuid, before);

      // Determine next block type (headings revert to text on Enter)
      const nextType: BlockType = ['heading1', 'heading2', 'heading3', 'divider'].includes(block.block_type) ? 'text' : block.block_type;

      if (block.children.length > 0 && !isCollapsed) {
        const nb = await addBlock(block.page_id, uuid, 0, after, nextType);
        focusBlock(nb.uuid);
      } else {
        const parentArray = block.parent_id ? blocks[block.parent_id]?.children : pages[block.page_id]?.root_blocks;
        const idx = (parentArray ?? []).indexOf(uuid);
        const nb = await addBlock(block.page_id, block.parent_id, idx + 1, after, nextType);
        focusBlock(nb.uuid);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) await outdentBlock(uuid);
      else await indentBlock(uuid);
    } else if (e.key === 'Backspace' && rawText === '') {
      e.preventDefault();
      // If block has a type, revert to text first
      if (block.block_type !== 'text') {
        await updateBlockType(uuid, 'text');
        return;
      }
      const parentArray = block.parent_id ? blocks[block.parent_id]?.children : pages[block.page_id]?.root_blocks;
      const idx = (parentArray ?? []).indexOf(uuid);
      if (idx > 0) focusBlock(parentArray![idx - 1], true);
      else if (block.parent_id) focusBlock(block.parent_id, true);
      await deleteBlock(uuid);
    } else if (e.key === 'ArrowUp' && !e.shiftKey) {
      const parentArray = block.parent_id ? blocks[block.parent_id]?.children : pages[block.page_id]?.root_blocks;
      const idx = (parentArray ?? []).indexOf(uuid);
      if (idx > 0) { e.preventDefault(); focusBlock(parentArray![idx - 1], true); }
    } else if (e.key === 'ArrowDown' && !e.shiftKey) {
      const parentArray = block.parent_id ? blocks[block.parent_id]?.children : pages[block.page_id]?.root_blocks;
      const idx = (parentArray ?? []).indexOf(uuid);
      if (idx < (parentArray ?? []).length - 1) { e.preventDefault(); focusBlock(parentArray![idx + 1]); }
    }
  };

  // ── Input handler (slash commands) ────────────────────────────────────────
  const handleInput = (_e: React.FormEvent<HTMLDivElement>) => {
    const text = contentRef.current?.innerText ?? '';
    // Detect slash command
    if (text === '/') {
      openSlashMenu(uuid);
      setSlashQuery('');
    } else if (slashMenuOpen && slashMenuBlockId === uuid) {
      if (text.startsWith('/')) {
        setSlashQuery(text.slice(1));
      } else {
        closeSlashMenu();
      }
    }
  };

  const handleFocus = () => {
    editingRef.current = true;   // must be synchronous — before React batching
    if (contentRef.current) {
      // Switch from parsed HTML to raw markdown for editing
      contentRef.current.innerText = block.content;
      // Move cursor to end
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(contentRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  };

  const handleBlur = async () => {
    editingRef.current = false;  // must be synchronous — before React batching
    const text = contentRef.current?.innerText ?? '';
    const trimmed = text.trimEnd();
    if (trimmed !== block.content) {
      await updateBlock(uuid, trimmed);
      // Re-render with parsed HTML using the NEW content
      if (contentRef.current) {
        contentRef.current.innerHTML = parseInlineContent(trimmed);
      }
    } else {
      // Content unchanged — still re-render to show formatted view
      if (contentRef.current) {
        contentRef.current.innerHTML = parseInlineContent(block.content);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, blockId: uuid });
  };

  const handleClick = (e: React.MouseEvent) => {
    // Handle [[page link]] clicks
    const target = e.target as HTMLElement;
    if (target.classList.contains('page-link') || target.closest('.page-link')) {
      const el = target.closest('.page-link') as HTMLElement;
      const title = el?.dataset.page;
      if (title && onNavigateToPage) {
        const page = Object.values(pages).find(p => p.title === title);
        if (page) onNavigateToPage(page.id);
      }
    }
  };

  const focusBlock = (id: string, atEnd = false) => {
    setTimeout(() => {
      const el = document.getElementById(`block-${id}`);
      if (el) {
        el.focus();
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(!atEnd);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }, 30);
  };

  // ── Block type rendering ───────────────────────────────────────────────────
  const getBlockClassName = () => {
    const base = 'block-content';
    const typeClass = `block-type-${block.block_type}`;
    return `${base} ${typeClass}`;
  };

  const getPlaceholder = () => {
    const placeholders: Record<BlockType, string> = {
      text: "Type '/' for commands...",
      heading1: 'Heading 1',
      heading2: 'Heading 2',
      heading3: 'Heading 3',
      bullet: 'List item',
      numbered: 'Numbered item',
      toggle: 'Toggle block',
      code: 'Code...',
      quote: 'Quote...',
      callout: 'Callout...',
      divider: '',
      image: '',
      file: '',
      nexus_html: '',
      database: 'Database View',
    };
    return placeholders[block.block_type] || "Type '/' for commands...";
  };

  return (
    <div
      ref={(node) => { drop(node); dragPreview(node); }}
      className={`block-node ${isDragging ? 'dragging' : ''} ${isOver ? 'drop-over' : ''}`}
      onMouseEnter={() => setShowAddBtn(true)}
      onMouseLeave={() => setShowAddBtn(false)}
    >
      {/* Gutter: drag handle + bullet/collapse */}
      <div className="block-gutter">
        <div ref={drag as any} className={`drag-handle ${showAddBtn ? 'visible' : ''}`} title="Drag to reorder">
          <GripVertical size={14} />
        </div>
        <div
          className={`block-bullet ${hasChildren ? 'has-children' : ''} ${isCollapsed ? 'collapsed' : ''}`}
          onClick={() => hasChildren && toggleCollapsed(uuid)}
          title={hasChildren ? (isCollapsed ? 'Expand' : 'Collapse') : undefined}
        >
          {hasChildren ? (
            <ChevronRight size={12} className={`collapse-arrow ${isCollapsed ? '' : 'expanded'}`} />
          ) : (
            <span className="bullet-dot" />
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="block-body">
        {block.block_type === 'divider' ? (
          <hr className="block-divider" />
        ) : block.block_type === 'database' ? (
          <DatabaseView blockId={uuid} />
        ) : block.block_type === 'image' ? (
          <div className="block-image-wrap">
            <img
              src={block.content}
              alt="Uploaded image"
              className="block-image"
              loading="lazy"
              onClick={() => window.open(block.content, '_blank')}
            />
            <button
              className="block-image-delete"
              onClick={() => deleteBlock(uuid)}
              title="Remove"
            >✕</button>
          </div>
        ) : block.block_type === 'file' ? (
          <div className="block-file">
            <span className="block-file-icon">📎</span>
            <a
              href={block.content.match(/\((.+?)\)/)?.[1] || block.content}
              target="_blank"
              rel="noopener noreferrer"
              className="block-file-link"
            >
              {block.content.match(/\[(.+?)\]/)?.[1] || block.content}
            </a>
            <button className="block-file-delete" onClick={() => deleteBlock(uuid)} title="Remove">✕</button>
          </div>
        ) : (
          <div
            id={`block-${uuid}`}
            ref={contentRef}
            className={getBlockClassName()}
            contentEditable
            suppressContentEditableWarning
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onContextMenu={handleContextMenu}
            onClick={handleClick}
            data-placeholder={block.content === '' ? getPlaceholder() : ''}
            spellCheck
          />
        )}

        {/* Quick add button */}
        {showAddBtn && (
          <button
            className="block-add-btn"
            onClick={async () => {
              const parentArray = block.parent_id ? blocks[block.parent_id]?.children : pages[block.page_id]?.root_blocks;
              const idx = (parentArray ?? []).indexOf(uuid);
              const nb = await addBlock(block.page_id, block.parent_id, idx + 1);
              focusBlock(nb.uuid);
            }}
            title="Add block below"
          >
            <Plus size={12} />
          </button>
        )}

        {/* Children */}
        {hasChildren && !isCollapsed && (
          <div className="block-children">
            {block.children.map(childId => (
              <BlockNode key={childId} uuid={childId} onNavigateToPage={onNavigateToPage} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
