import React, { useState, useRef } from 'react';
import { useGraphStore } from '../store/graphStore';
import { useUIStore } from '../store/uiStore';
import { Search, Download, Layout, BookOpen, ChevronRight, Image, Paperclip } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { PresenceBar } from './PresenceBar';
import './TopBar.css';
import './PresenceBar.css';

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
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const page = activePageId ? pages[activePageId] : null;

  // Build breadcrumb chain
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

  const uploadFile = async (file: File, forceType?: 'image' | 'file') => {
    if (!file || !user || !activePageId) return;
    setUploading(true);
    setUploadProgress(`Uploading ${file.name}...`);

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${user.id}/${activePageId}/${Date.now()}_${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from('attachments')
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(path);

      // Record in attachments table
      await supabase.from('attachments').insert({
        user_id: user.id,
        page_id: activePageId,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: path,
        public_url: publicUrl,
      });

      // Determine block type and content
      const isImage = forceType === 'image' || file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');

      let blockType: 'image' | 'file' | 'text' = 'file';
      let content = '';

      if (isImage) {
        blockType = 'image';
        content = publicUrl;
      } else if (isVideo) {
        blockType = 'file';
        content = `🎬 [${file.name}](${publicUrl})`;
      } else if (isAudio) {
        blockType = 'file';
        content = `🎵 [${file.name}](${publicUrl})`;
      } else {
        blockType = 'file';
        content = `📎 [${file.name}](${publicUrl})`;
      }

      const store = useGraphStore.getState();
      const blockCount = store.pages[activePageId]?.root_blocks.length ?? 0;
      await store.addBlock(activePageId, null, blockCount, content, blockType);

      setUploadProgress(`✓ ${file.name} uploaded`);
      setTimeout(() => setUploadProgress(''), 2500);
    } catch (err: any) {
      console.error('Upload failed:', err);
      const msg = err?.message?.includes('bucket')
        ? 'Create "attachments" bucket in Supabase Storage first, then run the SQL setup script.'
        : err?.message || 'Upload failed';
      setUploadProgress(`⚠ ${msg}`);
      setTimeout(() => setUploadProgress(''), 5000);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file, 'image');
  };

  // Handle paste (images pasted from clipboard)
  React.useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      if (!activePageId) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            await uploadFile(file, 'image');
            break;
          }
        }
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [activePageId, user]);

  return (
    <div className="topbar">
      {/* Breadcrumbs */}
      <div className="topbar-breadcrumb">
        <button className="topbar-home" onClick={() => setCommandPaletteOpen(true)} title="Home / Search">
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

      {/* Upload progress */}
      {uploadProgress && (
        <div className="topbar-upload-status">{uploadProgress}</div>
      )}

      {/* Real-time collaboration */}
      <PresenceBar />

      {/* Actions */}
      <div className="topbar-actions">
        <button className="topbar-btn" onClick={() => setCommandPaletteOpen(true)} title="Search (Ctrl+K)">
          <Search size={14} />
        </button>
        <button className="topbar-btn" onClick={() => setJournalOpen(true)} title="Journal">
          <BookOpen size={14} />
        </button>
        <button className={`topbar-btn ${splitView ? 'active' : ''}`} onClick={onSplitView} title="Split view (edit + preview)">
          <Layout size={14} />
        </button>

        {/* Image upload */}
        <button
          className="topbar-btn"
          onClick={() => imageInputRef.current?.click()}
          title="Upload image (or paste from clipboard)"
          disabled={uploading}
        >
          <Image size={14} className={uploading ? 'spinning' : ''} />
        </button>

        {/* File / document upload */}
        <button
          className="topbar-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Upload file / document"
          disabled={uploading}
        >
          <Paperclip size={14} />
        </button>

        {/* Export */}
        <button className="topbar-btn" onClick={onExport} title="Export as Markdown">
          <Download size={14} />
        </button>

        <input ref={imageInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleImageChange} />
        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.mp3,.mp4,.mov" style={{ display: 'none' }} onChange={handleFileChange} />
      </div>
    </div>
  );
};
