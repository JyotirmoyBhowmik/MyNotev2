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
import { DatabaseKanban as KanbanView } from './DatabaseKanban';
import './DatabaseView.css';

interface DatabaseViewProps {
  blockId: string;
}

type ViewType = 'table' | 'kanban' | 'gallery';

export const DatabaseView: React.FC<DatabaseViewProps> = ({ blockId }) => {
  const { blocks, addBlock, updateBlock, updateBlockProperties } = useGraphStore();
  const dbBlock = blocks[blockId];
  const [view, setView] = useState<ViewType>('table');
  const [searchQuery, setSearchQuery] = useState('');

  // Schema definition from block properties
  const schema = useMemo(() => {
    const defaultSchema = {
      columns: [
        { id: 'content', name: 'Name', type: 'text' },
        { id: 'status', name: 'Status', type: 'select', options: ['To Do', 'In Progress', 'Done'] },
        { id: 'created_at', name: 'Created', type: 'date' },
      ]
    };
    return dbBlock?.properties?.schema || defaultSchema;
  }, [dbBlock]);

  // The records are the children of the database block
  const records = useMemo(() => {
    if (!dbBlock) return [];
    return dbBlock.children
      .map(id => blocks[id])
      .filter(Boolean)
      .filter(b => b.content.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [dbBlock, blocks, searchQuery]);

  const handleAddRecord = async () => {
    await addBlock(dbBlock.page_id, blockId, dbBlock.children.length, 'New Record');
  };

  const handlePropertyChange = async (recordId: string, propId: string, value: any) => {
    if (propId === 'content') {
      await updateBlock(recordId, value);
    } else {
      await updateBlockProperties(recordId, { [propId]: value });
    }
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
                   {schema.columns.map((col: any) => (
                     <th key={col.id}>{col.name}</th>
                   ))}
                   <th className="w-10"></th>
                 </tr>
               </thead>
               <tbody>
                 {records.map(record => (
                   <tr key={record.uuid}>
                     <td className="record-drag">⠿</td>
                     {schema.columns.map((col: any) => (
                       <td key={col.id}>
                         {col.type === 'select' ? (
                           <select 
                             className="cell-select"
                             value={record.properties[col.id] || ''}
                             onChange={(e) => handlePropertyChange(record.uuid, col.id, e.target.value)}
                           >
                             <option value="">Empty</option>
                             {col.options?.map((opt: string) => (
                               <option key={opt} value={opt}>{opt}</option>
                             ))}
                           </select>
                         ) : col.id === 'content' ? (
                           <input 
                             type="text" 
                             value={record.content}
                             onChange={(e) => handlePropertyChange(record.uuid, 'content', e.target.value)}
                             className="cell-input"
                           />
                         ) : col.type === 'date' ? (
                           <div className="cell-date">
                             {new Date(record.created_at).toLocaleDateString()}
                           </div>
                         ) : (
                           <input 
                             type="text" 
                             value={record.properties[col.id] || ''}
                             onChange={(e) => handlePropertyChange(record.uuid, col.id, e.target.value)}
                             className="cell-input"
                           />
                         )}
                       </td>
                     ))}
                     <td>
                       <button className="p-1 hover:bg-white/5 rounded"><MoreHorizontal size={14} /></button>
                     </td>
                   </tr>
                 ))}
                 <tr className="add-row-tr" onClick={handleAddRecord}>
                    <td colSpan={schema.columns.length + 2}>
                       <div className="add-row-hint"><Plus size={14} /> New Record</div>
                    </td>
                 </tr>
               </tbody>
             </table>
          </div>
        ) : (
          <KanbanView 
            records={records} 
            schema={schema} 
            onAddRecord={handleAddRecord}
          />
        )}
      </div>
    </div>
  );
};
