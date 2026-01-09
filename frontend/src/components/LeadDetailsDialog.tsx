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

    const getMetaValue = (key: string) => {
        if (!customer.meta_data) return undefined;
        if (customer.meta_data instanceof Map) return customer.meta_data.get(key);
        return (customer.meta_data as any)[key];
    };

    const isMeta = !!getMetaValue('meta_lead_id');

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[480px] bg-[#020617] text-white border-slate-800 p-0 overflow-hidden outline-none">
                <div className="p-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-2 text-blue-400">
                        <FileText className="h-5 w-5" />
                        <h2 className="text-lg font-bold tracking-tight">Lead Source Details</h2>
                    </div>

                    {isMeta ? (
                        <div className="space-y-6">
                            {/* Metadata Grid */}
                            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Tag className="h-4 w-4" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Campaign</span>
                                    </div>
                                    <p className="text-sm font-bold pl-6 text-slate-100">{getMetaValue('meta_campaign') || "N/A"}</p>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Tag className="h-4 w-4" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Ad Set</span>
                                    </div>
                                    <p className="text-sm font-bold pl-6 text-slate-100">{getMetaValue('meta_ad_set') || "N/A"}</p>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Tag className="h-4 w-4" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Ad Name</span>
                                    </div>
                                    <p className="text-sm font-bold pl-6 text-slate-100">{getMetaValue('meta_ad') || "N/A"}</p>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Info className="h-4 w-4" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Lead ID</span>
                                    </div>
                                    <p className="text-sm font-bold pl-6 text-slate-300">{getMetaValue('meta_lead_id') || "N/A"}</p>
                                </div>
                            </div>

                            {/* Form Responses Section */}
                            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400/90 mb-2">Form Responses</h3>
                                <div className="space-y-4">
                                    {/* Map meta_data entries that aren't system fields */}
                                    {(() => {
                                        const entries = customer.meta_data instanceof Map
                                            ? Array.from(customer.meta_data.entries())
                                            : Object.entries(customer.meta_data || {});

                                        const formFields = entries.filter(([key]) => !key.startsWith('meta_'));

                                        // Logical ordering for top fields
                                        const allFields = [...formFields];
                                        if (!allFields.find(([k]) => k.toLowerCase().includes('phone')))
                                            allFields.unshift(['phone', customer.phone_number]);
                                        if (!allFields.find(([k]) => k.toLowerCase().includes('company')))
                                            allFields.unshift(['company name', customer.company_name]);
                                        if (!allFields.find(([k]) => k.toLowerCase().includes('name') || k.toLowerCase().includes('full')))
                                            allFields.unshift(['full name', customer.customer_name]);

                                        return allFields.map(([key, value]) => (
                                            <div key={key} className="flex justify-between items-start gap-4 border-b border-slate-800/60 pb-2">
                                                <span className="text-xs text-slate-500 whitespace-nowrap">{key.replace(/_/g, ' ')}</span>
                                                <span className="text-xs font-bold text-slate-100 text-right break-all">
                                                    {String(value).startsWith('http') ? (
                                                        <a href={String(value)} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                                            {String(value)}
                                                        </a>
                                                    ) : (
                                                        String(value)
                                                    )}
                                                </span>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-500 space-y-2 border border-dashed border-slate-800 rounded-xl">
                            <Info className="h-8 w-8 opacity-20" />
                            <p className="text-sm italic">Manual/Imported lead - No source data found.</p>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex justify-between items-center text-[10px] text-slate-500 pt-4 px-1 border-t border-slate-800/50">
                        <span>Created: {customer.created_at ? format(parseISO(customer.created_at), "MMMM do, yyyy h:mm a") : "N/A"}</span>
                        <span>ID: {customer.id}</span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
