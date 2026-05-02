import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { File, Image, Video, FileAudio, Download, Trash2, ExternalLink } from 'lucide-react';

interface Attachment {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  public_url: string;
  created_at: string;
}

export const AttachmentsPanel: React.FC<{ pageId: string }> = ({ pageId }) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pageId) return;

    const fetchAttachments = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('page_id', pageId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAttachments(data);
      }
      setLoading(false);
    };

    fetchAttachments();

    // Subscribe to real-time attachment changes
    const channel = supabase
      .channel(`attachments-${pageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attachments',
          filter: `page_id=eq.${pageId}`,
        },
        () => {
          fetchAttachments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pageId]);

  const deleteAttachment = async (id: string, path: string) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;
    
    // Attempt to delete from storage if possible, though we might not have the path here if not queried
    if (path) {
      await supabase.storage.from('attachments').remove([path]);
    }
    
    await supabase.from('attachments').delete().eq('id', id);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getIcon = (mime: string) => {
    if (mime.startsWith('image/')) return <Image size={14} className="text-blue-400" />;
    if (mime.startsWith('video/')) return <Video size={14} className="text-purple-400" />;
    if (mime.startsWith('audio/')) return <FileAudio size={14} className="text-orange-400" />;
    return <File size={14} className="text-gray-400" />;
  };

  if (loading) {
    return <div className="p-3 text-center text-[10px] text-[var(--text-secondary)]">Loading attachments...</div>;
  }

  if (attachments.length === 0) {
    return <div className="p-3 text-center text-[10px] text-[var(--text-secondary)] italic border-t border-[var(--glass-border)]">No attachments uploaded to this page yet.</div>;
  }

  return (
    <div className="flex flex-col border-t border-[var(--glass-border)]">
      {attachments.map(att => (
        <div key={att.id} className="group flex items-center justify-between gap-2 p-2 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex-shrink-0 bg-white/10 p-1.5 rounded">
              {getIcon(att.mime_type)}
            </div>
            <div className="flex flex-col overflow-hidden">
              <a 
                href={att.public_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-[var(--text-primary)] truncate hover:text-[var(--electric-blue)] hover:underline"
              >
                {att.file_name}
              </a>
              <span className="text-[9px] text-[var(--text-secondary)]">
                {formatSize(att.file_size)} • {new Date(att.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <a 
              href={att.public_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-1 text-[var(--text-secondary)] hover:text-white rounded bg-white/5 hover:bg-white/10"
              title="Open"
            >
              <ExternalLink size={12} />
            </a>
            <a 
              href={att.public_url} 
              download={att.file_name}
              className="p-1 text-[var(--text-secondary)] hover:text-white rounded bg-white/5 hover:bg-white/10"
              title="Download"
            >
              <Download size={12} />
            </a>
            <button 
              onClick={() => deleteAttachment(att.id, (att as any).storage_path)}
              className="p-1 text-[var(--text-secondary)] hover:text-red-400 rounded bg-white/5 hover:bg-red-500/20"
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
