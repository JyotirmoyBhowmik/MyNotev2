import React, { useRef, useEffect, useState } from 'react';
import { useGraphStore } from '../store/graphStore';
import { Circle } from 'lucide-react';
import './BlockNode.css';

interface BlockNodeProps {
  uuid: string;
}

export const BlockNode: React.FC<BlockNodeProps> = ({ uuid }) => {
  const { blocks, updateBlock, addBlock, indentBlock, outdentBlock, deleteBlock } = useGraphStore();
  const block = blocks[uuid];
  const contentRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (contentRef.current && contentRef.current.innerText !== block?.content) {
      contentRef.current.innerText = block?.content || '';
    }
  }, [block?.content]);

  if (!block) return null;

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newContent = contentRef.current?.innerText.substring(
        window.getSelection()?.anchorOffset || 0
      ) || '';
      
      const oldContent = contentRef.current?.innerText.substring(
        0, window.getSelection()?.anchorOffset || 0
      ) || '';

      await updateBlock(uuid, oldContent);
      
      // If we have children, new block becomes first child
      if (block.children.length > 0) {
        const newBlock = await addBlock(block.page_id, uuid, 0, newContent);
        focusBlock(newBlock.uuid);
      } else {
        // Otherwise it becomes next sibling
        const parentArray = block.parent_id ? blocks[block.parent_id].children : useGraphStore.getState().pages[block.page_id].root_blocks;
        const index = parentArray.indexOf(uuid);
        const newBlock = await addBlock(block.page_id, block.parent_id, index + 1, newContent);
        focusBlock(newBlock.uuid);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        await outdentBlock(uuid);
      } else {
        await indentBlock(uuid);
      }
    } else if (e.key === 'Backspace' && contentRef.current?.innerText === '') {
      e.preventDefault();
      await deleteBlock(uuid);
      // Try to focus previous sibling or parent
      const parentArray = block.parent_id ? blocks[block.parent_id].children : useGraphStore.getState().pages[block.page_id].root_blocks;
      const index = parentArray.indexOf(uuid);
      if (index > 0) {
        focusBlock(parentArray[index - 1], true);
      } else if (block.parent_id) {
        focusBlock(block.parent_id, true);
      }
    } else if (e.key === 'ArrowUp') {
      // Very basic arrow nav
      e.preventDefault();
      const parentArray = block.parent_id ? blocks[block.parent_id].children : useGraphStore.getState().pages[block.page_id].root_blocks;
      const index = parentArray.indexOf(uuid);
      if (index > 0) focusBlock(parentArray[index - 1], true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const parentArray = block.parent_id ? blocks[block.parent_id].children : useGraphStore.getState().pages[block.page_id].root_blocks;
      const index = parentArray.indexOf(uuid);
      if (index < parentArray.length - 1) focusBlock(parentArray[index + 1]);
    }
  };

  const focusBlock = (id: string, atEnd = false) => {
    setTimeout(() => {
      const el = document.getElementById(`block-${id}`);
      if (el) {
        el.focus();
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(el);
        if (!atEnd) range.collapse(true);
        else range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }, 50);
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (contentRef.current) {
      updateBlock(uuid, contentRef.current.innerText);
    }
  };

  return (
    <div className="block-node">
      <div className="block-controls">
        <div className={`bullet ${block.children.length > 0 ? 'has-children' : ''}`}>
           <Circle size={10} fill={block.children.length > 0 ? 'currentColor' : 'none'} />
        </div>
      </div>
      <div className="block-content-wrapper">
        <div
          id={`block-${uuid}`}
          ref={contentRef}
          className="block-content"
          contentEditable
          suppressContentEditableWarning
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          data-placeholder={block.content === '' && isFocused ? 'Type something...' : ''}
        />
        {block.children.length > 0 && (
          <div className="block-children">
            {block.children.map(childId => (
              <BlockNode key={childId} uuid={childId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
