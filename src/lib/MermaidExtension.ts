import { Node, mergeAttributes } from '@tiptap/core';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
});

export const MermaidExtension = Node.create({
  name: 'mermaid',
  group: 'block',
  content: 'text*',
  marks: '',
  code: true,
  defining: true,

  addAttributes() {
    return {
      content: { default: 'graph TD\n  A --> B' },
    };
  },

  parseHTML() {
    return [{ tag: 'pre', getAttrs: (node) => (node as HTMLElement).classList.contains('mermaid') && null }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['pre', mergeAttributes(HTMLAttributes, { class: 'mermaid' }), 0];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement('div');
      dom.className = 'mermaid-node-view';
      
      const preview = document.createElement('div');
      preview.className = 'mermaid-preview';
      
      const editorArea = document.createElement('textarea');
      editorArea.className = 'mermaid-editor';
      editorArea.value = node.textContent || node.attrs.content;
      editorArea.style.display = 'none';

      dom.appendChild(preview);
      dom.appendChild(editorArea);

      const render = async (code: string) => {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        try {
          const { svg } = await mermaid.render(id, code);
          preview.innerHTML = svg;
        } catch (err) {
          preview.innerHTML = `<pre class="mermaid-error">Invalid Mermaid Syntax</pre>`;
        }
      };

      render(editorArea.value);

      dom.addEventListener('click', () => {
        if (editorArea.style.display === 'none') {
          editorArea.style.display = 'block';
          preview.style.display = 'none';
          editorArea.focus();
        }
      });

      editorArea.addEventListener('blur', () => {
        editorArea.style.display = 'none';
        preview.style.display = 'block';
        const newContent = editorArea.value;
        
        // Update node content
        if (typeof getPos === 'function') {
          editor.commands.insertContentAt(getPos(), {
            type: 'mermaid',
            content: [{ type: 'text', text: newContent }]
          });
        }
        render(newContent);
      });

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          return true;
        },
      };
    };
  },
});
