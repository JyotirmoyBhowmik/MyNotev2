import React, { useState, useMemo, useCallback, useRef, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { 
  FileText, Plus, Calendar, Search, 
  ChevronRight, ChevronDown, LogOut, Command, CheckCircle,
  Trash2, Network, FolderPlus
} from 'lucide-react';
import { useDrag, useDrop } from 'react-dnd';
import { useGraphStore, type Page } from '../store/graphStore';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { cn } from '../lib/utils';

// ─── TYPES ─────────────────────────────────────────────────────────────────
interface PageNode extends Page {
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

// ─── COMPONENT ─────────────────────────────────────────────────────────────
export const Sidebar: React.FC = memo(() => {
  const { 
    pages, activePageId, setActivePage, createPage, createFolder, movePage
  } = useGraphStore();
  const { signOut, user, profile } = useAuthStore();
  const { 
    isFocusMode, setFocusMode, setJournalOpen, 
    setCommandPaletteOpen, setTasksOpen, setGraphOpen,
    setTrashOpen, setPageContextMenu 
  } = useUIStore();
  
  const [expandedPages, setExpandedPages] = useState<Record<string, boolean>>({});
  const parentRef = useRef<HTMLDivElement>(null);

  // ─── TREE LOGIC ──────────────────────────────────────────────────────────
  const flatNodes = useMemo(() => {
    const nodes: PageNode[] = [];
    const allPages = Object.values(pages).filter(p => !p.deleted_at);
    
    const buildFlatTree = (parentId: string | null, depth: number) => {
      const children = allPages.filter(p => p.parent_page_id === parentId)
        .sort((a, b) => a.title.localeCompare(b.title));
        
      children.forEach(page => {
        const hasChildren = allPages.some(p => p.parent_page_id === page.id);
        const isExpanded = expandedPages[page.id] ?? false;
        
        nodes.push({ ...page, depth, hasChildren, isExpanded });
        
        if (isExpanded) {
          buildFlatTree(page.id, depth + 1);
        }
      });
    };

    buildFlatTree(null, 0);
    return nodes;
  }, [pages, expandedPages]);

  // ─── VIRTUALIZATION ──────────────────────────────────────────────────────
  const rowVirtualizer = useVirtualizer({
    count: flatNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 10,
  });

  // ─── ACTIONS ─────────────────────────────────────────────────────────────
  const toggleExpand = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPages(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleNewPage = async () => {
    const title = prompt('Page title:');
    if (title) await createPage(title, 'normal', null);
  };

  const handleNewFolder = async () => {
    const title = prompt('Folder title:');
    if (title) await createFolder(title, null);
  };

  const [, dropZone] = useDrop({
    accept: 'SIDEBAR_ITEM',
    drop: (item: { id: string }, monitor) => {
      if (monitor.didDrop()) return;
      // Dropped on the sidebar root
      movePage(item.id, null);
    }
  });

  return (
    <div className="flex h-full flex-col bg-[var(--obsidian-surface)] border-r border-[var(--glass-border)]">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--glass-border)] glass-blur">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-[var(--electric-blue)] flex items-center justify-center font-bold text-[10px] text-white">N</div>
          <span className="text-xs font-bold tracking-tight text-[var(--text-primary)]">NEXUS V3.15</span>
        </div>
        <button onClick={() => setFocusMode(!isFocusMode)} className="text-[var(--text-secondary)] hover:text-white transition-colors">
          <Command size={14} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 rounded-md bg-white/5 px-3 py-1.5 border border-[var(--glass-border)] group focus-within:border-[var(--electric-blue)] transition-all">
          <Search size={12} className="text-[var(--text-secondary)]" />
          <input 
            placeholder="Search pages..." 
            onFocus={() => setCommandPaletteOpen(true)}
            className="bg-transparent text-xs outline-none w-full text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col gap-0.5 px-2 mb-4">
        <button 
          onClick={() => setJournalOpen(true)}
          className="flex items-center gap-3 px-3 py-1.5 rounded-md text-xs text-[var(--text-secondary)] hover:bg-white/5 hover:text-white transition-all group border-l-[1px] border-transparent hover:border-[var(--electric-blue)]"
        >
          <Calendar size={14} /> Journal
        </button>
        <button 
          className="flex items-center gap-3 px-3 py-1.5 rounded-md text-xs text-[var(--text-secondary)] hover:bg-white/5 hover:text-white transition-all group border-l-[1px] border-transparent hover:border-[var(--electric-blue)]"
          onClick={() => setTasksOpen(true)}
        >
          <CheckCircle size={14} /> Tasks
        </button>
        <button 
          className="flex items-center gap-3 px-3 py-1.5 rounded-md text-xs text-[var(--text-secondary)] hover:bg-white/5 hover:text-white transition-all group border-l-[1px] border-transparent hover:border-[var(--electric-blue)]"
          onClick={() => setGraphOpen(true)}
        >
          <Network size={14} /> Graph
        </button>
        <button 
          className="flex items-center gap-3 px-3 py-1.5 rounded-md text-xs text-[var(--text-secondary)] hover:bg-white/5 hover:text-white transition-all group border-l-[1px] border-transparent hover:border-[var(--electric-blue)]"
          onClick={() => setTrashOpen(true)}
        >
          <Trash2 size={14} /> Trash
        </button>
      </div>

      {/* Page Tree (Virtualized) */}
      <div className="flex-1 overflow-y-auto px-2 custom-scrollbar" ref={parentRef}>
        <div 
          ref={dropZone as any}
          className="flex items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]"
        >
          <span>Documents</span>
          <div className="flex items-center gap-2">
            <button onClick={handleNewFolder} title="New Folder" className="hover:text-white transition-colors"><FolderPlus size={14} /></button>
            <button onClick={handleNewPage} title="New Page" className="hover:text-white transition-colors"><Plus size={14} /></button>
          </div>
        </div>

        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const node = flatNodes[virtualRow.index];
            const isActive = activePageId === node.id;

            return (
              <DraggableSidebarItem
                key={node.id}
                node={node}
                virtualRow={virtualRow}
                isActive={isActive}
                onToggleExpand={toggleExpand}
                onSelect={() => {
                  setActivePage(node.id);
                  setJournalOpen(false);
                  setGraphOpen(false);
                  setTrashOpen(false);
                  setTasksOpen(false);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setPageContextMenu({ x: e.clientX, y: e.clientY, pageId: node.id });
                }}
                movePage={movePage}
              />
            );
          })}
        </div>
      </div>

      {/* User Bar */}
      <div className="p-4 border-t border-[var(--glass-border)] glass-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[var(--electric-blue)] to-purple-500 flex-shrink-0 shadow-[0_0_10px_rgba(91,138,245,0.3)] flex items-center justify-center text-[10px] font-bold text-white">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-[10px] font-bold truncate uppercase tracking-tight text-[var(--text-primary)]">
                {profile?.full_name || user?.email?.split('@')[0]}
              </span>
              <span className="text-[9px] text-[var(--text-secondary)] truncate">
                {profile?.role === 'admin' ? 'Nexus Architect' : 'Obsidian Pro Plan'}
              </span>
            </div>
          </div>
          <button onClick={() => signOut()} className="text-[var(--text-secondary)] hover:text-red-400 p-2 rounded-md hover:bg-red-500/10 transition-all">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );
});

Sidebar.displayName = 'Sidebar';

interface DraggableSidebarItemProps {
  node: PageNode;
  virtualRow: any;
  isActive: boolean;
  onToggleExpand: (id: string, e: React.MouseEvent) => void;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  movePage: (id: string, parentId: string | null) => void;
}

const DraggableSidebarItem: React.FC<DraggableSidebarItemProps> = ({
  node, virtualRow, isActive, onToggleExpand, onSelect, onContextMenu, movePage
}) => {
  const [{ isDragging }, dragRef] = useDrag({
    type: 'SIDEBAR_ITEM',
    item: { id: node.id, type: node.type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const [{ isOver }, dropRef] = useDrop({
    accept: 'SIDEBAR_ITEM',
    drop: (item: { id: string, type: string }) => {
      if (item.id === node.id) return;
      if (node.type === 'folder') {
        movePage(item.id, node.id);
      } else {
        movePage(item.id, node.parent_page_id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true })
    })
  });

  return (
    <div
      ref={(el) => {
        dragRef(el);
        dropRef(el);
      }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: `${virtualRow.size}px`,
        transform: `translateY(${virtualRow.start}px)`,
        paddingLeft: `${node.depth * 12 + 8}px`,
        opacity: isDragging ? 0.4 : 1
      }}
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1 cursor-pointer transition-all border-l-[1px]',
        isActive 
          ? 'bg-white/10 text-white border-[var(--electric-blue)]' 
          : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-white border-transparent hover:border-[var(--electric-blue)]',
        isOver && node.type === 'folder' ? 'bg-[var(--electric-blue)]/20' : ''
      )}
      onClick={onSelect}
      onContextMenu={onContextMenu}
    >
      <div 
        onClick={(e) => onToggleExpand(node.id, e)}
        className="p-0.5 hover:bg-white/10 rounded transition-colors"
      >
        {node.hasChildren ? (
          node.isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
        ) : <div className="w-3" />}
      </div>
      <div className="text-sm opacity-70">
        {node.icon || (node.type === 'folder' ? '📁' : <FileText size={12} />)}
      </div>
      <span className="truncate text-xs tracking-tight font-medium">{node.title}</span>
    </div>
  );
};
