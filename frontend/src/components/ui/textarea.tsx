import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoHeight?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoHeight = false, ...props }, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement>(null);
    
    // Merge refs and apply height styles
    const mergedRef = React.useCallback(
      (node: HTMLTextAreaElement) => {
        // Set the ref for internal use
        internalRef.current = node;
        
        // Call the forwarded ref
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
        
        // Apply height styles immediately when element is available
        if (autoHeight && node) {
          node.style.height = '100%';
          node.style.minHeight = '100%';
          node.style.boxSizing = 'border-box';
        }
      },
      [ref, autoHeight]
    );
    
    // Apply styles whenever props change
    React.useEffect(() => {
      if (autoHeight && internalRef.current) {
        internalRef.current.style.height = '100%';
        internalRef.current.style.minHeight = '100%';
        internalRef.current.style.boxSizing = 'border-box';
      }
    }, [autoHeight, props.style]);
    
    return (
      <textarea
        ref={mergedRef}
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          autoHeight ? "h-full min-h-full resize-none box-border" : "min-h-[80px]",
          className
        )}
        {...props}
        style={{
          ...props.style,
          height: autoHeight ? '100%' : props.style?.height,
          minHeight: autoHeight ? '100%' : props.style?.minHeight,
          boxSizing: autoHeight ? 'border-box' : props.style?.boxSizing,
        }}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }