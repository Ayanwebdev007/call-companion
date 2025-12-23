import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Customer, updateCustomer } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AutoResizeTextarea } from "@/components/ui/textarea";
import { Phone, CheckCircle2, XCircle, Clock, Voicemail, ArrowRight, ArrowLeft, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface CallModeOverlayProps {
    customers: Customer[];
    initialIndex: number;
    onClose: () => void;
    spreadsheetId: string;
}

export const CallModeOverlay = ({ customers, initialIndex, onClose, spreadsheetId }: CallModeOverlayProps) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [remark, setRemark] = useState("");
    const queryClient = useQueryClient();

    const currentCustomer = customers[currentIndex];

    useEffect(() => {
        if (currentCustomer) {
            setRemark(currentCustomer.remark || "");
        }
    }, [currentCustomer]);

    const handleStatusUpdate = async (status: Customer['status']) => {
        if (!currentCustomer) return;

        // Optimistic update
        queryClient.setQueryData(["customers", spreadsheetId], (old: Customer[] | undefined) => {
            if (!old) return [];
            return old.map(c =>
                c.id === currentCustomer.id ? { ...c, status, remark, call_count: (c.call_count || 0) + 1 } : c
            );
        });

        try {
            await updateCustomer(currentCustomer.id, {
                status,
                remark,
                call_count: (currentCustomer.call_count || 0) + 1
            });

            // Auto advance to next customer
            if (currentIndex < customers.length - 1) {
                setCurrentIndex(prev => prev + 1);
            }
        } catch (error) {
            console.error("Failed to update status", error);
            // Revert optimistic update? For now let's just rely on error toast if we had one
        }
    };

    const navigate = (direction: 'next' | 'prev') => {
        if (direction === 'next' && currentIndex < customers.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else if (direction === 'prev' && currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    if (!currentCustomer) return null;

    return (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-4xl grid gap-6">
                {/* Header Controls */}
                <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
                    <div className="flex items-center gap-4">
                        <span className="text-muted-foreground font-mono text-sm">
                            Lead {currentIndex + 1} of {customers.length}
                        </span>
                        <div className="h-4 w-px bg-border" />
                        <span className="text-sm font-medium">
                            Focus Mode
                        </span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-destructive/10 hover:text-destructive">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Main Card */}
                <Card className="border-border/50 shadow-2xl bg-card/60 backdrop-blur-xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-8 border-b border-border/50">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-4xl font-bold tracking-tight text-foreground">{currentCustomer.customer_name}</h2>
                                <p className="text-xl text-muted-foreground mt-2 font-light">{currentCustomer.company_name}</p>
                            </div>
                            <Badge variant="outline" className={cn(
                                "text-sm px-3 py-1 uppercase tracking-widest",
                                currentCustomer.status === 'Interested' ? "bg-green-500/10 text-green-500 border-green-500/20" :
                                    currentCustomer.status === 'Not Interested' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                        "bg-secondary text-secondary-foreground"
                            )}>
                                {currentCustomer.status || 'New'}
                            </Badge>
                        </div>

                        <div className="mt-8 flex items-center gap-6">
                            <a href={`tel:${currentCustomer.phone_number}`} className="flex items-center gap-3 text-3xl font-mono font-bold text-primary hover:text-primary/80 transition-colors">
                                <Phone className="h-8 w-8 fill-current" />
                                {currentCustomer.phone_number}
                            </a>
                        </div>
                    </CardHeader>

                    <CardContent className="p-8 grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Notes & Remarks</label>
                                <AutoResizeTextarea
                                    value={remark}
                                    onChange={(e) => setRemark(e.target.value)}
                                    placeholder="Type notes here..."
                                    className="min-h-[200px] text-lg bg-secondary/30 resize-none focus-visible:ring-primary/20"
                                />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Quick Actions</label>

                            <div className="grid grid-cols-2 gap-4">
                                <Button
                                    size="lg"
                                    className="h-16 text-lg bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20"
                                    onClick={() => handleStatusUpdate('Interested')}
                                >
                                    <CheckCircle2 className="mr-2 h-6 w-6" /> Interested
                                </Button>

                                <Button
                                    size="lg"
                                    variant="secondary"
                                    className="h-16 text-lg hover:bg-secondary/80 shadow-sm"
                                    onClick={() => handleStatusUpdate('Follow Up')}
                                >
                                    <Clock className="mr-2 h-6 w-6" /> Follow Up
                                </Button>

                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="h-16 text-lg border-orange-500/20 text-orange-600 hover:bg-orange-500/10"
                                    onClick={() => handleStatusUpdate('Voicemail')}
                                >
                                    <Voicemail className="mr-2 h-6 w-6" /> Voicemail
                                </Button>

                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="h-16 text-lg border-red-500/20 text-red-600 hover:bg-red-500/10"
                                    onClick={() => handleStatusUpdate('Not Interested')}
                                >
                                    <XCircle className="mr-2 h-6 w-6" /> Not Interested
                                </Button>
                            </div>

                            <div className="pt-8 flex items-center justify-between gap-4">
                                <Button
                                    variant="ghost"
                                    size="lg"
                                    onClick={() => navigate('prev')}
                                    disabled={currentIndex === 0}
                                    className="flex-1"
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                                </Button>
                                <Button
                                    variant="default"
                                    size="lg"
                                    onClick={() => navigate('next')}
                                    disabled={currentIndex === customers.length - 1}
                                    className="flex-1 bg-primary text-primary-foreground shadow-xl shadow-primary/20"
                                >
                                    Next Lead <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
