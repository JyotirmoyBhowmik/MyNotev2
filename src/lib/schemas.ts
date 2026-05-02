import { z } from 'zod';

export const KanbanCardSchema = z.object({
  id: z.string(),
  content: z.string(),
  priority: z.enum(['low', 'med', 'high']).default('med'),
});

export const KanbanColumnSchema = z.object({
  id: z.string(),
  title: z.string(),
  cardIds: z.array(z.string()),
});

export const KanbanBoardDataSchema = z.object({
  columns: z.array(KanbanColumnSchema),
  cards: z.record(z.string(), KanbanCardSchema),
});

export const BlockSchema = z.object({
  uuid: z.string().uuid(),
  user_id: z.string().uuid(),
  page_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable(),
  content: z.string(),
  children: z.array(z.string().uuid()),
  properties: z.record(z.string(), z.any()),
  block_type: z.string(),
  is_collapsed: z.boolean(),
  created_at: z.number(),
  updated_at: z.number(),
  deleted_at: z.number().nullable(),
});

export const PageSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  type: z.enum(['normal', 'journal', 'folder', 'kanban']),
  root_blocks: z.array(z.string().uuid()),
  is_favorite: z.boolean(),
  parent_page_id: z.string().uuid().nullable(),
  tags: z.array(z.string()),
  icon: z.string().nullable(),
  created_at: z.number(),
  updated_at: z.number(),
  deleted_at: z.number().nullable(),
});

export type KanbanBoardData = z.infer<typeof KanbanBoardDataSchema>;
export type KanbanCard = z.infer<typeof KanbanCardSchema>;
export type KanbanColumn = z.infer<typeof KanbanColumnSchema>;
