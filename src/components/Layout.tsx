import React from 'react';
import { Sidebar } from './Sidebar';
import { PageEditor } from './PageEditor';
import './Layout.css';

interface LayoutProps {
  onOpenAdmin: () => void;
  isAdmin: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ onOpenAdmin, isAdmin }) => {
  return (
    <div className="app-layout">
      <Sidebar onOpenAdmin={onOpenAdmin} isAdmin={isAdmin} />
      <main className="main-content">
        <PageEditor />
      </main>
    </div>
  );
};
