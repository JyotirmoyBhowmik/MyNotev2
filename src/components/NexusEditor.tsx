import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import Image from '@tiptap/extension-image'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { lowlight } from '../lib/lowlight'
import { useState, useCallback, useEffect, useRef, memo, useMemo } from 'react'
import { useGraphStore } from '../store/graphStore'
import { useUIStore } from '../store/uiStore'
import {
  Bold, Italic, Code, Strikethrough, Link2, List, ListOrdered,
  Heading1, Heading2, Heading3, CheckSquare, Quote, Minus, Undo, Redo,
  Grid, Activity, Layout
} from 'lucide-react'
import { Collaboration } from '@tiptap/extension-collaboration'
import { CollaborationCursor } from '@tiptap/extension-collaboration-cursor'
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'
import { BlockReference } from '../extensions/BlockReference'
import { getRegisteredExtensions } from '../lib/pluginRegistry'
import './NexusEditor.css'

interface NexusEditorProps {
  pageId: string
  onNavigateToPage?: (pageId: string) => void
  readOnly?: boolean
}

const ToolbarBtn = memo(({
  onClick, active, title, children,
}: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    title={title}
    className={`nexus-toolbar-btn ${active ? 'active' : ''}`}
  >
    {children}
  </button>
));

export const NexusEditor: React.FC<NexusEditorProps> = ({ pageId, readOnly = false }) => {
  // v2.6 - Fixed duplicate extensions by memoizing instance creation
  console.log('[NexusEditor] Init v2.6 for page:', pageId);
  
  const saveTimer = useRef<number | undefined>(undefined)
  const lastSavedContent = useRef<string | null>(null)
  const [isLocalSaving, setIsLocalSaving] = useState(false)

  const savePageContent = useGraphStore(s => s.savePageContent);

  const buildInitialContent = useCallback(() => {
    const store = useGraphStore.getState()
    if (!store || !store.blocks) return '<p></p>';
    
    const nexusBlock = Object.values(store.blocks).find(
      b => b && b.page_id === pageId && b.block_type === 'nexus_html'
    )
    if (nexusBlock) return nexusBlock.content || '<p></p>';

    const page = store.pages[pageId]
    if (!page) return '<p></p>'

    return (page.root_blocks || [])
      .map(id => store.blocks[id])
      .filter(Boolean)
      .map(b => {
        switch (b.block_type) {
          case 'heading1':  return `<h1>${b.content || ''}</h1>`
          case 'heading2':  return `<h2>${b.content || ''}</h2>`
          case 'heading3':  return `<h3>${b.content || ''}</h3>`
          case 'bullet':    return `<ul><li>${b.content || ''}</li></ul>`
          case 'numbered':  return `<ol><li>${b.content || ''}</li></ol>`
          case 'quote':     return `<blockquote>${b.content || ''}</blockquote>`
          case 'code':      return `<pre><code>${b.content || ''}</code></pre>`
          case 'divider':   return `<hr>`
          case 'image':     return `<img src="${b.content}" />`
          case 'callout':   return `<blockquote>${b.content || ''}</blockquote>`
          default:          return `<p>${b.content || ''}</p>`
        }
      })
      .join('') || '<p></p>'
  }, [pageId])

  // v3.20 Plugin & Collab System
  const ydoc = useMemo(() => new Y.Doc(), [pageId]);
  
  const provider = useMemo(() => {
    // Only connect to localhost in development to avoid production CSP crashes
    const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (!isDev) return null;

    try {
      return new HocuspocusProvider({
        url: 'ws://localhost:1234',
        name: `nexus-page-${pageId}`,
        document: ydoc,
        onConnect: () => console.log('[NexusCollab] Connected'),
        onDisconnect: () => console.log('[NexusCollab] Disconnected'),
      });
    } catch (e) {
      console.warn('[NexusCollab] Provider failed to initialize:', e);
      return null;
    }
  }, [pageId, ydoc]);
  
  const extensions = useMemo(() => {
    const exts = [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3] },
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Placeholder.configure({
        placeholder: "Type '/' for commands, or just start writing, or (( to link a block...",
      }),
      Typography,
      BlockReference,
      Image.configure({ inline: false, allowBase64: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      ...getRegisteredExtensions(),
      Collaboration.configure({
        document: ydoc,
      }),
    ];

    // Only add cursors if we have a provider
    if (provider) {
      exts.push(
        CollaborationCursor.configure({
          provider, // Pass the provider to cursors
          render: (user: any) => {
            const cursor = document.createElement('span')
            cursor.classList.add('collaboration-cursor')
            cursor.setAttribute('style', `border-color: ${user.color}`)
            const label = document.createElement('div')
            label.classList.add('collaboration-cursor-label')
            label.setAttribute('style', `background-color: ${user.color}`)
            label.innerText = user.name
            cursor.appendChild(label)
            return cursor
          },
        })
      );
    }

    return exts;
  }, [ydoc, provider]);

  const editorOptions = useMemo(() => ({
    extensions,
    content: buildInitialContent(),
    autofocus: false,
    editable: !readOnly,
    editorProps: {
      attributes: { class: 'tiptap nexus-editor-content' },
    },
    onUpdate: ({ editor }: { editor: any }) => {
      if (readOnly) return;
      const html = editor.getHTML()
      if (html === lastSavedContent.current) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const currentHtml = editor.getHTML()
        if (currentHtml === lastSavedContent.current) return;
        setIsLocalSaving(true);
        try {
          await savePageContent(pageId, currentHtml)
          lastSavedContent.current = currentHtml;
        } catch (err) {
          console.error('[NexusEditor] Save failed:', err);
        } finally {
          setIsLocalSaving(false);
        }
      }, 1000) as unknown as number;
    },
  }), [pageId, extensions]); 

  const editor = useEditor(editorOptions)

  const currentEditable = useRef(!readOnly);
  useEffect(() => {
    if (editor && !editor.isDestroyed && currentEditable.current !== !readOnly) {
      editor.setEditable(!readOnly);
      currentEditable.current = !readOnly;
    }
  }, [readOnly, editor]);

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const content = buildInitialContent();
      if (content !== editor.getHTML()) {
        editor.commands.setContent(content, { emitUpdate: false });
        lastSavedContent.current = content;
      }
    }
  }, [pageId, editor, buildInitialContent]);

  useEffect(() => {
    return () => {
      provider?.destroy();
      ydoc.destroy();
    }
  }, [provider, ydoc]);

  const { isWideView } = useUIStore();
  if (!pageId || !editor) return null

  return (
    <div className={`nexus-editor-wrap ${readOnly ? 'read-only' : ''}`}>
      {!readOnly && (
        <div className="nexus-toolbar">
          <div className="nexus-toolbar-group">
            <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)">
              <Bold size={14} />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)">
              <Italic size={14} />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
              <Strikethrough size={14} />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline code">
              <Code size={14} />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="JS Block (Code Block)">
              <Layout size={14} className="rotate-90" />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => {
              const url = prompt('URL:')
              if (url) editor.chain().focus().setLink({ href: url }).run()
            }} active={editor.isActive('link')} title="Link">
              <Link2 size={14} />
            </ToolbarBtn>
          </div>
          <div className="nexus-toolbar-sep" />
          <div className="nexus-toolbar-group">
            <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
              <Heading1 size={14} />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
              <Heading2 size={14} />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
              <Heading3 size={14} />
            </ToolbarBtn>
          </div>
          <div className="nexus-toolbar-sep" />
          <div className="nexus-toolbar-group">
            <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
              <List size={14} />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">
              <ListOrdered size={14} />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Task list">
              <CheckSquare size={14} />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">
              <Quote size={14} />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Divider">
              <Minus size={14} />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} active={false} title="Insert Table">
              <Grid size={14} />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().insertContent({ type: 'mermaid', attrs: { code: 'graph TD\n  A --> B', uuid: `mermaid-${crypto.randomUUID()}` } }).run()} active={false} title="Insert Diagram">
              <Activity size={14} />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().insertContent({ type: 'kanbanBoard' }).run()} active={false} title="Insert Kanban Board">
              <Layout size={14} />
            </ToolbarBtn>
          </div>
          <div className="nexus-toolbar-sep" />
          <div className="nexus-toolbar-group">
            <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} active={false} title="Undo (Ctrl+Z)">
              <Undo size={14} />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} active={false} title="Redo (Ctrl+Shift+Z)">
              <Redo size={14} />
            </ToolbarBtn>
          </div>
          <div className="flex-1" />
          {isLocalSaving && (
            <div className="flex items-center gap-2 px-3">
              <Activity size={12} className="animate-spin text-accent" />
              <span className="text-[10px] font-bold text-accent uppercase tracking-tighter">Syncing Block Transactions</span>
            </div>
          )}
        </div>
      )}

      <div className="nexus-editor-scroll">
        <div className={`nexus-editor-page ${isWideView ? 'wide' : ''}`}>
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}

export default NexusEditor
