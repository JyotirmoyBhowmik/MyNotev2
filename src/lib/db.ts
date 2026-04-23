import Dexie, { type Table } from 'dexie';

export interface Block {
  uuid: string;
  content: string;
  parent_id: string | null;
  children: string[];
  page_id: string;
  user_id: string;
  properties: Record<string, any>;
  created_at: number;
  updated_at: number;
}

export interface Page {
  id: string;
  title: string;
  type: 'normal' | 'journal';
  user_id: string;
  root_blocks: string[];
  created_at: number;
  updated_at: number;
}

export class LocalGraphDatabase extends Dexie {
  blocks!: Table<Block, string>;
  pages!: Table<Page, string>;

  constructor() {
    super('LocalGraphDB');
    this.version(1).stores({
      blocks: 'uuid, parent_id, page_id',
      pages: 'id, title, type'
    });
    this.version(2).stores({
      blocks: 'uuid, parent_id, page_id, user_id',
      pages: 'id, title, type, user_id'
    });
  }
}

export const db = new LocalGraphDatabase();
