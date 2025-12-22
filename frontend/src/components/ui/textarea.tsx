import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoHeight?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autoHeight = false, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
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
        }}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }