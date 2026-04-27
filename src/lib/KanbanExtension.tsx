import React, { useState } from 'react';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Trash2, GripVertical, Layout } from 'lucide-react';

// ─── TYPES ─────────────────────────────────────────────────────────────────
interface Card {
  id: string;
  content: string;
  priority: 'low' | 'med' | 'high';
}

interface Column {
  id: string;
  title: string;
  cardIds: string[];
}

interface BoardData {
  columns: Column[];
  cards: Record<string, Card>;
}

// ─── UTILS ─────────────────────────────────────────────────────────────────
const generateId = () => `id-${Math.random().toString(36).substr(2, 9)}`;

// ─── COMPONENTS ────────────────────────────────────────────────────────────

const SortableCard = ({ card, onDelete, onEdit }: { card: Card; onDelete: () => void; onEdit: (val: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', card }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityColors = {
    low: 'bg-green-500/20 text-green-500',
    med: 'bg-yellow-500/20 text-yellow-500',
    high: 'bg-red-500/20 text-red-500',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="group relative flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-3 shadow-sm hover:border-blue-500/50"
    >
      <div className="flex items-start justify-between">
        <div {...attributes} {...listeners} className="cursor-grab text-white/20 hover:text-white/40">
          <GripVertical size={14} />
        </div>
        <div className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${priorityColors[card.priority]}`}>
          {card.priority}
        </div>
      </div>
      
      <div 
        className="min-h-[1em] text-sm text-white/80 outline-none"
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => onEdit(e.currentTarget.innerText)}
      >
        {card.content}
      </div>

      <button 
        onClick={onDelete}
        className="absolute bottom-2 right-2 text-white/0 hover:text-red-400 group-hover:text-white/20"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
};

const SortableColumn = ({ column, cards, onAddCard, onUpdateColumn, onDeleteColumn, onUpdateCard, onDeleteCard }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: 'column', column }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="flex h-fit min-h-[150px] w-72 min-w-[280px] flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md"
    >
      <div className="flex items-center justify-between">
        <div {...attributes} {...listeners} className="cursor-grab font-bold text-white/60 hover:text-white">
          <h3 
            className="outline-none"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => onUpdateColumn({ ...column, title: e.currentTarget.innerText })}
          >{column.title}</h3>
        </div>
        <button onClick={onDeleteColumn} className="text-white/20 hover:text-red-400">
          <Trash2 size={14} />
        </button>
      </div>

      <SortableContext items={column.cardIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3">
          {column.cardIds.map((cid: string) => (
            <SortableCard 
              key={cid} 
              card={cards[cid]} 
              onDelete={() => onDeleteCard(cid)}
              onEdit={(val) => onUpdateCard(cid, { content: val })}
            />
          ))}
          {column.cardIds.length === 0 && (
            <div className="rounded-lg border border-dashed border-white/5 py-8 text-center text-xs text-white/10">
              Empty Column
            </div>
          )}
        </div>
      </SortableContext>

      <button 
        onClick={onAddCard}
        className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-white/5 py-2 text-xs font-bold text-white/40 hover:bg-white/10 hover:text-white"
      >
        <Plus size={14} /> Add Card
      </button>
    </div>
  );
};

const KanbanBoardComponent = ({ node, updateAttributes }: any) => {
  const [data, setData] = useState<BoardData>(node.attrs.boardData || { 
    columns: [
      { id: 'col-1', title: 'To Do', cardIds: [] },
      { id: 'col-2', title: 'In Progress', cardIds: [] }
    ], 
    cards: {} 
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sync = (newData: BoardData) => {
    setData(newData);
    updateAttributes({ boardData: newData });
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Handle Column Dragging
    if (active.data.current.type === 'column' && over.data.current.type === 'column') {
      if (activeId !== overId) {
        const oldIndex = data.columns.findIndex(c => c.id === activeId);
        const newIndex = data.columns.findIndex(c => c.id === overId);
        sync({ ...data, columns: arrayMove(data.columns, oldIndex, newIndex) });
      }
      return;
    }

    // Handle Card Dragging
    if (active.data.current.type === 'card') {
      const sourceCol = data.columns.find(c => c.cardIds.includes(activeId));
      
      // Target could be another card OR a column
      let targetCol: Column | undefined;
      if (over.data.current.type === 'column') {
        targetCol = over.data.current.column;
      } else {
        targetCol = data.columns.find(c => c.cardIds.includes(overId));
      }

      if (!sourceCol || !targetCol) return;

      if (sourceCol.id === targetCol.id) {
        // Reorder within same column
        const newCardIds = arrayMove(sourceCol.cardIds, sourceCol.cardIds.indexOf(activeId), targetCol.cardIds.indexOf(overId));
        sync({
          ...data,
          columns: data.columns.map(c => c.id === sourceCol.id ? { ...c, cardIds: newCardIds } : c)
        });
      } else {
        // Move to different column
        sync({
          ...data,
          columns: data.columns.map(c => {
            if (c.id === sourceCol.id) return { ...c, cardIds: c.cardIds.filter(id => id !== activeId) };
            if (c.id === targetCol.id) {
              const newIds = [...c.cardIds];
              const idx = over.data.current.type === 'card' ? c.cardIds.indexOf(overId) : c.cardIds.length;
              newIds.splice(idx, 0, activeId);
              return { ...c, cardIds: newIds };
            }
            return c;
          })
        });
      }
    }
  };

  const addColumn = () => {
    const id = generateId();
    sync({
      ...data,
      columns: [...data.columns, { id, title: 'New Column', cardIds: [] }]
    });
  };

  const addCard = (colId: string) => {
    const id = generateId();
    const newCard: Card = { id, content: 'New Task', priority: 'med' };
    sync({
      ...data,
      cards: { ...data.cards, [id]: newCard },
      columns: data.columns.map(c => c.id === colId ? { ...c, cardIds: [...c.cardIds, id] } : c)
    });
  };

  const updateCard = (cardId: string, updates: Partial<Card>) => {
    sync({
      ...data,
      cards: { ...data.cards, [cardId]: { ...data.cards[cardId], ...updates } }
    });
  };

  return (
    <NodeViewWrapper className="kanban-block-v3 my-8 rounded-2xl border border-white/10 bg-[#0f172a] p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-500">
            <Layout size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Project Kanban</h2>
            <p className="text-xs text-white/40 italic">Interactive board • Drag to organize</p>
          </div>
        </div>
      </div>

      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
          <SortableContext items={data.columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
            {data.columns.map(col => (
              <SortableColumn 
                key={col.id} 
                column={col} 
                cards={data.cards} 
                onAddCard={() => addCard(col.id)}
                onUpdateColumn={(updated: any) => sync({ ...data, columns: data.columns.map(c => c.id === col.id ? updated : c) })}
                onDeleteColumn={() => sync({ ...data, columns: data.columns.filter(c => c.id !== col.id) })}
                onUpdateCard={updateCard}
                onDeleteCard={(cid: string) => sync({
                  ...data,
                  cards: Object.fromEntries(Object.entries(data.cards).filter(([k]) => k !== cid)),
                  columns: data.columns.map(c => ({ ...c, cardIds: c.cardIds.filter(id => id !== cid) }))
                })}
              />
            ))}
          </SortableContext>
          
          <button 
            onClick={addColumn}
            className="flex h-fit min-h-[150px] w-72 min-w-[280px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/5 bg-transparent text-white/20 hover:border-blue-500/50 hover:bg-blue-500/5 hover:text-blue-500"
          >
            <Plus size={24} />
            <span className="text-sm font-bold">Add Column</span>
          </button>
        </div>
      </DndContext>
    </NodeViewWrapper>
  );
};

// ─── EXTENSION DEFINITION ──────────────────────────────────────────────────
export const KanbanExtension = Node.create({
  name: 'kanbanBoard',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      boardData: {
        default: {
          columns: [
            { id: 'col-1', title: 'To Do', cardIds: [] },
            { id: 'col-2', title: 'In Progress', cardIds: [] },
            { id: 'col-3', title: 'Done', cardIds: [] }
          ],
          cards: {}
        },
        parseHTML: element => JSON.parse(element.getAttribute('data-board') || '{}'),
        renderHTML: attributes => ({ 'data-board': JSON.stringify(attributes.boardData) })
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="kanban-board"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'kanban-board' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(KanbanBoardComponent);
  },
});
