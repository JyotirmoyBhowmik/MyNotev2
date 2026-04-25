import React, { useState } from 'react';
import { useGraphStore } from '../store/graphStore';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { Plus, X, BookMarked } from 'lucide-react';
import './TemplateModal.css';

interface Template {
  id: string;
  name: string;
  description: string;
  blocks: { content: string; block_type: string }[];
}

interface TemplateModalProps {
  onClose: () => void;
  pageId: string;
}

const BUILT_IN_TEMPLATES: Template[] = [
  {
    id: 'meeting', name: 'Meeting Notes', description: 'Standard meeting template',
    blocks: [
      { content: '# Meeting Notes', block_type: 'heading1' },
      { content: '**Date:** ' + new Date().toLocaleDateString(), block_type: 'text' },
      { content: '**Attendees:**', block_type: 'heading2' },
      { content: '', block_type: 'bullet' },
      { content: '**Agenda:**', block_type: 'heading2' },
      { content: '', block_type: 'numbered' },
      { content: '**Action Items:**', block_type: 'heading2' },
      { content: '', block_type: 'bullet' },
      { content: '**Notes:**', block_type: 'heading2' },
      { content: '', block_type: 'text' },
    ]
  },
  {
    id: 'daily', name: 'Daily Journal', description: 'Daily reflection template',
    blocks: [
      { content: '## 🌅 Morning', block_type: 'heading2' },
      { content: '**Grateful for:**', block_type: 'text' },
      { content: '', block_type: 'bullet' },
      { content: '**Intentions:**', block_type: 'text' },
      { content: '', block_type: 'bullet' },
      { content: '## ☀️ Day Log', block_type: 'heading2' },
      { content: '', block_type: 'text' },
      { content: '## 🌙 Evening Review', block_type: 'heading2' },
      { content: '**What went well:**', block_type: 'text' },
      { content: '', block_type: 'bullet' },
      { content: '**What to improve:**', block_type: 'text' },
      { content: '', block_type: 'bullet' },
    ]
  },
  {
    id: 'project', name: 'Project Plan', description: 'Project planning template',
    blocks: [
      { content: '## 🎯 Goal', block_type: 'heading2' },
      { content: '', block_type: 'text' },
      { content: '## 📋 Tasks', block_type: 'heading2' },
      { content: '', block_type: 'numbered' },
      { content: '## 🚀 Milestones', block_type: 'heading2' },
      { content: '', block_type: 'bullet' },
      { content: '## ⚠️ Risks', block_type: 'callout' },
      { content: '## 📝 Notes', block_type: 'heading2' },
      { content: '', block_type: 'text' },
    ]
  },
  {
    id: 'research', name: 'Research Notes', description: 'Research and learning template',
    blocks: [
      { content: '## 📖 Source', block_type: 'heading2' },
      { content: '', block_type: 'text' },
      { content: '## 💡 Key Insights', block_type: 'heading2' },
      { content: '', block_type: 'bullet' },
      { content: '## ❓ Questions', block_type: 'heading2' },
      { content: '', block_type: 'bullet' },
      { content: '## 🔗 Related', block_type: 'heading2' },
      { content: '', block_type: 'text' },
    ]
  },
  {
    id: 'blank', name: 'Blank', description: 'Start from scratch',
    blocks: [{ content: '', block_type: 'text' }]
  },
];

export const TemplateModal: React.FC<TemplateModalProps> = ({ onClose, pageId }) => {
  const { addBlock, blocks: allBlocks, pages } = useGraphStore();
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState('');

  const applyTemplate = async (template: Template) => {
    setApplying(template.id);
    const page = pages[pageId];
    if (!page) return;
    const startIdx = page.root_blocks.length;
    for (let i = 0; i < template.blocks.length; i++) {
      const b = template.blocks[i];
      await addBlock(pageId, null, startIdx + i, b.content, b.block_type as any);
    }
    setApplying('');
    onClose();
  };

  const saveCurrentAsTemplate = async () => {
    const name = prompt('Template name:');
    if (!name || !user) return;
    const page = pages[pageId];
    if (!page) return;
    setSaving(true);
    const templateBlocks = page.root_blocks
      .map(id => allBlocks[id])
      .filter(Boolean)
      .map(b => ({ content: b.content, block_type: b.block_type }));

    await supabase.from('templates').insert({
      user_id: user.id,
      name,
      description: 'Custom template',
      blocks: templateBlocks,
    });
    setSaving(false);
    alert('Template saved!');
  };

  return (
    <div className="template-overlay" onClick={onClose}>
      <div className="template-modal" onClick={e => e.stopPropagation()}>
        <div className="template-header">
          <div className="template-header-left">
            <BookMarked size={16} />
            <span>Templates</span>
          </div>
          <button className="template-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="template-grid">
          {BUILT_IN_TEMPLATES.map(t => (
            <div key={t.id} className="template-card" onClick={() => applyTemplate(t)}>
              <div className="template-card-icon">
                {t.id === 'meeting' ? '📋' : t.id === 'daily' ? '📓' : t.id === 'project' ? '🚀' : t.id === 'research' ? '🔬' : '📄'}
              </div>
              <div className="template-card-body">
                <div className="template-card-name">{t.name}</div>
                <div className="template-card-desc">{t.description}</div>
              </div>
              {applying === t.id && <div className="template-applying">Applying...</div>}
            </div>
          ))}
        </div>

        <div className="template-footer">
          <button className="template-save-btn" onClick={saveCurrentAsTemplate} disabled={saving}>
            <Plus size={14} />
            {saving ? 'Saving...' : 'Save current page as template'}
          </button>
        </div>
      </div>
    </div>
  );
};
