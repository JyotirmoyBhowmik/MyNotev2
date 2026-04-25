import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { useCallback, useEffect, useRef } from 'react'
import { useGraphStore } from '../store/graphStore'
import {
  Bold, Italic, Code, Strikethrough, Link2, List, ListOrdered,
  Heading1, Heading2, Heading3, CheckSquare, Quote, Minus, Undo, Redo
} from 'lucide-react'
import { BlockReference } from '../extensions/BlockReference'
import './NexusEditor.css'

interface NexusEditorProps {
  pageId: string
  onNavigateToPage?: (pageId: string) => void
  readOnly?: boolean
}

export const NexusEditor: React.FC<NexusEditorProps> = ({ pageId, readOnly = false }) => {
  const { pages, blocks } = useGraphStore()
  const page = pages[pageId]
  const saveTimer = useRef<number | undefined>(undefined)

  // ── Stable Initial Content ────────────────────────────────────────────────
  const blocksRef = useRef(blocks)
  const pagesRef = useRef(pages)
  useEffect(() => { 
    blocksRef.current = blocks 
    pagesRef.current = pages
  }, [blocks, pages])

  const buildInitialContent = useCallback(() => {
    const page = pagesRef.current[pageId]
    if (!page) return '<p></p>'
    
    // Use the ref to avoid buildInitialContent identity changing on every save
    const currentBlocks = blocksRef.current
    const nexusBlock = Object.values(currentBlocks).find(
      b => b.page_id === pageId && b.block_type === 'nexus_html'
    )
    if (nexusBlock) return nexusBlock.content

    // Fallback: build from root blocks
    return (page.root_blocks || [])
      .map(id => currentBlocks[id])
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

  const lastSavedContent = useRef<string | null>(null)
  const isSaving = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Type '/' for commands, or just start writing, or (( to link a block...",
      }),
      Typography,
      BlockReference,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: true, HTMLAttributes: { class: 'tiptap-link' } }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: buildInitialContent(), // Initialize directly from store/cache ONCE
    autofocus: !readOnly,
    editable: !readOnly,
    editorProps: {
      attributes: { class: 'tiptap nexus-editor-content' },
    },
    onUpdate: ({ editor }) => {
      if (readOnly || isSaving.current) return;
      
      const html = editor.getHTML()
      if (html === lastSavedContent.current) return;

      // Debounced auto-save
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const currentHtml = editor.getHTML()
        if (currentHtml === lastSavedContent.current) return;

        isSaving.current = true;
        try {
          await useGraphStore.getState().savePageContent(pageId, currentHtml)
          lastSavedContent.current = currentHtml;
        } catch (err) {
          console.error('NexusEditor save error', err);
        } finally {
          isSaving.current = false;
        }
      }, 1000) as unknown as number;
    },
  }, [pageId]) // ONLY re-create when page changes

  // Synchronize readOnly state without resetting content
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(!readOnly)
    }
  }, [readOnly, editor])

  if (!page || !editor) return null

  const ToolbarBtn = ({
    onClick, active, title, children,
  }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      title={title}
      className={`nexus-toolbar-btn ${active ? 'active' : ''}`}
    >
      {children}
    </button>
  )

  return (
    <div className={`nexus-editor-wrap ${readOnly ? 'read-only' : ''}`}>
      {/* Fixed toolbar - hidden in readOnly */}
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
        </div>
      )}

      {/* Editor content */}
      <div className="nexus-editor-scroll">
        <div className="nexus-editor-page">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}

export default NexusEditor
