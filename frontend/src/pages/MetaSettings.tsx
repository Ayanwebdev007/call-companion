import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, ExternalLink, ShieldCheck, Webhook } from "lucide-react";

const MetaSettings = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState({
        metaPageAccessToken: '',
        metaVerifyToken: ''
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await api.get('/api/auth/me');
            if (response.data.settings) {
                setSettings({
                    metaPageAccessToken: response.data.settings.metaPageAccessToken || '',
                    metaVerifyToken: response.data.settings.metaVerifyToken || ''
                });
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.put('/api/auth/settings', { settings });
            toast({ title: "Settings saved successfully" });
        } catch (error) {
            toast({
                title: "Failed to save settings",
                description: error.response?.data?.message || "Something went wrong",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const generateVerifyToken = () => {
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        setSettings(prev => ({ ...prev, metaVerifyToken: token }));
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-6 text-left">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Meta Integration</h1>
                <p className="text-muted-foreground italic">Connect your Facebook Lead Forms directly to the platform.</p>
            </div>

            <div className="grid gap-6">
                <Card className="border-blue-100 dark:border-blue-900/30">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Webhook className="h-5 w-5 text-blue-500" />
                            <CardTitle>Webhook Configuration</CardTitle>
                        </div>
                        <CardDescription>
                            Use these details in your Meta Developer App to receive real-time leads.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Webhook Payload URL</Label>
                            <div className="flex gap-2">
                                <Input value={`${window.location.origin.replace('5173', '5000')}/api/meta/webhook`} readOnly className="bg-muted" />
                                <Button variant="outline" size="sm" onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin.replace('5173', '5000')}/api/meta/webhook`);
                                    toast({ title: "URL copied to clipboard" });
                                }}>Copy</Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Verify Token</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={settings.metaVerifyToken}
                                    placeholder="Create a secret verify token"
                                    onChange={(e) => setSettings(prev => ({ ...prev, metaVerifyToken: e.target.value }))}
                                />
                                <Button variant="outline" size="sm" onClick={generateVerifyToken}>Generate</Button>
                            </div>
                            <p className="text-xs text-muted-foreground">This must match the "Verify Token" in your Meta App settings.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-green-100 dark:border-green-900/30">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-green-500" />
                            <CardTitle>Authentication</CardTitle>
                        </div>
                        <CardDescription>
                            Provide your Meta Page Access Token to allow lead retrieval.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Meta Page Access Token</Label>
                            <Input
                                type="password"
                                value={settings.metaPageAccessToken}
                                onChange={(e) => setSettings(prev => ({ ...prev, metaPageAccessToken: e.target.value }))}
                                placeholder="EAAG...."
                            />
                            <p className="text-xs text-muted-foreground">Get this from Meta Graph API Explorer or your App settings.</p>
                        </div>

                        <Button onClick={handleSave} disabled={loading} className="w-full">
                            {loading ? "Saving..." : "Save Configuration"}
                        </Button>
                    </CardContent>
                </Card>

                <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/50">
                    <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertTitle className="text-amber-800 dark:text-amber-300">Quick Guide: Meta Developer Setup</AlertTitle>
                    <AlertDescription className="text-amber-700 dark:text-amber-400 text-sm">
                        <ol className="list-decimal list-inside space-y-1 mt-2">
                            <li>Create a Meta App (Type: Business).</li>
                            <li>Add the "Webhooks" product and select "Page".</li>
                            <li>Subscribe to the "leadgen" field.</li>
                            <li>Enter the Payload URL and Verify Token from above.</li>
                            <li>Ensure your Page has the <code>leads_retrieval</code> permission enabled.</li>
                        </ol>
                        <a
                            href="https://developers.facebook.com/docs/marketing-api/guides/lead-ads/webhooks"
                            target="_blank"
                            className="inline-flex items-center gap-1 mt-3 text-blue-600 hover:underline"
                        >
                            Meta Documentation <ExternalLink className="h-3 w-3" />
                        </a>
                    </AlertDescription>
                </Alert>
            </div>
        </div>
    );
};

export default MetaSettings;
