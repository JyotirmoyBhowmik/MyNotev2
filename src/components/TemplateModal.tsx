import React from 'react';
import { TEMPLATES } from '../lib/templates';
import { X, Layout } from 'lucide-react';
import './TemplateModal.css';

interface TemplateModalProps {
  onClose: () => void;
  onApply: (content: string) => void;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({ onClose, onApply }) => {
  return (
    <div className="template-overlay" onClick={onClose}>
      <div className="template-modal" onClick={e => e.stopPropagation()}>
        <div className="template-header">
          <div className="flex items-center gap-2">
            <Layout size={20} className="text-accent" />
            <h2>Template Gallery</h2>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="template-grid">
          {TEMPLATES.map(t => (
            <div key={t.id} className="template-card" onClick={() => onApply(t.content)}>
              <div className="template-card-icon">{t.icon}</div>
              <div className="template-card-info">
                <h3>{t.name}</h3>
                <p>{t.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
