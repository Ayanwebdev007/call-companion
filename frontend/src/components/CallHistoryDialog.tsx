import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

interface CallLog {
    _id: string;
    call_type: 'incoming' | 'outgoing' | 'missed' | 'rejected' | 'blocked' | 'unknown';
    duration: number;
    timestamp: string;
    note?: string;
}

interface CallHistoryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    customerName: string;
    phoneNumber: string;
}

export function CallHistoryDialog({ isOpen, onClose, customerName, phoneNumber }: CallHistoryDialogProps) {
    const [logs, setLogs] = useState<CallLog[]>([]);
    const [loading, setLoading] = useState(false);
    const { token, user } = useAuth(); // Assuming 'user' might be needed later, simplifying for now

    // Fixed: Use the correct backend URL (localhost:5000)
    // In a real app, use an env var or a configured axios instance
    const API_URL = 'http://localhost:5000/api/mobile';

    useEffect(() => {
        if (isOpen && phoneNumber && token) {
            setLoading(true);
            fetch(`${API_URL}/logs/${encodeURIComponent(phoneNumber)}`, {
                headers: { 'x-auth-token': token }
            })
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setLogs(data);
                    } else {
                        setLogs([]);
                    }
                })
                .catch(err => console.error("Failed to fetch logs", err))
                .finally(() => setLoading(false));
        }
    }, [isOpen, phoneNumber, token]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'incoming': return <PhoneIncoming className="h-4 w-4 text-green-500" />;
            case 'outgoing': return <PhoneOutgoing className="h-4 w-4 text-blue-500" />;
            case 'missed': return <PhoneMissed className="h-4 w-4 text-red-500" />;
            default: return <Phone className="h-4 w-4 text-gray-500" />;
        }
    };

    const formatDuration = (seconds: number) => {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min}m ${sec}s`;
    };

    const handleCallNow = () => {
        window.location.href = `tel:${phoneNumber}`;
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Call History</DialogTitle>
                    <DialogDescription>
                        History for <span className="font-semibold text-foreground">{customerName}</span> ({phoneNumber})
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                        {loading ? (
                            <div className="flex justify-center items-center h-full text-muted-foreground">Loading...</div>
                        ) : logs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                                <Clock className="h-8 w-8 opacity-20" />
                                <p>No call history found</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {logs.map((log) => (
                                    <div key={log._id} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-secondary/50 rounded-full">
                                                {getIcon(log.call_type)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium capitalize">{log.call_type} Call</p>
                                                <p className="text-xs text-muted-foreground">{format(new Date(log.timestamp), "MMM d, h:mm a")}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium">{formatDuration(log.duration)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <div className="flex justify-center pt-2">
                    <Button onClick={handleCallNow} className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white">
                        <Phone className="h-4 w-4" />
                        Call Now
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
