import { useEffect, useState, useRef, useCallback } from 'react';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import { Loader2, AlertCircle, Save, X, Edit3, Shield, Monitor } from 'lucide-react';
import { NexusPlugin } from '../../types/plugin';
import { NexusErrorBoundary } from '../../components/NexusErrorBoundary';

// ─── TYPES & HELPERS ───────────────────────────────────────────────────────
let mermaidCache: any = null;

const getMermaid = async () => {
  if (mermaidCache) return mermaidCache;
  const mermaid = (await import('mermaid')).default;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    securityLevel: 'strict',
    fontFamily: 'Inter, sans-serif',
    themeVariables: {
      primaryColor: '#3b82f6',
      primaryTextColor: '#fff',
      lineColor: '#3b82f6',
      secondaryColor: '#1e293b',
      tertiaryColor: '#0f172a',
      mainBkg: '#0a0f1d',
      nodeBorder: '#3b82f6',
      clusterBkg: '#1e293b',
      titleColor: '#fff',
      edgeLabelBackground: '#1e293b',
    }
  });
  mermaidCache = mermaid;
  return mermaid;
};

// ─── REACT COMPONENT ───────────────────────────────────────────────────────
const MermaidNodeView = ({ node, updateAttributes, deleteNode }: any) => {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localCode, setLocalCode] = useState(node.attrs.code);
  const renderTimeout = useRef<any>(null);
  const isMounted = useRef(true);

  const debouncedRender = useCallback(async (code: string) => {
    if (!code.trim()) return;
    if (renderTimeout.current) clearTimeout(renderTimeout.current);
    
    renderTimeout.current = setTimeout(async () => {
      if (!isMounted.current) return;
      setLoading(true);
      try {
        const m = await getMermaid();
        const containerId = `d${node.attrs.uuid}`;
        const container = document.getElementById(containerId);
        if (container) container.remove();

        const { svg: renderedSvg } = await m.render(node.attrs.uuid, code);
        if (isMounted.current) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted.current) setError("Syntax Error");
      } finally {
        if (isMounted.current) setLoading(false);
      }
    }, 300);
  }, [node.attrs.uuid]);

  useEffect(() => {
    isMounted.current = true;
    debouncedRender(node.attrs.code);
    return () => { isMounted.current = false; };
  }, [node.attrs.code, debouncedRender]);

  const handleSave = () => {
    updateAttributes({ code: localCode });
    setIsEditing(false);
  };

  const handleRecover = () => {
    // Fallback: Delete this node and insert content as a code block
    deleteNode();
    // In a real Tiptap environment, you'd use commands to insert a code block here
  };

  return (
    <NodeViewWrapper className="mermaid-node-wrapper group relative my-6 overflow-hidden rounded-xl border border-border bg-[#0a0f1d] transition-all hover:border-blue-500">
      <NexusErrorBoundary onRecover={handleRecover}>
        {!isEditing && (
          <div className="absolute right-3 top-3 z-10 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <button onClick={() => setIsEditing(true)} className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-black/50 text-white backdrop-blur-md hover:border-blue-500 hover:text-blue-500">
              <Edit3 size={14} />
            </button>
          </div>
        )}

        {isEditing ? (
          <div className="flex flex-col bg-black">
            <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Mermaid Live Editor</span>
                <div className="flex items-center gap-1 rounded bg-green-500/10 px-2 py-0.5 text-[9px] font-medium text-green-500 ring-1 ring-inset ring-green-500/20">
                  <Shield size={10} /> SECURE
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setLocalCode(node.attrs.code); setIsEditing(false); }} className="flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium text-white/60 hover:bg-white/10 hover:text-white">
                  <X size={12} /> Cancel
                </button>
                <button onClick={handleSave} className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-500">
                  <Save size={12} /> Save
                </button>
              </div>
            </div>

            <div className="flex min-h-[300px] flex-col md:flex-row">
              <div className="flex-1 border-r border-white/10 p-0">
                <textarea
                  className="h-full min-h-[300px] w-full resize-none bg-transparent p-4 font-mono text-sm leading-relaxed text-green-400 outline-none"
                  value={localCode}
                  onChange={(e) => {
                    setLocalCode(e.target.value);
                    debouncedRender(e.target.value);
                  }}
                  spellCheck="false"
                  onKeyDown={(e) => e.stopPropagation()}
                  autoFocus
                />
              </div>

              <div className="flex flex-1 items-center justify-center bg-[#0a0f1d] p-8">
                 {loading && <Loader2 className="animate-spin text-blue-500" size={32} />}
                 {!loading && error && <div className="text-red-400 text-xs">{error}</div>}
                 {!loading && !error && <div className="mermaid-svg-container w-full" dangerouslySetInnerHTML={{ __html: svg }} />}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative flex min-h-[120px] items-center justify-center p-8" onClick={() => setIsEditing(true)}>
             {loading && <Loader2 className="animate-spin text-blue-500" size={32} />}
             {!loading && <div className="mermaid-svg-container w-full" dangerouslySetInnerHTML={{ __html: svg }} />}
          </div>
        )}
      </NexusErrorBoundary>
    </NodeViewWrapper>
  );
};

// ─── EXTENSION DEFINITION ──────────────────────────────────────────────────
const MermaidExtension = Node.create({
  name: 'mermaid',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      code: { default: 'graph TD\n  A --> B' },
      uuid: { default: null },
    };
  },

  parseHTML() { return [{ tag: 'div[data-type="mermaid"]' }]; },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'mermaid' })]; },
  addNodeView() { return ReactNodeViewRenderer(MermaidNodeView); },
});

// ─── PLUGIN DEFINITION ───────────────────────────────────────────────────
const MermaidPlugin: NexusPlugin = {
  id: 'mermaid-plugin',
  name: 'Mermaid Diagrams',
  version: '3.20.0',
  extensions: [MermaidExtension],
};

export default MermaidPlugin;
