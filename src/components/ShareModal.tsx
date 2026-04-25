import React, { useState } from 'react';
import { X, UserPlus, Globe, Lock, ChevronDown } from 'lucide-react';
import './ShareModal.css';

interface ShareModalProps {
  pageTitle: string;
  onClose: () => void;
}

type ShareRole = 'owner' | 'editor' | 'viewer';

interface Collaborator {
  email: string;
  role: ShareRole;
  avatar?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ pageTitle, onClose }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ShareRole>('viewer');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    { email: 'you@nexus.os', role: 'owner' },
    { email: 'admin@live.com', role: 'editor' },
  ]);

  const handleAdd = () => {
    if (!email.trim()) return;
    setCollaborators([...collaborators, { email, role }]);
    setEmail('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={e => e.stopPropagation()}>
        <div className="share-header">
          <div className="share-header-left">
            <Globe size={18} className="text-muted" />
            <div>
              <h3>Share "{pageTitle}"</h3>
              <p>Manage access and permissions</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="share-input-section">
          <div className="share-field">
            <UserPlus size={16} className="text-muted ml-3" />
            <input 
              type="email" 
              placeholder="Add people by email..." 
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <div className="role-selector">
              <span>{role}</span>
              <ChevronDown size={14} />
              <select value={role} onChange={e => setRole(e.target.value as ShareRole)}>
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
            </div>
            <button className="add-btn" onClick={handleAdd}>Add</button>
          </div>
        </div>

        <div className="collaborators-list">
          <div className="section-label">People with access</div>
          {collaborators.map(c => (
            <div key={c.email} className="collaborator-row">
              <div className="collaborator-info">
                <div className="collaborator-avatar">
                   {c.email[0].toUpperCase()}
                </div>
                <div className="collaborator-details">
                  <div className="collaborator-email">{c.email}</div>
                  <div className="collaborator-subtext">{c.role === 'owner' ? 'Owner' : 'Has access'}</div>
                </div>
              </div>
              <div className="collaborator-role">
                 {c.role === 'owner' ? (
                   <span className="text-muted text-xs">Owner</span>
                 ) : (
                   <div className="role-dropdown-wrap">
                      <span>{c.role}</span>
                      <ChevronDown size={12} />
                   </div>
                 )}
              </div>
            </div>
          ))}
        </div>

        <div className="share-footer">
          <div className="access-info">
             <Lock size={14} className="text-muted" />
             <span>Only people invited can access</span>
          </div>
          <div className="footer-btns">
             <button className="btn-link">Copy link</button>
             <button className="btn-primary" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
};
