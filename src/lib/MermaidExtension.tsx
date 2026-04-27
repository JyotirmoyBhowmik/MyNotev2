import React, { useEffect, useState, useRef, Suspense } from 'react';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import { Loader2, AlertCircle, Save, Maximize2, Edit3, Shield } from 'lucide-react';

// ─── DYNAMIC MERMAID LOADER ───────────────────────────────────────────────
let mermaidLib: any = null;

const loadMermaid = async () => {
  if (mermaidLib) return mermaidLib;
  const m = (await import('mermaid')).default;
  m.initialize({
    startOnLoad: false,
    theme: 'base',
    securityLevel: 'strict', // Production-ready security
    fontFamily: 'Inter, system-ui, sans-serif',
    themeVariables: {
      primaryColor: '#3b82f6',
      primaryTextColor: '#fff',
      lineColor: '#3b82f6',
      secondaryColor: '#1e293b',
      tertiaryColor: '#0f172a',
      mainBkg: '#0f172a',
      nodeBorder: '#3b82f6',
      clusterBkg: '#1e293b',
      titleColor: '#fff',
      edgeLabelBackground: '#1e293b',
    }
  });
  mermaidLib = m;
  return m;
};

const MermaidComponent = ({ node, updateAttributes }: any) => {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState(node.attrs.code);
  const renderId = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);

  const renderChart = async (chartCode: string) => {
    if (!chartCode.trim()) return;
    setLoading(true);
    try {
      setError(null);
      const m = await loadMermaid();
      
      // Clean up previous mermaid artifacts
      const container = document.getElementById('d' + renderId.current);
      if (container) container.remove();

      const { svg: renderedSvg } = await m.render(renderId.current, chartCode);
      setSvg(renderedSvg);
    } catch (err: any) {
      console.warn("Mermaid Syntax Error:", err);
      setError("Invalid Diagram Syntax");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    renderChart(node.attrs.code);
  }, [node.attrs.code]);

  const handleSave = () => {
    updateAttributes({ code });
    setIsEditing(false);
    renderChart(code);
  };

  return (
    <NodeViewWrapper className="mermaid-component-v3">
      <div className="mermaid-actions-overlay">
        <button onClick={() => setIsEditing(!isEditing)} title={isEditing ? "Close Editor" : "Edit Diagram"}>
          {isEditing ? <Maximize2 size={14} /> : <Edit3 size={14} />}
        </button>
      </div>

      {isEditing ? (
        <div className="mermaid-live-editor">
          <div className="mermaid-editor-header">
             <div className="flex items-center gap-2">
               <span className="text-xs font-bold uppercase tracking-wider opacity-50">Diagram Editor</span>
               <div className="flex items-center gap-1 text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded border border-green-500/20">
                 <Shield size={10} /> Strict Mode
               </div>
             </div>
             <button className="mermaid-save-btn-v3" onClick={handleSave}>
               <Save size={12} /> Save & Render
             </button>
          </div>
          <textarea
            className="mermaid-textarea-v3"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSave();
              }
              e.stopPropagation();
            }}
            autoFocus
          />
          <div className="mermaid-editor-footer">
            <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to save
          </div>
        </div>
      ) : (
        <div className="mermaid-preview-v3" onClick={() => setIsEditing(true)}>
          {loading && (
            <div className="mermaid-loading">
              <Loader2 className="animate-spin" size={24} />
            </div>
          )}
          {error ? (
            <div className="mermaid-error-v3">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          ) : (
            <div 
              className="mermaid-svg-container"
              dangerouslySetInnerHTML={{ __html: svg }} 
            />
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
};

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
    return ReactNodeViewRenderer(MermaidComponent);
  },
});
