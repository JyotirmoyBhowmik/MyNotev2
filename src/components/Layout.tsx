import React, { useState, useRef, useCallback, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Sidebar } from './Sidebar';
import { PageEditor } from './PageEditor';
import { GraphView } from './GraphView';
import { useGraphStore } from '../store/graphStore';
import { useUIStore } from '../store/uiStore';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui/resizable';
import { Inspector } from './Inspector';
import { OKRDashboard } from './strategy/OKRDashboard';
import './Layout.css';

interface LayoutProps {
  onOpenAdmin: () => void;
  isAdmin: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ onOpenAdmin, isAdmin }) => {
  const [showGraph, setShowGraph] = useState(false);
  const { activePageId } = useGraphStore();
  const { rightSidebarOpen, strategyOpen } = useUIStore();

  // Custom Sidebar Resizing logic (Controlled by CSS variable)
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX;
      if (newWidth > 100 && newWidth < window.innerWidth * 0.9) {
        document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="app-layout">
        {/* Manual Resizable Sidebar */}
        <aside className="sidebar-container" ref={sidebarRef}>
          <div className="h-full flex flex-col">
            <Sidebar onOpenAdmin={onOpenAdmin} isAdmin={isAdmin} />
          </div>
          <div 
            className={`sidebar-resize-handle ${isResizing ? 'resizing' : ''}`} 
            onMouseDown={startResizing}
          />
        </aside>

        {/* Center & Right Area */}
        <div className="main-content flex-1 h-full overflow-hidden">
          <ResizablePanelGroup 
            direction="horizontal" 
            className="h-full" 
            id="center-layout-group-v1"
            autoSaveId="nexus-center-layout-v1"
          >
            {/* Center: The Block Editor or Dashboard */}
            <ResizablePanel
              defaultSize={rightSidebarOpen ? 75 : 100}
              id="content-panel"
            >
              <main className="h-full flex flex-col relative">
                {strategyOpen ? (
                  <OKRDashboard />
                ) : showGraph ? (
                  <GraphView onClose={() => setShowGraph(false)} activePageId={activePageId} />
                ) : (
                  <PageEditor />
                )}

                {/* Graph toggle button (Floating) */}
                <button
                  className="graph-toggle-btn"
                  onClick={() => setShowGraph(g => !g)}
                  title={showGraph ? 'Close Graph View' : 'Open Graph View'}
                >
                  {showGraph ? '📝' : '🕸️'}
                </button>
              </main>
            </ResizablePanel>

            {/* Right Sidebar: Inspector / Links */}
            {rightSidebarOpen && !strategyOpen && (
              <>
                <ResizableHandle withHandle className="w-2 bg-border hover:bg-primary/30 transition-colors" />
                <ResizablePanel defaultSize={25} minSize={20} maxSize={50} id="inspector-panel">
                  <Inspector pageId={activePageId} />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>
      </div>
    </DndProvider>
  );
};

export default Layout;
