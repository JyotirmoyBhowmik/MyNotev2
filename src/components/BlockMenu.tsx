import React, { useEffect, useRef, useState } from 'react';
import { useUIStore } from '../store/uiStore';
import { useGraphStore } from '../store/graphStore';
import type { BlockType } from '../store/graphStore';
import {
  Type, Heading1, Heading2, Heading3, List, ListOrdered,
  ChevronRight, Code2, Quote, AlertCircle, Minus, Table as TableIcon
} from 'lucide-react';
import './BlockMenu.css';

interface BlockMenuOption {
  type: BlockType;
  icon: React.ReactNode;
  label: string;
  description: string;
  keywords: string[];
}

const BLOCK_OPTIONS: BlockMenuOption[] = [
  { type: 'text',     icon: <Type size={16}/>,         label: 'Text',      description: 'Plain paragraph',       keywords: ['text','paragraph','p'] },
  { type: 'heading1', icon: <Heading1 size={16}/>,     label: 'Heading 1', description: 'Large section title',   keywords: ['h1','heading','title'] },
  { type: 'heading2', icon: <Heading2 size={16}/>,     label: 'Heading 2', description: 'Medium section title',  keywords: ['h2','heading'] },
  { type: 'heading3', icon: <Heading3 size={16}/>,     label: 'Heading 3', description: 'Small section title',   keywords: ['h3','heading'] },
  { type: 'bullet',   icon: <List size={16}/>,         label: 'Bullet',    description: 'Unordered list item',   keywords: ['bullet','list','ul','-'] },
  { type: 'numbered', icon: <ListOrdered size={16}/>,  label: 'Numbered',  description: 'Ordered list item',     keywords: ['numbered','list','ol','1.'] },
  { type: 'toggle',   icon: <ChevronRight size={16}/>, label: 'Toggle',    description: 'Collapsible section',   keywords: ['toggle','collapsible','details'] },
  { type: 'code',     icon: <Code2 size={16}/>,        label: 'Code',      description: 'Code block',            keywords: ['code','```','pre'] },
  { type: 'quote',    icon: <Quote size={16}/>,        label: 'Quote',     description: 'Blockquote',            keywords: ['quote','blockquote','>'] },
  { type: 'callout',  icon: <AlertCircle size={16}/>,  label: 'Callout',   description: 'Highlighted callout',   keywords: ['callout','note','info','warning'] },
  { type: 'divider',  icon: <Minus size={16}/>,        label: 'Divider',   description: 'Horizontal rule',       keywords: ['divider','hr','---','separator'] },
  { type: 'database', icon: <TableIcon size={16}/>,    label: 'Database',  description: 'Structured collection', keywords: ['database','table','db','collection'] },
];

export const BlockMenu: React.FC = () => {
  const { slashMenuOpen, slashMenuBlockId, slashQuery, closeSlashMenu } = useUIStore();
  const { updateBlockType, updateBlock } = useGraphStore();
  const [selected, setSelected] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = BLOCK_OPTIONS.filter(opt => {
    if (!slashQuery) return true;
    const q = slashQuery.toLowerCase();
    return opt.label.toLowerCase().includes(q) || opt.keywords.some(k => k.includes(q));
  });

  useEffect(() => setSelected(0), [slashQuery]);

  useEffect(() => {
    if (!slashMenuOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === 'Enter') { e.preventDefault(); if (filtered[selected]) selectOption(filtered[selected]); }
      if (e.key === 'Escape') closeSlashMenu();
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [slashMenuOpen, selected, filtered]);

  // Position the menu near the current block
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (slashMenuOpen && slashMenuBlockId) {
      const el = document.getElementById(`block-${slashMenuBlockId}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        setPos({ top: rect.bottom + 4, left: rect.left });
      }
    }
  }, [slashMenuOpen, slashMenuBlockId]);

  const selectOption = async (opt: BlockMenuOption) => {
    if (!slashMenuBlockId) return;
    closeSlashMenu();
    // Clear slash text and set type
    await updateBlock(slashMenuBlockId, '');
    await updateBlockType(slashMenuBlockId, opt.type);
    setTimeout(() => {
      document.getElementById(`block-${slashMenuBlockId}`)?.focus();
    }, 50);
  };

  if (!slashMenuOpen || filtered.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="block-menu"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={e => e.preventDefault()}
    >
      <div className="block-menu-header">Block types</div>
      {filtered.map((opt, i) => (
        <div
          key={opt.type}
          className={`block-menu-item ${i === selected ? 'selected' : ''}`}
          onMouseEnter={() => setSelected(i)}
          onClick={() => selectOption(opt)}
        >
          <span className="block-menu-icon">{opt.icon}</span>
          <span className="block-menu-label">{opt.label}</span>
          <span className="block-menu-desc">{opt.description}</span>
        </div>
      ))}
    </div>
  );
};
