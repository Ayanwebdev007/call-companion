import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoHeight?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoHeight = false, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    
    // Force textarea to fill container when autoHeight is enabled
    React.useEffect(() => {
      if (autoHeight && textareaRef.current) {
        const textarea = textareaRef.current;
        
        // Set initial styles
        textarea.style.height = '100%';
        textarea.style.minHeight = '100%';
        textarea.style.boxSizing = 'border-box';
        
        // Create a MutationObserver to watch for style changes
        const observer = new MutationObserver(() => {
          // Ensure height stays at 100%
          if (textarea.style.height !== '100%') {
            textarea.style.height = '100%';
          }
        });
        
        // Observe changes to the textarea's attributes
        observer.observe(textarea, {
          attributes: true,
          attributeFilter: ['style']
        });
        
        // Cleanup
        return () => {
          observer.disconnect();
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