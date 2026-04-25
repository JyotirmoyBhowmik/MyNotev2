import React, { useEffect } from 'react';
import { useUIStore } from '../store/uiStore';
import { useGraphStore } from '../store/graphStore';
import { Copy, Trash2, Type, Heading1, Heading2, Heading3, List, Code2, Quote, AlertCircle, ToggleLeft } from 'lucide-react';
import type { BlockType } from '../store/graphStore';
import './ContextMenu.css';

export const ContextMenu: React.FC = () => {
  const { contextMenu, setContextMenu } = useUIStore();
  const { deleteBlock, duplicateBlock, updateBlockType } = useGraphStore();

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    return () => window.removeEventListener('click', close);
  }, []);

  if (!contextMenu) return null;

  const { x, y, blockId } = contextMenu;

  const typeOptions: { type: BlockType; label: string; icon: React.ReactNode }[] = [
    { type: 'text',     label: 'Text',      icon: <Type size={12} /> },
    { type: 'heading1', label: 'Heading 1', icon: <Heading1 size={12} /> },
    { type: 'heading2', label: 'Heading 2', icon: <Heading2 size={12} /> },
    { type: 'heading3', label: 'Heading 3', icon: <Heading3 size={12} /> },
    { type: 'bullet',   label: 'Bullet',    icon: <List size={12} /> },
    { type: 'toggle',   label: 'Toggle',    icon: <ToggleLeft size={12} /> },
    { type: 'code',     label: 'Code',      icon: <Code2 size={12} /> },
    { type: 'quote',    label: 'Quote',     icon: <Quote size={12} /> },
    { type: 'callout',  label: 'Callout',   icon: <AlertCircle size={12} /> },
  ];

  return (
    <div
      className="context-menu"
      style={{ top: Math.min(y, window.innerHeight - 320), left: Math.min(x, window.innerWidth - 200) }}
      onClick={e => e.stopPropagation()}
    >
      <div className="context-section-label">Turn into</div>
      {typeOptions.map(opt => (
        <button key={opt.type} className="context-item" onClick={async () => { await updateBlockType(blockId, opt.type); setContextMenu(null); }}>
          {opt.icon} {opt.label}
        </button>
      ))}
      <div className="context-divider" />
      <button className="context-item" onClick={async () => { await duplicateBlock(blockId); setContextMenu(null); }}>
        <Copy size={12} /> Duplicate
      </button>
      <button className="context-item danger" onClick={async () => { await deleteBlock(blockId); setContextMenu(null); }}>
        <Trash2 size={12} /> Delete
      </button>
    </div>
  );
};
