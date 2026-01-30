import { format, parseISO } from "date-fns";
import { Customer } from "@/types";
import { memo } from "react";

interface LightweightCustomerRowProps {
    customer: Customer;
    onRowHover: (customerId: string) => void;
    is_meta?: boolean;
}

/**
 * Ultra-lightweight read-only row for instant rendering
 * Renders only text - no inputs, no buttons, no heavy components
 * Converts to full interactive SpreadsheetRow on hover
 */
export const LightweightCustomerRow = memo(({ customer, onRowHover, is_meta }: LightweightCustomerRowProps) => {
    const handleMouseEnter = () => {
        onRowHover(customer.id);
    };

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return "";
        try {
            return format(parseISO(dateString), "MMM dd, yyyy");
        } catch {
            return "";
        }
    };

    const formatTime = (timeString: string | null | undefined) => {
        if (!timeString) return "";
        return timeString;
    };

    return (
        <tr
            onMouseEnter={handleMouseEnter}
            className="group hover:bg-muted/30 cursor-pointer transition-colors border-b border-border/30"
            style={{ height: "60px" }}
        >
            {/* Drag Handle Placeholder */}
            <td className="px-2 w-8">
                <div className="h-5 w-5 opacity-0 group-hover:opacity-50 flex items-center justify-center">
                    <div className="h-4 w-4 grid grid-cols-2 gap-0.5">
                        <div className="h-1 w-1 rounded-full bg-muted-foreground" />
                        <div className="h-1 w-1 rounded-full bg-muted-foreground" />
                        <div className="h-1 w-1 rounded-full bg-muted-foreground" />
                        <div className="h-1 w-1 rounded-full bg-muted-foreground" />
                    </div>
                </div>
            </td>

            {/* Checkbox Placeholder */}
            <td className="px-2 w-10">
                <div className="h-4 w-4 border rounded opacity-50" />
            </td>

            {/* Position */}
            <td className="px-2 text-xs text-muted-foreground w-12">
                {customer.position || ""}
            </td>

            {/* Customer Name */}
            <td className="px-3 font-medium text-sm truncate max-w-[200px]">
                {customer.customer_name || ""}
                {is_meta && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-600 rounded font-semibold">
                        AUTO
                    </span>
                )}
            </td>

            {/* Company */}
            <td className="px-3 text-sm text-muted-foreground truncate max-w-[180px]">
                {customer.company_name || ""}
            </td>

            {/* Phone */}
            <td className="px-3 text-sm font-mono truncate">
                {customer.phone_number || ""}
            </td>

            {/* Next Call Date */}
            <td className="px-3 text-sm">
                {formatDate(customer.next_call_date)}
            </td>

            {/* Next Call Time */}
            <td className="px-3 text-sm text-muted-foreground">
                {formatTime(customer.next_call_time)}
            </td>

            {/* Notes */}
            <td className="px-3 text-xs text-muted-foreground truncate max-w-[200px] italic">
                {customer.notes || ""}
            </td>

            {/* Actions Placeholder */}
            <td className="px-2 text-right w-32">
                <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="h-8 w-8 rounded border bg-muted/50" />
                    <div className="h-8 w-8 rounded border bg-muted/50" />
                    <div className="h-8 w-8 rounded border bg-muted/50" />
                </div>
            </td>
        </tr>
    );
}, (prevProps, nextProps) => {
    // Only re-render if customer data changed
    return prevProps.customer.id === nextProps.customer.id &&
        prevProps.customer.updated_at === nextProps.customer.updated_at;
});

LightweightCustomerRow.displayName = "LightweightCustomerRow";
