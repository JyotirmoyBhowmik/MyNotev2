import React, { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Code, Strikethrough, Link2, Hash } from 'lucide-react';
import './InlineToolbar.css';

interface ToolbarPos { top: number; left: number; }

// Wraps selected text in a contentEditable div with markdown syntax
function wrapSelection(before: string, after: string = before) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const selectedText = range.toString();
  if (!selectedText) return;

  // Insert markdown markers around selection
  const node = range.startContainer;
  const el = node.parentElement?.closest('[contenteditable]') as HTMLElement;
  if (!el) return;

  document.execCommand('insertText', false, `${before}${selectedText}${after}`);
}

export const InlineToolbar: React.FC = () => {
  const [pos, setPos] = useState<ToolbarPos | null>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateToolbar = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setHasSelection(false);
        setPos(null);
        return;
      }
      const text = sel.toString().trim();
      if (!text) { setPos(null); return; }

      // Only show when inside a block-content
      const node = sel.anchorNode?.parentElement;
      if (!node?.closest('.block-content')) { setPos(null); return; }

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setPos({
        top: rect.top + window.scrollY - 44,
        left: rect.left + rect.width / 2,
      });
      setHasSelection(true);
    };

    document.addEventListener('selectionchange', updateToolbar);
    document.addEventListener('mouseup', updateToolbar);
    return () => {
      document.removeEventListener('selectionchange', updateToolbar);
      document.removeEventListener('mouseup', updateToolbar);
    };
  }, []);

  if (!pos || !hasSelection) return null;

  const tools = [
    { icon: <Bold size={13} />, label: 'Bold', action: () => wrapSelection('**') },
    { icon: <Italic size={13} />, label: 'Italic', action: () => wrapSelection('*') },
    { icon: <Code size={13} />, label: 'Code', action: () => wrapSelection('`') },
    { icon: <Strikethrough size={13} />, label: 'Strike', action: () => wrapSelection('~~') },
    {
      icon: <Link2 size={13} />, label: 'Link', action: () => {
        const url = prompt('Enter URL:');
        if (url) {
          const sel = window.getSelection();
          if (sel && !sel.isCollapsed) {
            const text = sel.toString();
            document.execCommand('insertText', false, `[${text}](${url})`);
          }
        }
      }
    },
    {
      icon: <Hash size={13} />, label: 'Tag', action: () => {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed) {
          const text = sel.toString().trim().replace(/\s+/g, '-');
          document.execCommand('insertText', false, `#${text}`);
        }
      }
    },
  ];

  return (
    <div
      ref={toolbarRef}
      className="inline-toolbar"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={e => e.preventDefault()} // Prevent blur
    >
      {tools.map(t => (
        <button
          key={t.label}
          className="inline-tool"
          title={t.label}
          onClick={t.action}
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
};
