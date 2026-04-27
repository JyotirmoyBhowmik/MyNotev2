import { useGraphStore } from '../store/graphStore';
import { Plus, MoreVertical, Trash2, Edit2 } from 'lucide-react';
import './KanbanView.css';

interface KanbanViewProps {
  pageId: string;
}

export const KanbanView: React.FC<KanbanViewProps> = ({ pageId }) => {
  const { pages, blocks, addBlock, updateBlock, deleteBlock } = useGraphStore();
  const page = pages[pageId];
  if (!page) return null;

  const columns = page.root_blocks.map(id => blocks[id]).filter(Boolean);

  const handleAddColumn = async () => {
    const title = prompt('Column Name:');
    if (title) {
      await addBlock(pageId, null, columns.length, title, 'text');
    }
  };

  const handleEditColumn = async (colId: string, current: string) => {
    const title = prompt('Rename Column:', current);
    if (title !== null && title !== current) {
      await updateBlock(colId, title);
    }
  };

  const handleDeleteColumn = async (colId: string) => {
    if (confirm('Delete this column and all its tasks?')) {
      await deleteBlock(colId);
    }
  };

  const handleAddItem = async (columnId: string) => {
    const content = prompt('Task Name:');
    if (content) {
      const column = blocks[columnId];
      await addBlock(pageId, columnId, column.children.length, content, 'text');
    }
  };

  const handleEditItem = async (itemId: string, current: string) => {
    const content = prompt('Edit Task:', current);
    if (content !== null && content !== current) {
      await updateBlock(itemId, content);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (confirm('Delete this task?')) {
      await deleteBlock(itemId);
    }
  };

  return (
    <div className="kanban-container">
      <div className="kanban-board">
        {columns.map(col => (
          <div key={col.uuid} className="kanban-column">
            <div className="kanban-column-header">
              <h3 onClick={() => handleEditColumn(col.uuid, col.content)}>{col.content}</h3>
              <div className="kanban-col-actions">
                <button onClick={() => handleAddItem(col.uuid)} title="Add Task"><Plus size={14} /></button>
                <button onClick={() => handleDeleteColumn(col.uuid)} title="Delete Column"><Trash2 size={14} /></button>
              </div>
            </div>
            
            <div className="kanban-items">
              {col.children.map(itemUuid => {
                const item = blocks[itemUuid];
                if (!item) return null;
                return (
                  <div key={item.uuid} className="kanban-item group">
                    <div className="kanban-item-content" onClick={() => handleEditItem(item.uuid, item.content)}>
                      {item.content}
                    </div>
                    <div className="kanban-item-actions">
                      <button onClick={() => handleEditItem(item.uuid, item.content)}><Edit2 size={12} /></button>
                      <button onClick={() => handleDeleteItem(item.uuid)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                );
              })}
              <button className="kanban-add-item-inline" onClick={() => handleAddItem(col.uuid)}>
                + Add Item
              </button>
            </div>
          </div>
        ))}
        
        <div className="kanban-column add-column-placeholder" onClick={handleAddColumn}>
          <Plus size={20} />
          <span>Add Column</span>
        </div>
      </div>
    </div>
  );
};
