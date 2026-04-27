import React, { useEffect, useRef, useState } from 'react';
import { useGraphStore } from '../store/graphStore';
import { useLinkStore } from '../store/linkStore';
import { X } from 'lucide-react';
import * as d3 from 'd3';
import './GraphView.css';

interface GraphViewProps {
  onClose: () => void;
  activePageId: string | null;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  isActive: boolean;
  isJournal: boolean;
  icon: string;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'ref' | 'hierarchy';
}

export const GraphView: React.FC<GraphViewProps> = ({ onClose, activePageId }) => {
  const { pages, setActivePage } = useGraphStore();
  const { outlinks } = useLinkStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 600;

    const nodes: GraphNode[] = Object.values(pages)
      .filter(p => !p.deleted_at)
      .map(p => ({
      id: p.id, 
      title: p.title, 
      isActive: p.id === activePageId, 
      isJournal: p.type === 'journal',
      icon: p.icon || (p.type === 'folder' ? '📁' : (p.type === 'journal' ? '📅' : '📄'))
    }));

    const links: GraphLink[] = [];
    
    // 1. Reference Links (Outlinks)
    Object.entries(outlinks).forEach(([sourceId, targetIds]) => {
      targetIds.forEach(targetId => {
        if (pages[sourceId] && pages[targetId]) {
          links.push({ source: sourceId, target: targetId, type: 'ref' });
        }
      });
    });

    // 2. Hierarchy Links (Parent-Child)
    Object.values(pages).forEach(p => {
      if (p.parent_page_id && pages[p.parent_page_id]) {
        links.push({ source: p.parent_page_id, target: p.id, type: 'hierarchy' });
      }
    });

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g');

    // Zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => { g.attr('transform', event.transform); setZoom(event.transform.k); });
    svg.call(zoomBehavior);

    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(40));

    // Links
    const link = g.append('g').selectAll('line')
      .data(links).join('line')
      .attr('stroke', d => d.type === 'hierarchy' ? '#3b82f666' : '#3b82f622')
      .attr('stroke-width', d => d.type === 'hierarchy' ? 2 : 1)
      .attr('stroke-dasharray', d => d.type === 'hierarchy' ? '4 2' : 'none')
      .attr('marker-end', 'url(#arrow)');

    // Arrow marker
    svg.append('defs').append('marker')
      .attr('id', 'arrow').attr('viewBox', '0 -5 10 10').attr('refX', 22).attr('refY', 0)
      .attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#3b82f644');

    // Nodes
    const node = g.append('g').selectAll('g')
      .data(nodes).join('g')
      .attr('cursor', 'pointer')
      .on('click', (_, d) => { setActivePage(d.id); onClose(); })
      .call((d3.drag<SVGGElement, GraphNode>()
        .on('start', (event: any, d: any) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (event: any, d: any) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event: any, d: any) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
      ) as any);

    node.append('circle')
      .attr('r', d => d.isActive ? 16 : 12)
      .attr('fill', d => d.isActive ? '#3b82f6' : d.isJournal ? '#8b5cf633' : '#1e293b')
      .attr('stroke', d => d.isActive ? '#60a5fa' : '#3b82f666')
      .attr('stroke-width', d => d.isActive ? 3 : 1.5);

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '12px')
      .text(d => d.icon);

    node.append('text')
      .attr('dy', 28)
      .attr('text-anchor', 'middle')
      .attr('fill', d => d.isActive ? '#fff' : '#a1a1aa')
      .attr('font-size', '10px')
      .attr('font-family', 'Inter, sans-serif')
      .text(d => d.title.length > 20 ? d.title.substring(0, 18) + '…' : d.title);

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => { simulation.stop(); };
  }, [pages, outlinks, activePageId]);

  return (
    <div className="graph-view">
      <div className="graph-header">
        <span>🕸️ Knowledge Graph</span>
        <div className="graph-controls">
          <span className="graph-zoom">{Math.round(zoom * 100)}%</span>
          <button className="graph-btn" onClick={onClose}><X size={16} /></button>
        </div>
      </div>
      <div className="graph-legend">
        <span><span className="legend-dot active" /> Current</span>
        <span><span className="legend-dot journal" /> Journal</span>
        <span><span className="legend-dot normal" /> Page</span>
        <span><span className="legend-line hierarchy" /> Hierarchy</span>
        <span><span className="legend-line ref" /> Reference</span>
      </div>
      <svg ref={svgRef} className="graph-svg" />
    </div>
  );
};
