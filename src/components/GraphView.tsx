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
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
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

    const nodes: GraphNode[] = Object.values(pages).map(p => ({
      id: p.id, title: p.title, isActive: p.id === activePageId, isJournal: p.type === 'journal',
    }));

    const links: GraphLink[] = [];
    Object.entries(outlinks).forEach(([sourceId, targetIds]) => {
      targetIds.forEach(targetId => {
        if (pages[sourceId] && pages[targetId]) {
          links.push({ source: sourceId, target: targetId });
        }
      });
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
      .attr('stroke', '#3b82f633')
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrow)');

    // Arrow marker
    svg.append('defs').append('marker')
      .attr('id', 'arrow').attr('viewBox', '0 -5 10 10').attr('refX', 22).attr('refY', 0)
      .attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto')
      .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', '#3b82f6');

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
      .attr('r', d => d.isActive ? 14 : 9)
      .attr('fill', d => d.isActive ? '#3b82f6' : d.isJournal ? '#8b5cf6' : '#1e293b')
      .attr('stroke', d => d.isActive ? '#60a5fa' : '#3b82f6')
      .attr('stroke-width', d => d.isActive ? 3 : 1.5);

    node.append('text')
      .attr('dy', 24)
      .attr('text-anchor', 'middle')
      .attr('fill', '#a1a1aa')
      .attr('font-size', '11px')
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
        <span><span className="legend-dot active" /> Current page</span>
        <span><span className="legend-dot journal" /> Journal</span>
        <span><span className="legend-dot normal" /> Page</span>
      </div>
      <svg ref={svgRef} className="graph-svg" />
    </div>
  );
};
