import * as React from "react";

import { cn } from "@/lib/utils";

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxHeight?: number;
  maxWidth?: number;
  minWidth?: number;
  minHeight?: number;
}

const AutoResizeTextarea = React.forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(({ className, maxHeight = 300, maxWidth, minWidth, minHeight = 24, ...props }, ref) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useImperativeHandle(ref, () => textareaRef.current!);

  // Debounced resize function to prevent excessive calls
  const resizeTextarea = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    try {
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
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
      const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
      const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
      const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;
      
      // Calculate the single line height
      const lineHeightValue = computedStyle.lineHeight;
      let lineHeight = 20; // default fallback
      
      if (lineHeightValue && lineHeightValue !== 'normal') {
        if (lineHeightValue.endsWith('px')) {
          lineHeight = parseFloat(lineHeightValue);
        } else {
          // If it's a unitless value, calculate based on font size
          const fontSize = parseFloat(computedStyle.fontSize);
          lineHeight = parseFloat(lineHeightValue) * fontSize;
        }
      }
      
      const singleLineHeight = lineHeight + paddingTop + paddingBottom + borderTop + borderBottom;
      
      // Get the natural size of the content (includes visual wrapping)
      const scrollHeight = textarea.scrollHeight;
      
      // Count the number of logical lines (separated by newlines)
      const logicalLines = textarea.value ? textarea.value.split('\n').length : 1;
      
      let newHeight;
      
      // For empty textarea, use single line height
      if (!textarea.value) {
        newHeight = singleLineHeight;
      } else {
        // For content, use the scrollHeight which accounts for visual wrapping
        // but ensure it's at least the height for the number of logical lines
        // Only apply logical line calculation if there are actual newlines in the text
        if (logicalLines > 1) {
          newHeight = Math.max(scrollHeight, singleLineHeight * logicalLines);
        } else {
          // For single line content, just use scrollHeight
          newHeight = scrollHeight;
        }
      }
      
      // Apply min height constraint only if it's greater than the calculated single line height
      // This prevents the textarea from jumping to a larger height when there's only one line of text
      if (logicalLines <= 1 && scrollHeight < minHeight) {
        // For single line content, don't force the minHeight if scrollHeight is smaller
        // But ensure it's at least the single line height
        newHeight = Math.max(newHeight, singleLineHeight);
      } else {
        // For multiple lines or when content is larger than minHeight, apply constraints
        newHeight = Math.max(newHeight, minHeight);
      }
      
      // Apply max height constraint
      if (maxHeight && newHeight > maxHeight) {
        newHeight = maxHeight;
        textarea.style.overflowY = 'scroll';
      } else {
        textarea.style.overflowY = 'hidden';
      }
      
      // Only update if height has actually changed
      const currentHeight = parseFloat(textarea.style.height) || 0;
      if (Math.abs(currentHeight - newHeight) > 0.5) { // Use small threshold to account for rounding
        // Set the new height
        textarea.style.height = `${newHeight}px`;
        
        // Restore original minHeight if it was set
        if (originalStyle.minHeight && originalStyle.minHeight !== '0px') {
          textarea.style.minHeight = originalStyle.minHeight;
        }
      }
    } catch (error) {
      console.error('Error in textarea resize:', error);
      // Fallback: ensure textarea is visible
      if (textarea) {
        textarea.style.height = `${minHeight}px`;
        textarea.style.overflowY = 'auto';
      }
    }
  }, [maxHeight, minHeight]);
  
  // Create a debounced version of resizeTextarea
  const debouncedResize = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const debouncedResizeTextarea = React.useCallback(() => {
    if (debouncedResize.current) {
      clearTimeout(debouncedResize.current);
    }
    
    debouncedResize.current = setTimeout(() => {
      resizeTextarea();
    }, 10); // 10ms debounce
  }, [resizeTextarea]);

  // Effect to handle resize on value changes
  React.useEffect(() => {
    debouncedResizeTextarea();
  }, [props.value, debouncedResizeTextarea]);

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
  }, [resizeTextarea]);

  // Observe changes to the parent element's size
  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const resizeObserver = new ResizeObserver(() => {
      // When the parent element changes size, adjust height accordingly
      debouncedResizeTextarea();
    });

    const parent = textarea.parentElement;
    if (parent) {
      resizeObserver.observe(parent);
    }

    return () => {
      resizeObserver.disconnect();
      if (debouncedResize.current) {
        clearTimeout(debouncedResize.current);
      }
    };
  }, [debouncedResizeTextarea]);
  
  // Handle window resize with debounce
  React.useEffect(() => {
    const handleResize = () => {
      debouncedResizeTextarea();
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (debouncedResize.current) {
        clearTimeout(debouncedResize.current);
      }
    };
  }, [debouncedResizeTextarea]);

  return (
    <textarea
      ref={textareaRef}
      className={cn(
        "flex w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-hidden",
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