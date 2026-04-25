import React, { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Sidebar } from './Sidebar';
import { PageEditor } from './PageEditor';
import { GraphView } from './GraphView';
import { useGraphStore } from '../store/graphStore';
import './Layout.css';

interface LayoutProps {
  onOpenAdmin: () => void;
  isAdmin: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ onOpenAdmin, isAdmin }) => {
  const [showGraph, setShowGraph] = useState(false);
  const { activePageId } = useGraphStore();

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="app-layout">
        <Sidebar onOpenAdmin={onOpenAdmin} isAdmin={isAdmin} />
        <main className="main-content">
          {showGraph ? (
            <GraphView onClose={() => setShowGraph(false)} activePageId={activePageId} />
          ) : (
            <PageEditor />
          )}
        </main>
        {/* Graph toggle button */}
        <button
          className="graph-toggle-btn"
          onClick={() => setShowGraph(g => !g)}
          title={showGraph ? 'Close Graph View' : 'Open Graph View'}
        >
          {showGraph ? '📝' : '🕸️'}
        </button>
      </div>
    </DndProvider>
  );
};
