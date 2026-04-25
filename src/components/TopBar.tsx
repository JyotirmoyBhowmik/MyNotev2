import React, { useState, useRef } from 'react';
import { useGraphStore } from '../store/graphStore';
import { useUIStore } from '../store/uiStore';
import { Search, Upload, Download, Layout, BookOpen, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import './TopBar.css';

interface TopBarProps {
  onExport: () => void;
  onSplitView: () => void;
  splitView: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ onExport, onSplitView, splitView }) => {
  const { pages, activePageId, setActivePage } = useGraphStore();
  const { setCommandPaletteOpen, setJournalOpen } = useUIStore();
  const { user } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const page = activePageId ? pages[activePageId] : null;

  // Build breadcrumb: parent pages chain
  const buildBreadcrumb = (): { id: string; title: string }[] => {
    if (!page) return [];
    const crumbs: { id: string; title: string }[] = [];
    let current = page;
    while (current?.parent_page_id) {
      const parent = pages[current.parent_page_id];
      if (!parent) break;
      crumbs.unshift({ id: parent.id, title: parent.title });
      current = parent;
    }
    crumbs.push({ id: page.id, title: page.title });
    return crumbs;
  };

  const breadcrumbs = buildBreadcrumb();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activePageId) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${activePageId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('attachments').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(path);

      // Insert attachment record
      await supabase.from('attachments').insert({
        user_id: user.id,
        page_id: activePageId,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: path,
        public_url: publicUrl,
      });

      // Add an image/file block to the page
      const store = useGraphStore.getState();
      const isImage = file.type.startsWith('image/');
      const content = isImage ? `![${file.name}](${publicUrl})` : `[📎 ${file.name}](${publicUrl})`;
      const blockCount = store.pages[activePageId]?.root_blocks.length ?? 0;
      await store.addBlock(activePageId, null, blockCount, content, 'text');
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed. Make sure the "attachments" storage bucket exists in Supabase.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="topbar">
      {/* Breadcrumbs */}
      <div className="topbar-breadcrumb">
        <button className="topbar-home" onClick={() => setCommandPaletteOpen(true)}>
          🧠
        </button>
        {breadcrumbs.map((crumb, i) => (
          <React.Fragment key={crumb.id}>
            <ChevronRight size={12} className="topbar-sep" />
            <button
              className={`topbar-crumb ${i === breadcrumbs.length - 1 ? 'active' : ''}`}
              onClick={() => setActivePage(crumb.id)}
            >
              {crumb.title}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Actions */}
      <div className="topbar-actions">
        <button className="topbar-btn" onClick={() => setCommandPaletteOpen(true)} title="Search (Ctrl+K)">
          <Search size={14} />
        </button>
        <button className="topbar-btn" onClick={() => setJournalOpen(true)} title="Journal">
          <BookOpen size={14} />
        </button>
        <button className={`topbar-btn ${splitView ? 'active' : ''}`} onClick={onSplitView} title="Split view">
          <Layout size={14} />
        </button>
        <button className="topbar-btn" onClick={() => fileInputRef.current?.click()} title="Upload file" disabled={uploading}>
          <Upload size={14} className={uploading ? 'spinning' : ''} />
        </button>
        <button className="topbar-btn" onClick={onExport} title="Export as Markdown">
          <Download size={14} />
        </button>
        <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
      </div>
    </div>
  );
};
