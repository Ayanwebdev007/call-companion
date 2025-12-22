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

    // Store current styles to restore later
    const originalStyle = {
      height: textarea.style.height,
      minHeight: textarea.style.minHeight,
      overflowY: textarea.style.overflowY,
    };
    
    // Reset to natural height to calculate content size correctly
    textarea.style.height = 'auto';
    textarea.style.minHeight = '0';
    textarea.style.overflowY = 'hidden';
    
    // Calculate content height properly accounting for padding and borders
    const computedStyle = window.getComputedStyle(textarea);
    const paddingTop = parseFloat(computedStyle.paddingTop);
    const paddingBottom = parseFloat(computedStyle.paddingBottom);
    const borderTop = parseFloat(computedStyle.borderTopWidth);
    const borderBottom = parseFloat(computedStyle.borderBottomWidth);
    
    // Get the natural size of the content
    const scrollHeight = textarea.scrollHeight;
    
    // Calculate the single line height
    const lineHeight = parseFloat(computedStyle.lineHeight) || 20;
    const singleLineHeight = lineHeight + paddingTop + paddingBottom + borderTop + borderBottom;
    
    let newHeight = singleLineHeight;
    
    // Count the number of lines in the textarea
    const lines = textarea.value ? textarea.value.split('\n').length : 1;
    
    if (lines > 1) {
      // If there are multiple lines, use the scrollHeight but ensure it's at least single line height
      newHeight = Math.max(scrollHeight, singleLineHeight * lines);
    } else {
      // For single line content, ensure it's exactly single line height
      newHeight = singleLineHeight;
    }
    
    // Apply max height constraint
    if (maxHeight && newHeight > maxHeight) {
      newHeight = maxHeight;
      textarea.style.overflowY = 'scroll';
    } else {
      textarea.style.overflowY = 'hidden';
    }
    
    // Set the new height
    textarea.style.height = `${newHeight}px`;
    
    // Restore original minHeight if it was set
    if (originalStyle.minHeight && originalStyle.minHeight !== '0px') {
      textarea.style.minHeight = originalStyle.minHeight;
    }
  }, [maxHeight]);

  // Effect to handle resize on value changes and initial render
  React.useEffect(() => {
    const timer = setTimeout(() => {
      resizeTextarea();
    }, 0);
    
    // Also resize when window resizes
    const handleResize = () => {
      resizeTextarea();
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [props.value, resizeTextarea]);

  // Effect to handle initial resize after component is fully mounted
  React.useEffect(() => {
    const handleAfterRender = () => {
      // Use requestAnimationFrame to ensure DOM is fully rendered
      requestAnimationFrame(() => {
        resizeTextarea();
      });
    };
    
    // If component is already in the DOM, resize immediately
    if (textareaRef.current && document.contains(textareaRef.current)) {
      handleAfterRender();
    } else {
      // Otherwise wait for the next frame
      requestAnimationFrame(handleAfterRender);
    }
  }, []);

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
        "flex w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
        className,
      )}
      onInput={resizeTextarea}
      style={props.style}
      {...props}
    />
  );
});

AutoResizeTextarea.displayName = "AutoResizeTextarea";

export { AutoResizeTextarea };
export type { AutoResizeTextareaProps };