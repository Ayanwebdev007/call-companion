import * as React from "react";
import { cn } from "../../lib/utils";
import { GripVertical } from "lucide-react";

interface ResizableTableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  containerClassName?: string;
}

const ResizableTable = React.forwardRef<HTMLTableElement, ResizableTableProps>(
  ({ className, containerClassName, ...props }, ref) => (
    <div className={cn("relative w-full h-full", containerClassName)}>
      <div className="h-full overflow-auto">
      <table
        ref={ref}
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      />
      </div>
    </div>
  )
);
ResizableTable.displayName = "ResizableTable";

const ResizableTableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
ResizableTableHeader.displayName = "ResizableTableHeader";

const ResizableTableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
ResizableTableBody.displayName = "ResizableTableBody";

const ResizableTableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
));
ResizableTableFooter.displayName = "ResizableTableFooter";

const ResizableTableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors data-[state=selected]:bg-muted hover:bg-muted/50",
      className
    )}
    {...props}
  />
));
ResizableTableRow.displayName = "ResizableTableRow";

interface ResizableTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  resizable?: boolean;
  onResize?: (width: number) => void;
}

const ResizableTableHead = React.forwardRef<HTMLTableCellElement, ResizableTableHeadProps>(
  ({ className, resizable = true, onResize, ...props }, ref) => {
    const thRef = React.useRef<HTMLTableCellElement>(null);
    const [isResizing, setIsResizing] = React.useState(false);
    const startX = React.useRef(0);
    const startWidth = React.useRef(0);

    const initResize = React.useCallback((e: React.MouseEvent) => {
      if (!resizable || !thRef.current) return;
      
      e.preventDefault();
      setIsResizing(true);
      startX.current = e.clientX;
      startWidth.current = thRef.current.offsetWidth;
      
      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!thRef.current) return;
        
        const newWidth = startWidth.current + (moveEvent.clientX - startX.current);
        thRef.current.style.width = `${Math.max(50, newWidth)}px`;
        
        if (onResize) {
          onResize(newWidth);
        }
      };
      
      const onMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    }, [resizable, onResize]);

    return (
      <th
        ref={thRef}
        className={cn(
          "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 relative",
          className,
          resizable && "overflow-hidden group"
        )}
        {...props}
      >
        {props.children}
        {resizable && (
          <div 
            className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-muted-foreground/20 hover:bg-muted-foreground/50 group-hover:bg-muted-foreground/50"
            onMouseDown={initResize}
            role="separator"
            aria-orientation="vertical"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                if (thRef.current) {
                  const delta = e.key === 'ArrowLeft' ? -10 : 10;
                  const newWidth = Math.max(50, thRef.current.offsetWidth + delta);
                  thRef.current.style.width = `${newWidth}px`;
                  if (onResize) {
                    onResize(newWidth);
                  }
                }
              }
            }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 hidden group-hover:block">
              <GripVertical className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
        )}
      </th>
    );
  }
);
ResizableTableHead.displayName = "ResizableTableHead";

interface ResizableTableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  resizable?: boolean;
}

const ResizableTableCell = React.forwardRef<HTMLTableCellElement, ResizableTableCellProps>(
  ({ className, resizable = true, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        "p-4 align-middle [&:has([role=checkbox])]:pr-0 relative",
        className,
        resizable && "overflow-hidden"
      )}
      {...props}
    />
  )
);
ResizableTableCell.displayName = "ResizableTableCell";

const ResizableTableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
));
ResizableTableCaption.displayName = "ResizableTableCaption";

export {
  ResizableTable,
  ResizableTableHeader,
  ResizableTableBody,
  ResizableTableFooter,
  ResizableTableHead,
  ResizableTableRow,
  ResizableTableCell,
  ResizableTableCaption,
};