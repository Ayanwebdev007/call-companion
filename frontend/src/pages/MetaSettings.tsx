import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api, API_BASE_URL } from "@/lib/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, ExternalLink, ShieldCheck, Webhook } from "lucide-react";

const MetaSettings = () => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState({
        metaPageAccessToken: '',
        metaVerifyToken: '',
        metaPageId: '',
        metaPages: [] as { pageId: string, pageAccessToken: string, pageName: string }[]
    });

    const [newPage, setNewPage] = useState({ pageId: '', pageAccessToken: '' });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await api.get('/api/auth/me');
            if (response.data.settings) {
                setSettings({
                    metaPageAccessToken: response.data.settings.metaPageAccessToken || '',
                    metaVerifyToken: response.data.settings.metaVerifyToken || '',
                    metaPageId: response.data.settings.metaPageId || '',
                    metaPages: response.data.settings.metaPages || []
                });
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const handleSave = async (updatedSettings = settings) => {
        setLoading(true);
        try {
            await api.put('/api/auth/settings', { settings: updatedSettings });
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

    const addPage = async () => {
        if (!newPage.pageId || !newPage.pageAccessToken) {
            toast({ title: "Please fill in both Page ID and Access Token", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            // Try to fetch page name from Meta API
            const response = await api.get(`/api/meta/page-details?pageId=${newPage.pageId}&token=${newPage.pageAccessToken}`);
            const pageName = response.data.name || 'Meta Page';

            const updatedPages = [...settings.metaPages, { ...newPage, pageName }];
            const updatedSettings = { ...settings, metaPages: updatedPages };

            setSettings(updatedSettings);
            await handleSave(updatedSettings);
            setNewPage({ pageId: '', pageAccessToken: '' });
        } catch (error) {
            console.error('Error adding page:', error);
            const updatedPages = [...settings.metaPages, { ...newPage, pageName: 'Meta Page' }];
            const updatedSettings = { ...settings, metaPages: updatedPages };
            setSettings(updatedSettings);
            await handleSave(updatedSettings);
            setNewPage({ pageId: '', pageAccessToken: '' });
        } finally {
            setLoading(false);
        }
    };

    const removePage = (index: number) => {
        const updatedPages = settings.metaPages.filter((_, i) => i !== index);
        const updatedSettings = { ...settings, metaPages: updatedPages };
        setSettings(updatedSettings);
        handleSave(updatedSettings);
    };

    const migrateLegacySettings = async () => {
        if (!settings.metaPageId || !settings.metaPageAccessToken) return;

        setLoading(true);
        try {
            const response = await api.get(`/api/meta/page-details?pageId=${settings.metaPageId}&token=${settings.metaPageAccessToken}`);
            const pageName = response.data.name || 'Legacy Page';

            const updatedPages = [...settings.metaPages, {
                pageId: settings.metaPageId,
                pageAccessToken: settings.metaPageAccessToken,
                pageName
            }];

            const updatedSettings = {
                ...settings,
                metaPages: updatedPages,
                metaPageId: '',
                metaPageAccessToken: ''
            };

            setSettings(updatedSettings);
            await handleSave(updatedSettings);
            toast({ title: "Successfully migrated to new system!" });
        } catch (error) {
            console.error('Migration failed:', error);
            toast({ title: "Migration failed", description: "Could not verify legacy credentials.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const generateVerifyToken = () => {
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        setSettings(prev => ({ ...prev, metaVerifyToken: token }));
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-6 text-left pb-20">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Meta Integration</h1>
                <p className="text-muted-foreground italic">Connect multiple Facebook Pages and Lead Forms directly to the platform.</p>
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
                                <Input
                                    value={(() => {
                                        const apiUrl = API_BASE_URL;
                                        const baseUrl = apiUrl.replace(/\/api$/, '');
                                        return `${baseUrl}/api/meta/webhook`;
                                    })()}
                                    readOnly
                                    className="bg-muted"
                                />
                                <Button variant="outline" size="sm" onClick={() => {
                                    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                                    const baseUrl = apiUrl.replace(/\/api$/, '');
                                    navigator.clipboard.writeText(`${baseUrl}/api/meta/webhook`);
                                    toast({ title: "URL copied to clipboard" });
                                }}>Copy</Button>
                            </div>
                            <p className="text-xs text-muted-foreground">Use this URL in your Meta Developer App webhook settings.</p>
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
                                <Button size="sm" onClick={() => handleSave()}>Save Token</Button>
                            </div>
                            <p className="text-xs text-muted-foreground">This must match the "Verify Token" in your Meta App settings.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Connected Pages Section */}
                <Card className="border-green-100 dark:border-green-900/30">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-green-500" />
                            <CardTitle>Connected Pages</CardTitle>
                        </div>
                        <CardDescription>
                            Manage the pages synced with your CRM.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {settings.metaPages.length > 0 ? (
                            <div className="space-y-3">
                                {settings.metaPages.map((page, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/20">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-sm">{page.pageName || 'Unnamed Page'}</span>
                                            <span className="text-xs text-muted-foreground">ID: {page.pageId}</span>
                                        </div>
                                        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => removePage(index)}>Remove</Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-muted-foreground text-sm italic">
                                No pages connected yet.
                            </div>
                        )}

                        <div className="pt-4 border-t border-border">
                            <h4 className="text-sm font-semibold mb-4 text-foreground/80">Add New Page</h4>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Meta Page ID</Label>
                                    <Input
                                        value={newPage.pageId}
                                        onChange={(e) => setNewPage(prev => ({ ...prev, pageId: e.target.value }))}
                                        placeholder="Enter Page ID"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Meta Page Access Token</Label>
                                    <Input
                                        type="password"
                                        value={newPage.pageAccessToken}
                                        onChange={(e) => setNewPage(prev => ({ ...prev, pageAccessToken: e.target.value }))}
                                        placeholder="Enter Access Token"
                                    />
                                </div>
                                <Button onClick={addPage} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white">
                                    {loading ? "Processing..." : "Add & Connect Page"}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Legacy Configuration (Hidden if not set, or shown as "Primary Page") */}
                {(settings.metaPageId || settings.metaPageAccessToken) && (
                    <Card className="border-amber-100 dark:border-amber-900/30 opacity-80">
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm font-medium">Legacy Configuration (Secondary Page)</CardTitle>
                            <CardDescription className="text-xs">This is your previously set primary page.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 pb-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase">Page ID</Label>
                                    <Input value={settings.metaPageId} onChange={(e) => setSettings(prev => ({ ...prev, metaPageId: e.target.value }))} className="h-8 text-xs" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase">Access Token</Label>
                                    <Input type="password" value={settings.metaPageAccessToken} onChange={(e) => setSettings(prev => ({ ...prev, metaPageAccessToken: e.target.value }))} className="h-8 text-xs" />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => handleSave()} disabled={loading}>Update Legacy Settings</Button>
                                <Button size="sm" className="flex-1 h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white" onClick={migrateLegacySettings} disabled={loading}>Move to Connected Pages →</Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/50">
                    <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertTitle className="text-amber-800 dark:text-amber-300">Quick Guide: Multi-Page Support</AlertTitle>
                    <AlertDescription className="text-amber-700 dark:text-amber-400 text-sm">
                        <p className="mt-2">Connecting multiple pages allows you to consolidate leads from different business ventures into this single CRM.</p>
                        <ul className="list-disc list-inside space-y-1 mt-2">
                            <li>Each page needs its own **Individual Access Token**.</li>
                            <li>Ensure each token has <code>leads_retrieval</code> permission.</li>
                            <li>Your Webhook Payload URL and Verify Token stay the same for ALL pages.</li>
                        </ul>
                    </AlertDescription>
                </Alert>
            </div>
        </div>
    );
};

export default MetaSettings;
