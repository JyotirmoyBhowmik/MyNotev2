import React from 'react';
import { Sidebar } from './Sidebar';
import { PageEditor } from './PageEditor';
import './Layout.css';

export const Layout: React.FC = () => {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <PageEditor />
      </main>
    </div>
  );
};
