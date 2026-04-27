import { useState, useCallback, useEffect } from 'react';

interface UseResizableProps {
  initialWidth: number;
  minWidth: number;
  maxWidth: number;
  onWidthChange?: (width: number) => void;
}

export const useResizable = ({
  initialWidth,
  minWidth,
  maxWidth,
  onWidthChange,
}: UseResizableProps) => {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = Math.min(Math.max(e.clientX, minWidth), maxWidth);
        setWidth(newWidth);
        onWidthChange?.(newWidth);
      }
    },
    [isResizing, minWidth, maxWidth, onWidthChange]
  );

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  return { width, isResizing, startResizing };
};
