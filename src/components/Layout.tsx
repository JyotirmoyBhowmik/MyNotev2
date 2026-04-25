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
        <ResizablePanelGroup orientation="horizontal" className="h-full items-stretch">
          {/* Left Sidebar: Navigation Tree */}
          <ResizablePanel 
            defaultSize={18} 
            minSize={12} 
            maxSize={30}
            className="flex flex-col min-w-[200px]"
          >
            <Sidebar onOpenAdmin={onOpenAdmin} isAdmin={isAdmin} />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Center: The Block Editor or Dashboard */}
          <ResizablePanel defaultSize={(rightSidebarOpen && !strategyOpen) ? 64 : 82}>
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

          {/* Right: Inspector (Properties, Backlinks, AI) */}
          {rightSidebarOpen && !strategyOpen && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={18} minSize={15} maxSize={35}>
                 <Inspector pageId={activePageId} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </DndProvider>
  );
};
