
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWhatsAppStatus, connectWhatsApp, logoutWhatsApp } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MessageSquare, QrCode, RefreshCw, LogOut, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const WhatsAppSettings = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isPolling, setIsPolling] = useState(false);

    const { data: statusData, isLoading: isStatusLoading, error: statusError } = useQuery({
        queryKey: ["whatsapp-status"],
        queryFn: fetchWhatsAppStatus,
        refetchInterval: isPolling ? 2000 : 10000,
        enabled: !!user,
    });

    useEffect(() => {
        if (statusData?.status === "connecting") {
            setIsPolling(true);
        } else {
            setIsPolling(false);
        }
    }, [statusData?.status]);

    const connectMutation = useMutation({
        mutationFn: connectWhatsApp,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["whatsapp-status"] });
            setIsPolling(true);
            toast({ title: "Connecting to WhatsApp...", description: "Please wait for the QR code." });
        },
        onError: (error: any) => {
            toast({
                title: "Connection failed",
                description: error.response?.data?.message || "Could not initialize WhatsApp connection.",
                variant: "destructive",
            });
        },
    });

    const logoutMutation = useMutation({
        mutationFn: logoutWhatsApp,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["whatsapp-status"] });
            toast({ title: "Logged out", description: "WhatsApp disconnected successfully." });
        },
        onError: (error: any) => {
            toast({
                title: "Logout failed",
                description: error.response?.data?.message || "Could not disconnect WhatsApp.",
                variant: "destructive",
            });
        },
    });

    const getStatusColor = () => {
        switch (statusData?.status) {
            case "connected":
                return "bg-green-500/10 text-green-500 border-green-500/20";
            case "connecting":
                return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
            case "disconnected":
                return "bg-red-500/10 text-red-500 border-red-500/20";
            default:
                return "bg-gray-500/10 text-gray-500 border-gray-500/20";
        }
    };

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="bg-background relative overflow-hidden">
                {/* Background gradients */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

                <header className="sticky top-0 z-50 flex h-16 w-full items-center gap-4 border-b border-border/40 bg-background/60 backdrop-blur-xl px-4 shadow-sm">
                    <SidebarTrigger />
                    <div className="flex-1">
                        <h1 className="text-lg font-semibold text-left">WhatsApp Settings</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-full border border-border/50">
                            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                {user?.username?.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium hidden md:block">{user?.username}</span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-6 md:p-8 pt-6 relative z-10 animate-fade-in">
                    <div className="max-w-2xl mx-auto space-y-8">
                        <div className="flex flex-col gap-2 text-left">
                            <h2 className="text-3xl font-bold tracking-tight text-foreground">Connect your account</h2>
                            <p className="text-muted-foreground">
                                Link your personal WhatsApp account to send posters and community messages directly to your leads.
                            </p>
                        </div>

                        <Card className="border-border/50 bg-card/60 backdrop-blur-md shadow-xl overflow-hidden">
                            <CardHeader className="border-b border-border/10 pb-6 text-left">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-primary/10 rounded-xl">
                                            <MessageSquare className="h-6 w-6 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle>WhatsApp Connection</CardTitle>
                                            <CardDescription>Manage your WhatsApp session</CardDescription>
                                        </div>
                                    </div>
                                    <Badge className={`${getStatusColor()} border px-3 py-1 capitalize animate-in fade-in zoom-in duration-300`}>
                                        {statusData?.status || "disconnected"}
                                    </Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-8 pb-8 flex flex-col items-center justify-center min-h-[300px]">
                                {isStatusLoading ? (
                                    <div className="flex flex-col items-center gap-4 animate-pulse">
                                        <div className="h-48 w-48 bg-secondary/50 rounded-2xl flex items-center justify-center">
                                            <Loader2 className="h-10 w-10 text-primary animate-spin" />
                                        </div>
                                        <p className="text-sm text-muted-foreground">Checking status...</p>
                                    </div>
                                ) : statusData?.status === "connected" ? (
                                    <div className="flex flex-col items-center gap-6 text-center animate-in zoom-in duration-500">
                                        <div className="h-32 w-32 bg-green-500/10 rounded-full flex items-center justify-center border-4 border-green-500/20 shadow-[0_0_50px_-12px_rgba(34,197,94,0.5)]">
                                            <CheckCircle2 className="h-16 w-16 text-green-500" />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-bold text-foreground">WhatsApp Linked</h3>
                                            <p className="text-sm text-muted-foreground max-w-xs">
                                                Your account is currently active and ready to send messages.
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={() => logoutMutation.mutate()}
                                            disabled={logoutMutation.isPending}
                                            className="border-red-500/20 hover:bg-red-500/10 hover:text-red-500 group transition-all"
                                        >
                                            <LogOut className="h-4 w-4 mr-2 group-hover:translate-x-1 transition-transform" />
                                            Disconnect Account
                                        </Button>
                                    </div>
                                ) : statusData?.status === "connecting" && statusData?.qr ? (
                                    <div className="flex flex-col items-center gap-6 text-center animate-in slide-in-from-bottom-8 duration-500">
                                        <div className="p-4 bg-white rounded-2xl shadow-2xl animate-in zoom-in duration-700 delay-200">
                                            <img src={statusData.qr} alt="WhatsApp QR Code" className="h-48 w-48" />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-lg font-bold text-foreground">Scan QR Code</h3>
                                            <p className="text-sm text-muted-foreground max-w-xs">
                                                Open WhatsApp on your phone, go to Linked Devices, and scan this code.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-medium text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 px-3 py-1.5 rounded-full">
                                            <RefreshCw className="h-3 w-3 animate-spin" />
                                            Polling for connection...
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-6 text-center animate-in fade-in duration-700">
                                        <div className="h-24 w-24 bg-primary/10 rounded-2xl flex items-center justify-center">
                                            <QrCode className="h-12 w-12 text-primary/50" />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-lg font-bold text-foreground">No account linked</h3>
                                            <p className="text-sm text-muted-foreground max-w-xs">
                                                Connect your WhatsApp to start sending messages directly to leads.
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => connectMutation.mutate()}
                                            disabled={connectMutation.isPending}
                                            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 min-w-[180px]"
                                        >
                                            {connectMutation.isPending ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <QrCode className="h-4 w-4 mr-2" />
                                            )}
                                            Link WhatsApp
                                        </Button>
                                    </div>
                                )}
                            </CardContent>

                            <CardFooter className="bg-secondary/30 border-t border-border/10 p-6">
                                <div className="flex gap-3 text-left">
                                    <div className="mt-1">
                                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Note: We do not store your messages. This connection only allows our platform
                                        to send posters and messages on your behalf when you trigger them. You can
                                        disconnect at any time.
                                    </p>
                                </div>
                            </CardFooter>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="border-border/50 bg-card/40 hover:bg-card/60 transition-colors cursor-help">
                                <CardContent className="p-6 flex items-start gap-4">
                                    <div className="p-2 bg-blue-500/10 rounded-lg">
                                        <MessageSquare className="h-4 w-4 text-blue-500" />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="text-sm font-semibold mb-1">Direct Outreach</h4>
                                        <p className="text-xs text-muted-foreground">Send personalized posters and templates directly from your number.</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-border/50 bg-card/40 hover:bg-card/60 transition-colors cursor-help">
                                <CardContent className="p-6 flex items-start gap-4">
                                    <div className="p-2 bg-purple-500/10 rounded-lg">
                                        <CheckCircle2 className="h-4 w-4 text-purple-500" />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="text-sm font-semibold mb-1">Better Trust</h4>
                                        <p className="text-xs text-muted-foreground">Leads are more likely to respond to a real number than a business API.</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
};

export default WhatsAppSettings;
