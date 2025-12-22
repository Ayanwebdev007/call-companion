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
    textarea.style.width = 'auto';
    
    // Get the natural size of the content
    const scrollHeight = textarea.scrollHeight;
    const scrollWidth = textarea.scrollWidth;
    
    // Calculate width based on container and constraints
    let newWidth = scrollWidth;
    if (minWidth && newWidth < minWidth) {
      newWidth = minWidth;
    }
    if (maxWidth && newWidth > maxWidth) {
      newWidth = maxWidth;
    }
    
    // Set width first to affect height calculation
    textarea.style.width = `${newWidth}px`;
    
    // Now recalculate height with the new width
    textarea.style.height = 'auto';
    let newHeight = textarea.scrollHeight;
    
    // Apply max height constraint
    if (maxHeight && newHeight > maxHeight) {
      newHeight = maxHeight;
      textarea.style.overflowY = 'scroll';
    } else {
      textarea.style.overflowY = 'hidden';
    }
    
    // Set the new height
    textarea.style.height = `${newHeight}px`;
  }, [maxHeight, maxWidth, minWidth]);

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

  return (
    <textarea
      ref={textareaRef}
      className={cn(
        "flex rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
        className,
      )}
      onInput={resizeTextarea}
      {...props}
    />
  );
});

AutoResizeTextarea.displayName = "AutoResizeTextarea";

export { AutoResizeTextarea };
export type { AutoResizeTextareaProps };