import React from 'react';
import { type Block } from '../../store/graphStore';
import { Plus, MoreHorizontal } from 'lucide-react';
import './DatabaseKanban.css';

interface KanbanViewProps {
  records: Block[];
  schema: any;
  onAddRecord: () => void;
  onPropertyChange?: (recordId: string, propId: string, value: any) => void;
}

export const DatabaseKanban: React.FC<KanbanViewProps> = ({ 
  records, 
  schema, 
  onAddRecord,
}) => {

  // Find the first select column to group by
  const groupColumn = schema.columns.find((c: any) => c.type === 'select');
  const options = groupColumn?.options || ['No Status'];

  const columns = options.map((opt: string) => ({
    id: opt,
    title: opt,
    items: records.filter(r => (r.properties[groupColumn?.id] || 'No Status') === opt)
  }));

  if (!groupColumn) {
    return (
      <div className="p-8 text-center text-muted">
        Add a Select property to enable Kanban view.
      </div>
    );
  }

  return (
    <div className="kanban-container">
      {columns.map((col: any) => (
        <div key={col.id} className="kanban-column">
          <div className="kanban-column-header">
            <div className="kanban-column-title">
               <span className="kanban-badge">{col.items.length}</span>
               {col.title}
            </div>
            <button className="p-1 hover:bg-white/5 rounded"><Plus size={14} /></button>
          </div>
          
          <div className="kanban-items">
            {col.items.map((record: Block) => (
              <div key={record.uuid} className="kanban-card">
                <div className="kanban-card-title">{record.content}</div>
                {schema.columns.filter((c: any) => c.type !== 'text' && c.id !== groupColumn.id).map((c: any) => (
                  <div key={c.id} className="kanban-card-prop">
                    <span className="text-xs text-muted">{c.name}: </span>
                    <span className="text-xs">{record.properties[c.id] || 'None'}</span>
                  </div>
                ))}
                <div className="kanban-card-footer">
                   <span className="text-[10px] text-muted">{new Date(record.created_at).toLocaleDateString()}</span>
                   <MoreHorizontal size={12} className="text-muted cursor-pointer hover:text-white" />
                </div>
              </div>
            ))}
            <button className="kanban-add-card" onClick={onAddRecord}>
              <Plus size={14} /> Add card
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
