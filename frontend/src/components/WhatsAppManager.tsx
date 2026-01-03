import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw, Send, LogOut } from "lucide-react";
import { api } from '../lib/api';

interface WhatsAppManagerProps {
    onSend: (message: string) => void;
    isSending: boolean;
}

const WhatsAppManager: React.FC<WhatsAppManagerProps> = ({ onSend, isSending }) => {
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [qr, setQr] = useState<string | null>(null);
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const checkStatus = async () => {
        try {
            const res = await api.get('/api/whatsapp/status');
            setStatus(res.data.status);
            setQr(res.data.qr);
        } catch (e) {
            console.error("Failed to check status", e);
        }
    };

    useEffect(() => {
        checkStatus();
        const interval = setInterval(checkStatus, 3000); // Poll every 3s
        return () => clearInterval(interval);
    }, []);

    const handleLogout = async () => {
        setIsLoading(true);
        try {
            await api.post('/api/whatsapp/logout');
            await checkStatus();
        } finally {
            setIsLoading(false);
        }
    };

    if (status === 'connected') {
        return (
            <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-sm font-medium">WhatsApp Connected</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleLogout} disabled={isLoading} className="h-8 text-xs text-muted-foreground hover:text-destructive">
                        {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3 mr-1" />} Logout
                    </Button>
                </div>

                <div className="space-y-2">
                    <Label>Add-on Text (Caption)</Label>
                    <textarea
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Hello! Here is your generated poster..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                </div>

                <Button onClick={() => onSend(message)} disabled={isSending} className="w-full">
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                    Send Now
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center space-y-4 py-4 animate-fade-in">
            <div className="text-center space-y-1">
                <h3 className="font-medium">Connect WhatsApp</h3>
                <p className="text-xs text-muted-foreground">Scan QR code to link your account</p>
            </div>

            {qr ? (
                <div className="bg-white p-2 rounded-lg border shadow-sm">
                    <img src={qr} alt="WhatsApp QR Code" className="w-48 h-48 object-contain" />
                </div>
            ) : (
                <div className="w-48 h-48 flex items-center justify-center bg-secondary/50 rounded-lg border">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <RefreshCw className="h-3 w-3 animate-spin" />
                {status === 'connecting' ? 'Generating QR...' : 'Waiting for connection...'}
            </div>
        </div>
    );
};

export default WhatsAppManager;
