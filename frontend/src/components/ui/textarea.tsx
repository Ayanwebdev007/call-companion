import * as React from "react";

import { cn } from "@/lib/utils";

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxHeight?: number;
  maxWidth?: number;
  minWidth?: number;
}

const AutoResizeTextarea = React.forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(({ className, maxHeight = 300, maxWidth, minWidth, ...props }, ref) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useImperativeHandle(ref, () => textareaRef.current!);

  const resizeTextarea = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset dimensions to auto to calculate sizes correctly
    textarea.style.height = 'auto';
    
    // Get the natural size of the content
    const scrollHeight = textarea.scrollHeight;
    
    // For table cells, we should respect the width of the parent cell
    // but still allow the height to adjust based on content
    let newHeight = scrollHeight;
    
    // Apply max height constraint
    if (maxHeight && newHeight > maxHeight) {
      newHeight = maxHeight;
      textarea.style.overflowY = 'scroll';
    } else {
      textarea.style.overflowY = 'hidden';
    }
    
    // Set the new height
    textarea.style.height = `${newHeight}px`;
  }, [maxHeight]);

  React.useEffect(() => {
    resizeTextarea();
    
    // Also resize when window resizes
    const handleResize = () => {
      resizeTextarea();
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [props.value, resizeTextarea]);

  // Observe changes to the parent element's size
  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const resizeObserver = new ResizeObserver(() => {
      // When the parent element changes size, adjust height accordingly
      resizeTextarea();
    });

    const parent = textarea.parentElement;
    if (parent) {
      resizeObserver.observe(parent);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [resizeTextarea]);

  return (
    <textarea
      ref={textareaRef}
      className={cn(
        "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
        className,
      )}
      onInput={resizeTextarea}
      style={{ minHeight: 'auto', ...props.style }}
      {...props}
    />
  );
});

AutoResizeTextarea.displayName = "AutoResizeTextarea";

export { AutoResizeTextarea };
export type { AutoResizeTextareaProps };