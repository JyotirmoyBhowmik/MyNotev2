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
  atom: true,

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
      
      const editorWrap = document.createElement('div');
      editorWrap.className = 'mermaid-editor-wrap';
      editorWrap.style.display = 'none';

      const editorArea = document.createElement('textarea');
      editorArea.className = 'mermaid-editor';
      editorArea.value = node.attrs.code;

      const controls = document.createElement('div');
      controls.className = 'mermaid-editor-controls';
      
      const doneBtn = document.createElement('button');
      doneBtn.innerText = 'Save Diagram';
      doneBtn.className = 'mermaid-save-btn';

      controls.appendChild(doneBtn);
      editorWrap.appendChild(editorArea);
      editorWrap.appendChild(controls);

      container.appendChild(preview);
      container.appendChild(editorWrap);

      const renderDiagram = async (code: string) => {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        try {
          const existingError = document.getElementById('dmermaid-' + id);
          if (existingError) existingError.remove();

          const { svg } = await mermaid.render(id, code);
          preview.innerHTML = svg;
        } catch (err) {
          preview.innerHTML = `<div class="mermaid-error">Invalid Mermaid Syntax</div>`;
        }
      };

      renderDiagram(node.attrs.code);

      container.addEventListener('click', (e) => {
        e.stopPropagation();
        if (editorWrap.style.display === 'none') {
          editorWrap.style.display = 'block';
          preview.style.display = 'none';
          editorArea.focus();
        }
      });

      const save = () => {
        const newCode = editorArea.value;
        editorWrap.style.display = 'none';
        preview.style.display = 'block';
        
        if (newCode !== node.attrs.code) {
          if (typeof getPos === 'function') {
            editor.commands.updateAttributes('mermaid', { code: newCode });
          }
          renderDiagram(newCode);
        }
      };

      doneBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        save();
      });

      editorArea.addEventListener('blur', (e) => {
        // Only save if we didn't click the save button
        if (!(e.relatedTarget instanceof HTMLButtonElement)) {
           save();
        }
      });

      editorArea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          save();
        }
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
      };
    };
  },
});
