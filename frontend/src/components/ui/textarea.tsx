import * as React from "react";

import { cn } from "@/lib/utils";

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxHeight?: number;
}

const AutoResizeTextarea = React.forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(({ className, maxHeight = 300, ...props }, ref) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useImperativeHandle(ref, () => textareaRef.current!);

  const previousWidthRef = React.useRef(0);

  const resizeTextarea = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // We only want to reset height and re-measure if the width actually changed or if it's a value update/manual trigger.
    // However, since this function is cheap enough, we can just do it. 
    // But to avoid ResizeObserver loops, we must be careful.

    // Reset height to auto to calculate the scrollHeight correctly
    textarea.style.height = 'auto';

    // Calculate new height
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
  }, [maxHeight]);

  React.useLayoutEffect(() => {
    resizeTextarea();
  }, [props.value, resizeTextarea]);

  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === textarea) {
          // Check if width changed
          const newWidth = entry.contentRect.width;
          if (newWidth !== previousWidthRef.current && newWidth > 0) {
            previousWidthRef.current = newWidth;
            resizeTextarea();
          }
        }
      }
    });

    observer.observe(textarea);
    return () => observer.disconnect();
  }, [resizeTextarea]);

  return (
    <textarea
      ref={textareaRef}
      className={cn(
        "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
        className,
      )}
      rows={1}
      onInput={resizeTextarea}
      {...props}
    />
  );
});

AutoResizeTextarea.displayName = "AutoResizeTextarea";

export { AutoResizeTextarea };
export type { AutoResizeTextareaProps };