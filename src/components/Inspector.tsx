import React, { useState } from 'react';
import { BacklinksPanel } from './BacklinksPanel';
import { askGemini } from '../lib/gemini';
import { useGraphStore } from '../store/graphStore';
import { Sparkles, Send, Loader2, Link as LinkIcon, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';
import './Inspector.css';

interface InspectorProps {
  pageId: string | null;
}

export const Inspector: React.FC<InspectorProps> = ({ pageId }) => {
  const [activeTab, setActiveTab] = useState<'backlinks' | 'ai'>('backlinks');
  const [prompt, setPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const { blocks } = useGraphStore();

  const handleAskAI = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      // Collect context from current page
      const pageBlocks = Object.values(blocks).filter(b => b.page_id === pageId);
      const context = pageBlocks.map(b => b.content).join('\n');
      
      const response = await askGemini(prompt, context);
      setAiResponse(response);
    } catch (err: any) {
      setAiResponse(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inspector">
      <div className="inspector-tabs">
        <button 
          className={cn("inspector-tab", activeTab === 'backlinks' && "active")}
          onClick={() => setActiveTab('backlinks')}
        >
          <LinkIcon size={14} /> Links
        </button>
        <button 
          className={cn("inspector-tab", activeTab === 'ai' && "active")}
          onClick={() => setActiveTab('ai')}
        >
          <Sparkles size={14} /> Assistant
        </button>
      </div>

      <div className="inspector-content">
        {activeTab === 'backlinks' ? (
          <BacklinksPanel pageId={pageId!} />
        ) : (
          <div className="ai-assistant">
            <div className="ai-chat-history">
              {aiResponse ? (
                <div className="ai-message">
                  <div className="ai-message-header">
                    <Sparkles size={12} className="text-accent" />
                    <span>Gemini</span>
                  </div>
                  <div className="ai-message-body">{aiResponse}</div>
                </div>
              ) : (
                <div className="ai-placeholder">
                   <MessageSquare size={32} className="text-muted mb-2" />
                   <p>Ask anything about this page...</p>
                </div>
              )}
            </div>
            
            <div className="ai-input-wrap">
              <textarea 
                placeholder="Ask Gemini..." 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAskAI(); } }}
              />
              <button 
                className="ai-send-btn" 
                onClick={handleAskAI}
                disabled={loading || !prompt.trim()}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
