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
        // For content, determine if text actually spans multiple visual lines
        // by checking if scrollHeight is greater than single line height
        const isMultiline = scrollHeight > singleLineHeight * 1.5; // 1.5 factor to account for potential rounding differences
        
        if (logicalLines > 1 || isMultiline) {
          // For multiline content, use the larger of scrollHeight or logical line calculation
          newHeight = Math.max(scrollHeight, singleLineHeight * logicalLines);
        } else {
          // For single line content, use single line height
          newHeight = singleLineHeight;
        }
      }
      
      // Apply min height constraint appropriately
      // For single line content that doesn't need the minHeight, use the calculated height
      // But ensure it's at least the single line height
      if (logicalLines <= 1 && !isMultiline) {
        // For truly single line content, use calculated height but ensure it's at least single line height
        newHeight = Math.max(newHeight, singleLineHeight);
      } else {
        // For multiline content or when minHeight is needed, apply constraints
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