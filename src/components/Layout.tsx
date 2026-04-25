import React, { useState } from 'react';
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

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="app-layout">
        <ResizablePanelGroup 
          direction="horizontal" 
          className="h-full" 
          id="main-layout-group"
          autoSaveId="nexus-main-layout"
        >
          {/* Left Sidebar: Navigation Tree */}
          <ResizablePanel
            defaultSize={25}
            minSize={10}
            maxSize={80}
            id="sidebar-panel"
          >
            <div className="h-full flex flex-col">
              <Sidebar onOpenAdmin={onOpenAdmin} isAdmin={isAdmin} />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="w-2 bg-border hover:bg-primary/30 transition-colors" />

          {/* Center: The Block Editor or Dashboard */}
          <ResizablePanel
            defaultSize={rightSidebarOpen ? 64 : 82}
            id="content-panel"
          >
            <main className="main-content h-full flex flex-col relative">
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
              <ResizablePanel defaultSize={18} minSize={15} maxSize={25} id="inspector-panel">
                <Inspector pageId={activePageId} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </DndProvider>
  );
};
