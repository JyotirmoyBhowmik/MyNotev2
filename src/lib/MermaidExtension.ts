import { Node, mergeAttributes } from '@tiptap/core';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter, system-ui, sans-serif',
});

export const MermaidExtension = Node.create({
  name: 'mermaid',
  group: 'block',
  atom: true, // v3.3 - Make it an atom so it doesn't split or merge unexpectedly

  addAttributes() {
    return {
      code: { default: 'graph TD\n  A --> B' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="mermaid"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'mermaid' })];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const container = document.createElement('div');
      container.className = 'mermaid-node-view';
      
      const preview = document.createElement('div');
      preview.className = 'mermaid-preview';
      
      const editorArea = document.createElement('textarea');
      editorArea.className = 'mermaid-editor';
      editorArea.value = node.attrs.code;
      editorArea.style.display = 'none';

      container.appendChild(preview);
      container.appendChild(editorArea);

      const renderDiagram = async (code: string) => {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        try {
          // Clear any previous error messages that might have leaked
          const existingError = document.getElementById('dmermaid-' + id);
          if (existingError) existingError.remove();

          const { svg } = await mermaid.render(id, code);
          preview.innerHTML = svg;
        } catch (err) {
          preview.innerHTML = `<div class="mermaid-error">Invalid Mermaid Syntax</div>`;
          // Clean up mermaid's internal error UI if it leaked
          console.warn('[Mermaid] Render failed:', err);
        }
      };

      renderDiagram(node.attrs.code);

      container.addEventListener('click', (e) => {
        e.stopPropagation();
        if (editorArea.style.display === 'none') {
          editorArea.style.display = 'block';
          preview.style.display = 'none';
          editorArea.focus();
        }
      });

      editorArea.addEventListener('blur', () => {
        const newCode = editorArea.value;
        editorArea.style.display = 'none';
        preview.style.display = 'block';
        
        if (newCode !== node.attrs.code) {
          if (typeof getPos === 'function') {
            editor.commands.updateAttributes('mermaid', { code: newCode });
          }
          renderDiagram(newCode);
        }
      });

      // Prevent Tiptap from handling enter/delete inside the textarea
      editorArea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') e.stopPropagation();
      });

      return {
        dom: container,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'mermaid') return false;
          if (updatedNode.attrs.code !== node.attrs.code) {
            renderDiagram(updatedNode.attrs.code);
            editorArea.value = updatedNode.attrs.code;
          }
          return true;
        },
        selectNode: () => {
          container.classList.add('selected');
        },
        deselectNode: () => {
          container.classList.remove('selected');
        }
      };
    };
  },
});
