import React from 'react';
import { useGraphStore } from '../store/graphStore';
import { Plus, Trash2 } from 'lucide-react';
import { useDrag, useDrop } from 'react-dnd';
import './PageKanban.css';

interface KanbanViewProps {
  pageId: string;
}

export const PageKanban: React.FC<KanbanViewProps> = ({ pageId }) => {
  const { pages, blocks, addBlock } = useGraphStore();
  const page = pages[pageId];
  if (!page) return null;

  const columns = page.root_blocks.map(id => blocks[id]).filter(Boolean);

  const handleAddColumn = async () => {
    const title = prompt('Column Name:');
    if (title) {
      await addBlock(pageId, null, columns.length, title, 'text');
    }
  };

  return (
    <div className="kanban-container">
      <div className="kanban-board">
        {columns.map((col) => (
          <KanbanColumn 
            key={col.uuid} 
            column={col} 
            pageId={pageId} 
          />
        ))}
        
        <div className="kanban-column add-column-placeholder" onClick={handleAddColumn}>
          <Plus size={20} />
          <span>Add Column</span>
        </div>
      </div>
    </div>
  );
};

const KanbanColumn: React.FC<{ column: any; pageId: string }> = ({ column, pageId }) => {
  const { addBlock, updateBlock, deleteBlock, moveBlock } = useGraphStore();
  
  const [, drop] = useDrop({
    accept: 'KANBAN_ITEM',
    drop: (item: { id: string; sourceColId: string }) => {
      if (item.sourceColId !== column.uuid) {
        moveBlock(item.id, column.uuid, column.children.length);
      }
    },
  });

  const handleAddItem = async () => {
    const content = prompt('Task Name:');
    if (content) {
      await addBlock(pageId, column.uuid, column.children.length, content, 'text');
    }
  };

  return (
    <div ref={drop as any} className="kanban-column">
      <div className="kanban-column-header">
        <h3 onClick={() => {
          const t = prompt('Rename Column:', column.content);
          if (t) updateBlock(column.uuid, t);
        }}>{column.content}</h3>
        <div className="kanban-col-actions">
          <button onClick={handleAddItem} title="Add Task"><Plus size={14} /></button>
          <button onClick={() => confirm('Delete column?') && deleteBlock(column.uuid)} title="Delete Column"><Trash2 size={14} /></button>
        </div>
      </div>
      
      <div className="kanban-items">
        {column.children.map((itemUuid: string) => (
          <KanbanItem 
            key={itemUuid} 
            itemId={itemUuid} 
            colId={column.uuid} 
          />
        ))}
        <button className="kanban-add-item-inline" onClick={handleAddItem}>
          + Add Item
        </button>
      </div>
    </div>
  );
};

const KanbanItem: React.FC<{ itemId: string; colId: string }> = ({ itemId, colId }) => {
  const { blocks, updateBlock, deleteBlock } = useGraphStore();
  const item = blocks[itemId];
  if (!item) return null;

  const [{ isDragging }, drag] = useDrag({
    type: 'KANBAN_ITEM',
    item: { id: itemId, sourceColId: colId },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  return (
    <div 
      ref={drag as any} 
      className={`kanban-item group ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="kanban-item-content" onClick={() => {
        const c = prompt('Edit Task:', item.content);
        if (c) updateBlock(item.uuid, c);
      }}>
        {item.content}
      </div>
      <div className="kanban-item-actions">
        <button onClick={() => confirm('Delete task?') && deleteBlock(item.uuid)}><Trash2 size={12} /></button>
      </div>
    </div>
  );
};
