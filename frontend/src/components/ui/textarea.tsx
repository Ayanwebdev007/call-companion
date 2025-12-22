import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxHeight?: number;
  minHeight?: number;
  minWidth?: number;
  maxWidth?: number;
}

const AutoResizeTextarea = React.forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ className, value, onChange, maxHeight, minHeight = 80, minWidth, maxWidth, style, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const syncSize = React.useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // Reset height to auto to get correct scrollHeight
      textarea.style.height = "auto";
      
      // Calculate new height based on content
      const newHeight = Math.min(
        maxHeight ? Math.max(minHeight, textarea.scrollHeight, maxHeight) : Math.max(minHeight, textarea.scrollHeight),
        maxHeight || Infinity
      );
      
      textarea.style.height = `${newHeight}px`;
      
      // Handle width if minWidth/maxWidth are provided
      if (minWidth !== undefined || maxWidth !== undefined) {
        let newWidth = textarea.scrollWidth;
        if (minWidth) newWidth = Math.max(newWidth, minWidth);
        if (maxWidth) newWidth = Math.min(newWidth, maxWidth);
        textarea.style.width = `${newWidth}px`;
      }
    }, [maxHeight, minHeight, minWidth, maxWidth]);

    React.useEffect(() => {
      syncSize();
    }, [value, syncSize]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (onChange) {
        onChange(e);
      }
      // Allow the state update to complete before syncing size
      setTimeout(syncSize, 0);
    };

    const combinedStyle = {
      ...style,
      resize: "none",
      overflow: "hidden",
      minHeight: `${minHeight}px`,
      minWidth,
      maxWidth,
    };

    return (
      <textarea
        ref={(el) => {
          textareaRef.current = el;
          if (typeof ref === "function") {
            ref(el);
          } else if (ref) {
            ref.current = el;
          }
        }}
        className={cn(
          "flex rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        style={combinedStyle}
        value={value}
        onChange={handleChange}
        {...props}
      />
    );
  }
);

AutoResizeTextarea.displayName = "AutoResizeTextarea";

export { Textarea, AutoResizeTextarea };
export type { TextareaProps, AutoResizeTextareaProps };