import { useGraphStore } from '../store/graphStore';
import { Plus, MoreVertical } from 'lucide-react';
import './KanbanView.css';

interface KanbanViewProps {
  pageId: string;
}

export const KanbanView: React.FC<KanbanViewProps> = ({ pageId }) => {
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

  const handleAddItem = async (columnId: string) => {
    const content = prompt('Task Name:');
    if (content) {
      const column = blocks[columnId];
      await addBlock(pageId, columnId, column.children.length, content, 'text');
    }
  };

  return (
    <div className="kanban-container">
      <div className="kanban-header">
        <h1>{page.title}</h1>
        <button className="kanban-add-col" onClick={handleAddColumn}>
          <Plus size={16} /> Add Column
        </button>
      </div>

      <div className="kanban-board">
        {columns.map(col => (
          <div key={col.uuid} className="kanban-column">
            <div className="kanban-column-header">
              <h3>{col.content}</h3>
              <div className="flex gap-1">
                <button onClick={() => handleAddItem(col.uuid)}><Plus size={14} /></button>
                <button><MoreVertical size={14} /></button>
              </div>
            </div>
            
            <div className="kanban-items">
              {col.children.map(itemUuid => {
                const item = blocks[itemUuid];
                if (!item) return null;
                return (
                  <div key={item.uuid} className="kanban-item">
                    <div className="kanban-item-content">{item.content}</div>
                  </div>
                );
              })}
              <button className="kanban-add-item-inline" onClick={() => handleAddItem(col.uuid)}>
                + Add Item
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
