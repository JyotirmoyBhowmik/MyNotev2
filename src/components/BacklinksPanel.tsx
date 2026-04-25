import React from 'react';
import { useLinkStore } from '../store/linkStore';
import { useGraphStore } from '../store/graphStore';
import { Link, FileText } from 'lucide-react';
import './BacklinksPanel.css';

interface BacklinksPanelProps {
  pageId: string;
}

export const BacklinksPanel: React.FC<BacklinksPanelProps> = ({ pageId }) => {
  const { backlinks } = useLinkStore();
  const { setActivePage, pages } = useGraphStore();
  const links = backlinks[pageId] || [];

  const grouped: Record<string, typeof links> = {};
  links.forEach(l => {
    if (!grouped[l.pageId]) grouped[l.pageId] = [];
    grouped[l.pageId].push(l);
  });

  return (
    <div className="backlinks-panel">
      <div className="backlinks-header">
        <Link size={14} />
        <span>Linked References</span>
        <span className="backlinks-count">{links.length}</span>
      </div>

      {links.length === 0 ? (
        <div className="backlinks-empty">
          <p>No pages link to this page yet.</p>
          <p className="backlinks-hint">Use <code>[[{pages[pageId]?.title}]]</code> in any block to create a link here.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([pid, entries]) => (
          <div key={pid} className="backlinks-group">
            <div className="backlinks-page" onClick={() => setActivePage(pid)}>
              <FileText size={13} />
              <span>{entries[0].pageTitle}</span>
            </div>
            {entries.map(entry => (
              <div key={entry.blockUuid} className="backlinks-block" onClick={() => setActivePage(pid)}>
                <span dangerouslySetInnerHTML={{ __html: highlightLink(entry.blockContent, pages[pageId]?.title) }} />
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
};

function highlightLink(content: string, title?: string): string {
  if (!title) return content;
  const safe = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return content.replace(new RegExp(`\\[\\[${safe}\\]\\]`, 'gi'), `<mark>[[${title}]]</mark>`);
}
