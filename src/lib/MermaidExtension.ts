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
      content: { default: '' },
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
      dom.className = 'mermaid-container';
      
      const content = node.textContent || 'graph TD\n  A --> B';
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      
      const render = async () => {
        try {
          const { svg } = await mermaid.render(id, content);
          dom.innerHTML = svg;
        } catch (err) {
          dom.innerHTML = `<pre class="mermaid-error">${err}</pre>`;
        }
      };

      render();

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          // Refresh if content changed
          return true;
        },
      };
    };
  },
});
