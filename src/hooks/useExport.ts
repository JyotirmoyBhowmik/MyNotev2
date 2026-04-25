import type { Block, Page } from '../store/graphStore';

/**
 * Converts a page and its blocks to Markdown format
 */
export function exportPageToMarkdown(page: Page, blocks: Record<string, Block>): string {
  const lines: string[] = [];

  // Frontmatter
  lines.push('---');
  lines.push(`title: "${page.title}"`);
  lines.push(`type: ${page.type}`);
  if (page.tags?.length) lines.push(`tags: [${page.tags.join(', ')}]`);
  lines.push(`created: ${new Date(page.created_at).toISOString()}`);
  lines.push('---');
  lines.push('');
  lines.push(`# ${page.title}`);
  lines.push('');

  function renderBlock(uuid: string, depth = 0): string[] {
    const block = blocks[uuid];
    if (!block) return [];
    const indent = '  '.repeat(depth);
    const lines: string[] = [];

    switch (block.block_type) {
      case 'heading1': lines.push(`# ${block.content}`); break;
      case 'heading2': lines.push(`## ${block.content}`); break;
      case 'heading3': lines.push(`### ${block.content}`); break;
      case 'bullet':   lines.push(`${indent}- ${block.content}`); break;
      case 'numbered': lines.push(`${indent}1. ${block.content}`); break;
      case 'toggle':   lines.push(`${indent}▸ ${block.content}`); break;
      case 'code':     lines.push('```', block.content, '```'); break;
      case 'quote':    lines.push(`> ${block.content}`); break;
      case 'callout':  lines.push(`> 💡 ${block.content}`); break;
      case 'divider':  lines.push('---'); break;
      default:         lines.push(`${indent}${block.content}`);
    }

    // Render children
    block.children.forEach(childId => {
      lines.push(...renderBlock(childId, block.block_type === 'bullet' || block.block_type === 'numbered' ? depth + 1 : depth));
    });

    return lines;
  }

  page.root_blocks.forEach(id => {
    lines.push(...renderBlock(id));
    lines.push('');
  });

  return lines.join('\n');
}

export function downloadMarkdown(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
