import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoHeight?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoHeight = false, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    
    // Auto-resize textarea to fill container when autoHeight is enabled
    React.useEffect(() => {
      if (autoHeight && textareaRef.current) {
        const resizeObserver = new ResizeObserver(entries => {
          for (let entry of entries) {
            const textarea = entry.target as HTMLTextAreaElement;
            // Force the textarea to fill its container
            textarea.style.height = '100%';
          }
        });
        
        resizeObserver.observe(textareaRef.current);
        
        // Also listen for input changes to adjust height dynamically
        const handleInput = () => {
          if (textareaRef.current) {
            textareaRef.current.style.height = '100%';
          }
        };
        
        textareaRef.current.addEventListener('input', handleInput);
        
        return () => {
          resizeObserver.disconnect();
          if (textareaRef.current) {
            textareaRef.current.removeEventListener('input', handleInput);
          }
        };
      }
    }, [autoHeight]);
    
    return (
      <textarea
        ref={(node) => {
          textareaRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          autoHeight ? "h-full min-h-full resize-none box-border" : "min-h-[80px]",
          className
        )}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }