// Converts block content string with markdown syntax into React-renderable HTML string
// Supports: **bold**, *italic*, ~~strike~~, `code`, [[PageLink]], ((BlockRef)), #tag, [text](url)

export function parseInlineContent(content: string): string {
  let html = escapeHtml(content);

  // Bold + Italic ***text***
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  // Bold **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic *text*
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Strikethrough ~~text~~
  html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');
  // Inline code `text`
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  // Markdown link [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="md-link" href="$2" target="_blank" rel="noopener">$1</a>');
  // Page link [[Page Name]]
  html = html.replace(/\[\[([^\]]+)\]\]/g, '<span class="page-link" data-page="$1">[[<span>$1</span>]]</span>');
  // Block reference ((uuid))
  html = html.replace(/\(\(([^)]+)\)\)/g, '<span class="block-ref" data-ref="$1">((ref))</span>');
  // Tags #tag (word boundary)
  html = html.replace(/(^|\s)(#[\w/]+)/g, '$1<span class="tag-chip">$2</span>');

  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function stripMarkdown(content: string): string {
  return content
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\(\(([^)]+)\)\)/g, '')
    .replace(/#[\w/]+/g, '')
    .trim();
}

// Extract [[page links]] from content
export function extractPageLinks(content: string): string[] {
  const matches = content.match(/\[\[([^\]]+)\]\]/g) || [];
  return matches.map(m => m.slice(2, -2).trim());
}

// Extract #tags from content
export function extractTags(content: string): string[] {
  const matches = content.match(/#[\w/]+/g) || [];
  return matches.map(m => m.slice(1));
}
