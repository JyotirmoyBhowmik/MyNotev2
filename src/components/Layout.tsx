import React, { memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../store/uiStore';
import { useResizable } from '../hooks/useResizable';
import { Sidebar } from './Sidebar';
import { Inspector } from './Inspector';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = memo(({ children }) => {
  const { 
    isSidebarOpen, 
    isInspectorOpen, 
    isFocusMode, 
    sidebarWidth, 
    setSidebarWidth,
    toggleInspector 
  } = useUIStore();

  const { width, startResizing } = useResizable({
    initialWidth: sidebarWidth,
    minWidth: 200,
    maxWidth: 450,
    onWidthChange: setSidebarWidth,
  });

  // Handle Cmd+\ shortcut for Inspector
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        toggleInspector();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleInspector]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--obsidian-bg)] text-[var(--text-primary)]">
      {/* Left Sidebar (Navigation Matrix) */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isSidebarOpen && !isFocusMode ? width : 0,
          x: isFocusMode ? -width : 0,
          opacity: isSidebarOpen && !isFocusMode ? 1 : 0
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative h-full overflow-hidden border-r border-[var(--glass-border)] glass-blur"
      >
        <Sidebar />
        
        {/* Resizable Handle */}
        <div
          onMouseDown={startResizing}
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize transition-colors hover:bg-[var(--electric-blue)]"
        />
      </motion.aside>

      {/* Center Panel (Creative Canvas) */}
      <main 
        className="relative flex-1 overflow-y-auto scroll-smooth focus:outline-none"
        style={{ scrollSnapType: 'y proximity' }}
      >
        <div className="mx-auto h-full w-full max-w-[1024px] px-6 py-12 md:px-12">
          <div className="mx-auto w-full max-w-[768px]">
            {children}
          </div>
        </div>
      </main>

      {/* Right Sidebar (Inspector) */}
      <AnimatePresence>
        {isInspectorOpen && !isFocusMode && (
          <motion.aside
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="h-full w-80 border-l border-[var(--glass-border)] glass-blur overflow-hidden"
          >
            <Inspector />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Safe Area Insets (Mobile) */}
      <div className="fixed top-0 left-0 w-full h-[env(safe-area-inset-top)] bg-transparent pointer-events-none" />
    </div>
  );
});

Layout.displayName = 'Layout';
