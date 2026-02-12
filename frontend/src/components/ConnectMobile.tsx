import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Check, Loader2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ConnectMobile = () => {
    const { token, user } = useAuth();
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);

    // Use a public QR code API for simplicity
    // Ideally this should be generated locally or by backend, but this works for "implement" speed.
    // We encode the token directly. Security Note: Token expires in 1 day.
    // For Render, the mobile app needs to talk to the backend directly because the frontend rewrite 
    // depends on the browser's relative path handling.
    // Use the current origin as the default backend URL
    const backendUrl = window.location.origin;

    const qrData = JSON.stringify({
        token: token,
        serverUrl: window.location.hostname === 'localhost' ? 'http://10.0.2.2:5000' : backendUrl
    });

    // Use the full JSON data for the QR code
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

    const handleCopy = () => {
        if (token) {
            navigator.clipboard.writeText(token);
            setCopied(true);
            toast({ title: "Token copied to clipboard" });
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Card className="border-border/50 bg-card/60 backdrop-blur-md shadow-lg">
            <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Smartphone className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle>Connect Mobile App</CardTitle>
                </div>
                <CardDescription>
                    Scan this QR code with the Call Companion Android App to sync leads and track calls.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 flex flex-col items-center">
                {token ? (
                    <>
                        <div className="p-4 bg-white rounded-xl shadow-sm border">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={qrCodeUrl} alt="Pairing QR Code" className="w-48 h-48" />
                        </div>

                        <div className="text-center space-y-2 max-w-sm">
                            <p className="text-sm text-muted-foreground">
                                1. Open the mobile app.<br />
                                2. Tap "Scan QR Code".<br />
                                3. Point your camera at the code above.
                            </p>
                        </div>

                        <div className="w-full pt-4 border-t border-border/10">
                            <p className="text-xs text-center text-muted-foreground mb-2">Trouble scanning? Copy the code manually.</p>
                            <div className="flex gap-2">
                                <Button variant="outline" className="w-full flex gap-2" onClick={handleCopy}>
                                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    {copied ? "Copied" : "Copy Manual Code"}
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center py-8 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin mb-2" />
                        <p>Loading connection details...</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default ConnectMobile;
