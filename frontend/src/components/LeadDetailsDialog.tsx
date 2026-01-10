import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Customer, requestMobileCall, getCallLogs, CallLog } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Info, Calendar, Clock, Tag, Briefcase, Phone, User, History, PhoneIncoming, PhoneOutgoing, PhoneMissed } from "lucide-react";
import { format, parseISO, isValid, formatDuration } from "date-fns";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LeadDetailsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Customer | null;
}

export function LeadDetailsDialog({ isOpen, onClose, customer }: LeadDetailsDialogProps) {
    const { toast } = useToast();
    const [callLogs, setCallLogs] = useState<CallLog[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [calling, setCalling] = useState(false);

    useEffect(() => {
        if (isOpen && customer) {
            fetchCallLogs();
        }
    }, [isOpen, customer]);

    const fetchCallLogs = async () => {
        if (!customer) return;
        setLoadingLogs(true);
        try {
            const logs = await getCallLogs(customer.id);
            setCallLogs(logs);
        } catch (error) {
            console.error("Failed to fetch call logs", error);
        } finally {
            setLoadingLogs(false);
        }
    };

    const handleCall = async () => {
        if (!customer) return;
        setCalling(true);
        try {
            await requestMobileCall(customer.id, customer.phone_number, customer.customer_name);
            toast({
                title: "Call Request Sent",
                description: "Check your mobile device to start the call.",
                duration: 5000,
            });
        } catch (error) {
            toast({
                title: "Call Failed",
                description: "Could not send call request to mobile.",
                variant: "destructive",
            });
        } finally {
            setCalling(false);
        }
    };

    if (!customer) return null;

    const getMetaValue = (key: string) => {
        if (!customer.meta_data) return undefined;
        if (customer.meta_data instanceof Map) return customer.meta_data.get(key);
        return (customer.meta_data as any)[key];
    };

    const isMeta = !!getMetaValue('meta_lead_id');

    const formatCallDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px] bg-[#020617] text-white border-slate-800 p-0 overflow-hidden outline-none flex flex-col md:flex-row h-[80vh] md:h-[600px]">
                {/* Left Panel - Lead Details */}
                <ScrollArea className="flex-1 p-6 border-r border-slate-800/50">
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-blue-400">
                                <FileText className="h-5 w-5" />
                                <h2 className="text-lg font-bold tracking-tight">Lead Details</h2>
                            </div>
                            <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white gap-2"
                                onClick={handleCall}
                                disabled={calling}
                            >
                                <Phone className="h-4 w-4" />
                                {calling ? "Requesting..." : "Call via Mobile"}
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Name</label>
                                    <p className="font-semibold text-slate-200">{customer.customer_name}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone</label>
                                    <p className="font-semibold text-slate-200 font-mono">{customer.phone_number}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Company</label>
                                    <p className="font-semibold text-slate-200">{customer.company_name}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</label>
                                    <Badge variant="outline" className="border-slate-700 text-slate-300">{customer.status || 'New'}</Badge>
                                </div>
                            </div>
                        </div>

                        {isMeta ? (
                            <div className="space-y-6">
                                <Separator className="bg-slate-800" />
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
                                </div>

                                {/* Form Responses Section */}
                                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400/90 mb-2">Form Responses</h3>
                                    <div className="space-y-4">
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
                                                        {String(value)}
                                                    </span>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-6 flex flex-col items-center justify-center text-slate-500 space-y-2 border border-dashed border-slate-800 rounded-xl mt-6">
                                <Info className="h-6 w-6 opacity-20" />
                                <p className="text-xs italic">Manual lead - No meta data.</p>
                            </div>
                        )}

                        <div className="flex justify-between items-center text-[10px] text-slate-500 pt-4 px-1 border-t border-slate-800/50">
                            <span>Created: {customer.created_at ? format(parseISO(customer.created_at), "MMM do, yyyy") : "N/A"}</span>
                            <span>ID: {customer.id}</span>
                        </div>
                    </div>
                </ScrollArea>

                {/* Right Panel - Call History */}
                <div className="w-full md:w-[320px] bg-slate-950/50 flex flex-col border-l border-slate-800/50">
                    <div className="p-4 border-b border-slate-800/50 flex items-center gap-2 text-slate-300">
                        <History className="h-4 w-4" />
                        <h3 className="font-semibold text-sm">Call History</h3>
                    </div>

                    <ScrollArea className="flex-1 p-4">
                        {loadingLogs ? (
                            <div className="flex justify-center p-8">
                                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : callLogs.length === 0 ? (
                            <div className="text-center py-12 text-slate-600 text-sm">
                                <History className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                <p>No calls recorded yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {callLogs.map((log) => (
                                    <div key={log._id} className="p-3 rounded-lg bg-slate-900/50 border border-slate-800/50 flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {log.call_type === 'incoming' && <PhoneIncoming className="h-3 w-3 text-green-400" />}
                                                {log.call_type === 'outgoing' && <PhoneOutgoing className="h-3 w-3 text-blue-400" />}
                                                {(log.call_type === 'missed' || log.call_type === 'rejected') && <PhoneMissed className="h-3 w-3 text-red-400" />}
                                                <span className="text-xs font-medium capitalize text-slate-300">{log.call_type}</span>
                                            </div>
                                            <span className="text-[10px] text-slate-500">
                                                {format(parseISO(log.timestamp), "MMM d, h:mm a")}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs font-mono text-slate-400">{formatCallDuration(log.duration)}</span>
                                            {log.synced_from_mobile && (
                                                <Badge variant="secondary" className="text-[9px] h-4 px-1 bg-slate-800 text-slate-400 hover:bg-slate-800">
                                                    Mobile Sync
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
