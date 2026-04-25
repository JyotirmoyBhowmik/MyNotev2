import React, { useState, useMemo } from 'react';
import { useGraphStore } from '../../store/graphStore';
import { 
  Table as TableIcon, 
  LayoutDashboard, 
  Plus, 
  Search, 
  Filter, 
  ArrowUpDown,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '../../lib/utils';
import './DatabaseView.css';

interface DatabaseViewProps {
  blockId: string;
}

type ViewType = 'table' | 'kanban' | 'gallery';

export const DatabaseView: React.FC<DatabaseViewProps> = ({ blockId }) => {
  const { blocks, addBlock, updateBlock } = useGraphStore();
  const dbBlock = blocks[blockId];
  const [view, setView] = useState<ViewType>('table');
  const [searchQuery, setSearchQuery] = useState('');

  // The records are the children of the database block
  const records = useMemo(() => {
    if (!dbBlock) return [];
    return dbBlock.children
      .map(id => blocks[id])
      .filter(Boolean)
      .filter(b => b.content.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [dbBlock, blocks, searchQuery]);

  // For now, let's define some hardcoded columns (Property System will come next)
  const columns = [
    { key: 'content', label: 'Name', type: 'text' },
    { key: 'status', label: 'Status', type: 'select' },
    { key: 'created_at', label: 'Created', type: 'date' },
  ];

  const handleAddRecord = async () => {
    await addBlock(dbBlock.page_id, blockId, dbBlock.children.length, 'New Record');
  };

  if (!dbBlock) return null;

  return (
    <div className="database-view">
      {/* DB Header/Controls */}
      <div className="database-controls">
        <div className="db-tabs">
          <button 
            className={cn("db-tab", view === 'table' && "active")} 
            onClick={() => setView('table')}
          >
            <TableIcon size={14} /> Table
          </button>
          <button 
            className={cn("db-tab", view === 'kanban' && "active")} 
            onClick={() => setView('kanban')}
          >
            <LayoutDashboard size={14} /> Board
          </button>
        </div>

        <div className="db-actions">
          <div className="db-search">
            <Search size={14} />
            <input 
              type="text" 
              placeholder="Filter records..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="db-btn-ghost"><Filter size={14} /> Filter</button>
          <button className="db-btn-ghost"><ArrowUpDown size={14} /> Sort</button>
          <button className="db-btn-primary" onClick={handleAddRecord}>
            <Plus size={14} /> New
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="database-content">
        {view === 'table' ? (
          <div className="table-wrapper">
             <table className="db-table">
               <thead>
                 <tr>
                   <th className="w-8"></th>
                   {columns.map(col => (
                     <th key={col.key}>{col.label}</th>
                   ))}
                   <th className="w-10"></th>
                 </tr>
               </thead>
               <tbody>
                 {records.map(record => (
                   <tr key={record.uuid}>
                     <td className="record-drag">⠿</td>
                     <td className="record-cell-primary">
                       <input 
                         type="text" 
                         value={record.content}
                         onChange={(e) => updateBlock(record.uuid, e.target.value)}
                         className="cell-input"
                       />
                     </td>
                     <td>
                        <span className="badge">To Do</span>
                     </td>
                     <td className="text-muted text-xs">
                       {new Date(record.created_at).toLocaleDateString()}
                     </td>
                     <td>
                       <button className="p-1 hover:bg-white/5 rounded"><MoreHorizontal size={14} /></button>
                     </td>
                   </tr>
                 ))}
                 <tr className="add-row-tr" onClick={handleAddRecord}>
                    <td colSpan={5}>
                       <div className="add-row-hint"><Plus size={14} /> New Record</div>
                    </td>
                 </tr>
               </tbody>
             </table>
          </div>
        ) : (
          <div className="kanban-view p-8 text-center text-muted">
             Kanban view implementation in progress...
          </div>
        )}
      </div>
    </div>
  );
};
