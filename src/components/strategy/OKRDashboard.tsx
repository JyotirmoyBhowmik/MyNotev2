import React from 'react';
import { useGraphStore } from '../../store/graphStore';
import { Target, TrendingUp, Plus, ChevronRight, AlertCircle } from 'lucide-react';
import './OKRDashboard.css';

export const OKRDashboard: React.FC = () => {
  const { pages } = useGraphStore();

  // For now, let's look for pages tagged with #OKR or named "OKR"
  const okrPages = Object.values(pages).filter(p => 
    p.title.toLowerCase().includes('okr') || p.tags.includes('OKR')
  );

  const stats = {
    total: okrPages.length,
    onTrack: okrPages.length, // Simplified logic
    atRisk: 0,
    completed: 0,
  };

  return (
    <div className="okr-dashboard">
      <div className="okr-header">
        <div className="okr-title">
          <Target className="text-accent" size={24} />
          <h1>Strategic Objectives (OKRs)</h1>
        </div>
        <div className="okr-actions">
           <button className="okr-btn-primary"><Plus size={16} /> New Objective</button>
        </div>
      </div>

      <div className="okr-stats-grid">
        <div className="okr-stat-card">
          <div className="stat-label">Objectives</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-footer text-green flex items-center gap-1">
            <TrendingUp size={12} /> +12% from last quarter
          </div>
        </div>
        <div className="okr-stat-card">
          <div className="stat-label">On Track</div>
          <div className="stat-value text-green">{stats.onTrack}</div>
        </div>
        <div className="okr-stat-card">
          <div className="stat-label">At Risk</div>
          <div className="stat-value text-red">{stats.atRisk}</div>
        </div>
        <div className="okr-stat-card">
          <div className="stat-label">Avg. Completion</div>
          <div className="stat-value text-accent">68%</div>
        </div>
      </div>

      <div className="okr-list">
        <div className="okr-list-header">
           <div className="col-obj">Objective</div>
           <div className="col-progress">Progress</div>
           <div className="col-status">Status</div>
           <div className="col-owner">Owner</div>
        </div>
        
        {okrPages.length === 0 ? (
          <div className="okr-empty">
             <AlertCircle size={32} className="text-muted mb-2" />
             <p>No active objectives found. Tag a page with #OKR to track it here.</p>
          </div>
        ) : (
          okrPages.map(page => (
            <div key={page.id} className="okr-row">
              <div className="col-obj">
                <div className="obj-title">
                   <ChevronRight size={14} className="text-muted" />
                   {page.title}
                </div>
              </div>
              <div className="col-progress">
                <div className="progress-bar-wrap">
                   <div className="progress-bar-fill" style={{ width: '45%' }}></div>
                   <span className="progress-text">45%</span>
                </div>
              </div>
              <div className="col-status">
                <span className="okr-status-badge on-track">On Track</span>
              </div>
              <div className="col-owner">
                <div className="owner-avatar">JD</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
