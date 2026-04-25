import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';

import { useGraphStore } from '../store/graphStore';

const BlockReferenceComponent = (props: any) => {
  const { node } = props;
  const blockId = node.attrs.id;
  const { blocks } = useGraphStore();
  const block = blocks[blockId];

  if (!block) {
    return (
      <span className="block-ref-missing">
        ((Unknown Block))
      </span>
    );
  }

  return (
    <span className="block-ref" title={block.content}>
      <span className="block-ref-icon">#</span>
      {block.content.substring(0, 50) || 'Untitled Block'}
    </span>
  );
};

export const BlockReference = Node.create({
  name: 'blockReference',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-block-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-block-id': HTMLAttributes.id }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BlockReferenceComponent);
  },
});
