import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Customer } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Info, Calendar, Clock, Tag, Briefcase, Phone, User } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";

interface LeadDetailsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Customer | null;
}

export function LeadDetailsDialog({ isOpen, onClose, customer }: LeadDetailsDialogProps) {
    if (!customer) return null;

    const isMeta = !!customer.meta_data?.meta_lead_id;
    const origin = isMeta ? "Meta Ads" : "Manual / Import";

    const renderDetailItem = (icon: React.ReactNode, label: string, value: string | undefined) => (
        <div className="flex items-start gap-3 py-2">
            <div className="mt-0.5 text-muted-foreground">{icon}</div>
            <div className="flex flex-col">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
                <span className="text-sm font-semibold">{value || "N/A"}</span>
            </div>
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] overflow-hidden">
                <DialogHeader className="pb-4 border-b">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <User className="h-5 w-5 text-primary" />
                            Lead Details
                        </DialogTitle>
                        <Badge variant={isMeta ? "default" : "secondary"} className="mr-4">
                            {origin}
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4 pt-4 overflow-y-auto max-h-[70vh] pr-2">
                    {/* Standard Fields */}
                    <div className="col-span-2 bg-muted/30 p-3 rounded-lg border border-border/50">
                        <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                            <Info className="h-4 w-4" /> Basic Information
                        </h3>
                        <div className="grid grid-cols-2 gap-y-2">
                            {renderDetailItem(<User className="h-4 w-4" />, "Name", customer.customer_name)}
                            {renderDetailItem(<Briefcase className="h-4 w-4" />, "Company", customer.company_name)}
                            {renderDetailItem(<Phone className="h-4 w-4" />, "Phone", customer.phone_number)}
                            {renderDetailItem(<Tag className="h-4 w-4" />, "Status", customer.status)}
                        </div>
                    </div>

                    <Separator className="col-span-2 my-2" />

                    {/* Call Schedule */}
                    <div className="col-span-2">
                        <h3 className="text-sm font-bold mb-2 flex items-center gap-2 text-primary">
                            <Calendar className="h-4 w-4" /> Schedule & Notes
                        </h3>
                        <div className="grid grid-cols-2 gap-y-2">
                            {renderDetailItem(<Calendar className="h-4 w-4" />, "Next Call", customer.next_call_date)}
                            {renderDetailItem(<Clock className="h-4 w-4" />, "Next Time", customer.next_call_time)}
                            {renderDetailItem(<Calendar className="h-4 w-4" />, "Last Call", customer.last_call_date)}
                            <div className="col-span-2 mt-2">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Remark</span>
                                <p className="text-sm mt-1 p-2 bg-background border rounded-md min-h-[60px] whitespace-pre-wrap">
                                    {customer.remark || "No remarks added."}
                                </p>
                            </div>
                        </div>
                    </div>

                    <Separator className="col-span-2 my-2" />

                    {/* Metadata / Source Information */}
                    <div className="col-span-2">
                        <h3 className="text-sm font-bold mb-2 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <FileText className="h-4 w-4" /> Lead Source Details
                        </h3>

                        <div className="space-y-3">
                            {isMeta ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        {renderDetailItem(<Tag className="h-4 w-4" />, "Campaign", customer.meta_data?.meta_campaign)}
                                        {renderDetailItem(<Tag className="h-4 w-4" />, "Ad Set", customer.meta_data?.meta_ad_set)}
                                        {renderDetailItem(<Tag className="h-4 w-4" />, "Ad Name", customer.meta_data?.meta_ad)}
                                        {renderDetailItem(<Info className="h-4 w-4" />, "Lead ID", customer.meta_data?.meta_lead_id)}
                                    </div>

                                    {/* Dynamic Meta Data */}
                                    <div className="mt-4 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                        <h4 className="text-xs font-bold mb-2 uppercase text-blue-700 dark:text-blue-300">Form Responses</h4>
                                        <div className="grid grid-cols-1 gap-2">
                                            {Object.entries(customer.meta_data || {}).map(([key, value]) => {
                                                // Skip system keys
                                                if (key.startsWith('meta_')) return null;
                                                return (
                                                    <div key={key} className="flex justify-between border-b border-blue-100/30 pb-1">
                                                        <span className="text-xs text-muted-foreground">{key.replace(/_/g, ' ')}</span>
                                                        <span className="text-xs font-semibold">{value}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="p-4 text-center border rounded-lg bg-muted/20">
                                    <p className="text-sm text-muted-foreground italic">Add manually or imported via file.</p>
                                </div>
                            )}

                            <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-4 px-1">
                                <span>Created: {customer.created_at ? format(parseISO(customer.created_at), "PPP p") : "N/A"}</span>
                                <span>ID: {customer.id}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
