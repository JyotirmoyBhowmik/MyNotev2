import React, { useEffect, useRef, useState } from 'react';
import { useUIStore } from '../store/uiStore';
import { useGraphStore } from '../store/graphStore';
import { useSearchStore } from '../store/searchStore';
import { FileText, Hash, Search, Plus, Calendar } from 'lucide-react';
import './CommandPalette.css';

interface PaletteItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  onNavigateToPage: (pageId: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ onNavigateToPage }) => {
  const { commandPaletteOpen, setCommandPaletteOpen, setJournalOpen } = useUIStore();
  const { pages, createPage, createDailyPage } = useGraphStore();
  const { results, search, clear } = useSearchStore();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { blocks } = useGraphStore();

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      clear();
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  useEffect(() => {
    search(query, pages, blocks);
    setSelected(0);
  }, [query, pages, blocks]);

  const close = () => {
    setCommandPaletteOpen(false);
    setQuery('');
    clear();
  };

  const buildItems = (): PaletteItem[] => {
    const items: PaletteItem[] = [];

    if (!query) {
      // Default: recent pages + actions
      items.push({
        id: 'new-page', label: 'New Page', sublabel: 'Create a blank page', icon: <Plus size={16} />,
        action: async () => {
          const title = prompt('Page title:');
          if (title) {
            const page = await createPage(title);
            onNavigateToPage(page.id);
          }
          close();
        }
      });
      items.push({
        id: 'daily', label: "Today's Notes", sublabel: 'Open daily journal', icon: <Calendar size={16} />,
        action: async () => { await createDailyPage(); close(); }
      });
      items.push({
        id: 'journal-view', label: 'Journal / Calendar', sublabel: 'Browse all daily notes', icon: <Calendar size={16} />,
        action: () => { setJournalOpen(true); close(); }
      });
      Object.values(pages).slice(0, 10).forEach(p => {
        items.push({
          id: p.id, label: p.title,
          sublabel: p.is_favorite ? '⭐ Favorite' : p.type === 'journal' ? '📅 Journal' : '📄 Page',
          icon: <FileText size={16} />,
          action: () => { onNavigateToPage(p.id); close(); }
        });
      });
    } else {
      // Search results
      results.forEach(r => {
        items.push({
          id: r.id, label: r.title,
          sublabel: r.type === 'block' ? `in ${r.pageTitle}` : 'Page',
          icon: r.type === 'page' ? <FileText size={16} /> : <Hash size={16} />,
          action: () => {
            const pageId = r.type === 'page' ? r.id : r.pageId!;
            onNavigateToPage(pageId);
            close();
          }
        });
      });
      // Create page with query as title
      items.push({
        id: 'create', label: `Create "${query}"`, sublabel: 'New page', icon: <Plus size={16} />,
        action: async () => {
          const page = await createPage(query);
          onNavigateToPage(page.id);
          close();
        }
      });
    }
    return items;
  };

  const items = buildItems();

  useEffect(() => {
    if (!commandPaletteOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, items.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === 'Enter') { e.preventDefault(); items[selected]?.action(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandPaletteOpen, items, selected]);

  if (!commandPaletteOpen) return null;

  return (
    <div className="palette-overlay" onClick={close}>
      <div className="palette-modal" onClick={e => e.stopPropagation()}>
        <div className="palette-search">
          <Search size={16} className="palette-search-icon" />
          <input
            ref={inputRef}
            className="palette-input"
            placeholder="Search pages, blocks... or type to create"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <kbd className="palette-esc">ESC</kbd>
        </div>
        <div className="palette-results">
          {items.map((item, i) => (
            <div
              key={item.id}
              className={`palette-item ${i === selected ? 'selected' : ''}`}
              onMouseEnter={() => setSelected(i)}
              onClick={() => item.action()}
            >
              <span className="palette-item-icon">{item.icon}</span>
              <span className="palette-item-main">
                <span className="palette-item-label">{item.label}</span>
                {item.sublabel && <span className="palette-item-sub">{item.sublabel}</span>}
              </span>
            </div>
          ))}
          {items.length === 0 && (
            <div className="palette-empty">No results for "{query}"</div>
          )}
        </div>
      </div>
    </div>
  );
};
