import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Loader2, AlertCircle, ArrowRight, Upload, FileSpreadsheet, CheckCircle2, Settings2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { validateGoogleSheet, exportToGoogleSheet } from "@/lib/api";
import { cn } from "@/lib/utils";

interface GoogleSheetsExportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    spreadsheetId: string;
    spreadsheetName: string;
    initialUrl?: string;
    metaHeaders?: string[];
    initialMapping?: Record<string, string>;
    initialRealtimeSync?: boolean;
}

interface Sheet {
    name: string;
    rowCount: number;
}

const GoogleSheetsExportDialog = ({
    open,
    onOpenChange,
    spreadsheetId,
    spreadsheetName,
    initialUrl = "",
    metaHeaders = [],
    initialMapping,
    initialRealtimeSync = false
}: GoogleSheetsExportDialogProps) => {
    const { toast } = useToast();
    const [step, setStep] = useState<'url' | 'sheets' | 'mapping' | 'exporting' | 'success'>('url');
    const [sheetUrl, setSheetUrl] = useState(initialUrl);
    const [isValidating, setIsValidating] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [availableSheets, setAvailableSheets] = useState<Sheet[]>([]);
    const [selectedSheetName, setSelectedSheetName] = useState("");
    const [googleTitle, setGoogleTitle] = useState("");

    const [realtimeSync, setRealtimeSync] = useState(initialRealtimeSync);
    const [columnMapping, setColumnMapping] = useState<Record<string, string>>(initialMapping || {});

    // For Meta sheets, ONLY show tracking fields (not name/phone/company)
    // Meta sheets should use raw Meta headers for identity fields
    const allStandardFields = [
        { id: 'customer_name', label: 'Customer Name' },
        { id: 'company_name', label: 'Company Name' },
        { id: 'phone_number', label: 'Phone Number' },
        { id: 'next_call_date', label: 'Next Call Date' },
        { id: 'last_call_date', label: 'Last Call Date' },
        { id: 'next_call_time', label: 'Next Call Time' },
        { id: 'remark', label: 'Remark' },
        { id: 'status', label: 'Status' }
    ];

    // Filter out identity fields for Meta sheets
    const standardFields = metaHeaders && metaHeaders.length > 0
        ? allStandardFields.filter(f => !['customer_name', 'company_name', 'phone_number'].includes(f.id))
        : allStandardFields;

    useEffect(() => {
        if (open) {
            setSheetUrl(initialUrl);
            setRealtimeSync(initialRealtimeSync);

            // Start with whatever the DB gave us (or empty)
            let mapping = initialMapping ? { ...initialMapping } : {};

            // AGGRESSIVE CLEANUP: For Meta sheets, ALWAYS remove standard CRM fields
            // This fixes the persistent column issue where old mappings keep reappearing
            if (metaHeaders && metaHeaders.length > 0) {
                console.log('[CLEANUP] Before cleanup:', Object.keys(mapping));

                // Unconditionally remove standard fields - Meta sheets should use raw Meta data
                delete mapping['customer_name'];
                delete mapping['phone_number'];
                delete mapping['company_name'];

                console.log('[CLEANUP] After cleanup:', Object.keys(mapping));

                // If no mapping existed at all OR after cleanup we have nothing, default to Meta headers
                if (!initialMapping || Object.keys(mapping).length === 0) {
                    const metaMap: Record<string, string> = {};
                    metaHeaders.forEach(h => { metaMap[h] = h; });
                    metaMap['next_call_date'] = 'Next Call Date';
                    metaMap['last_call_date'] = 'Last Call Date';
                    metaMap['remark'] = 'Remark';
                    metaMap['status'] = 'Status';
                    mapping = metaMap;
                    console.log('[CLEANUP] Set default Meta mapping:', Object.keys(mapping));
                }
            }

            console.log('[CLEANUP] FINAL mapping being set:', Object.keys(mapping));
            setColumnMapping(mapping);
            setStep('url');
        }
    }, [open, initialUrl, initialMapping, initialRealtimeSync, metaHeaders]);

    const toggleField = (fieldId: string, label: string) => {
        setColumnMapping(prev => {
            const next = { ...prev };
            if (next[fieldId]) {
                delete next[fieldId];
            } else {
                next[fieldId] = label;
            }
            return { ...next };
        });
    };

    const validateUrl = async () => {
        if (!sheetUrl.trim()) {
            toast({ title: "Please enter a Google Sheets URL", variant: "destructive" });
            return;
        }

        setIsValidating(true);
        try {
            const data = await validateGoogleSheet(sheetUrl);

            if (data.valid) {
                setGoogleTitle((data as any).title || "Spreadsheet");
                const sheets = (data as any).sheets || [];
                setAvailableSheets(sheets);

                if (sheets.length > 0) {
                    setSelectedSheetName(sheets[0]?.name || "");
                    setStep('sheets');
                }
            } else {
                toast({
                    title: "Cannot access sheet",
                    description: data.error,
                    variant: "destructive"
                });
            }
        } catch (error: any) {
            toast({
                title: "Validation failed",
                description: error.response?.data?.message || error.message,
                variant: "destructive"
            });
        } finally {
            setIsValidating(false);
        }
    };

    const handleExport = async () => {
        if (!selectedSheetName) {
            toast({ title: "Please select a sheet tab", variant: "destructive" });
            return;
        }

        if (Object.keys(columnMapping).length === 0) {
            toast({ title: "Please select at least one column to export", variant: "destructive" });
            return;
        }

        setIsExporting(true);
        setStep('exporting');
        try {
            console.log('[EXPORT] columnMapping being sent to backend:', columnMapping);
            console.log('[EXPORT] Keys:', Object.keys(columnMapping));

            const response = await exportToGoogleSheet(
                spreadsheetId,
                sheetUrl,
                selectedSheetName,
                columnMapping,
                realtimeSync
            );

            if (response.success) {
                setStep('success');
                toast({ title: "Sync Successful!", description: "Your data is now linked and mapped." });
            }
        } catch (error: any) {
            setStep('mapping');
            toast({
                title: "Export failed",
                description: error.response?.data?.message || error.message,
                variant: "destructive"
            });
        } finally {
            setIsExporting(false);
        }
    };

    const handleClose = () => {
        onOpenChange(false);
        setTimeout(() => setStep('url'), 300);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5 text-blue-600" />
                        Export to Google Sheets
                    </DialogTitle>
                    <DialogDescription>
                        Sync "{spreadsheetName}" with Google Sheets
                    </DialogDescription>
                </DialogHeader>

                {step === 'url' && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="sheetUrl">Google Sheet URL</Label>
                            <Input
                                id="sheetUrl"
                                value={sheetUrl}
                                onChange={(e) => setSheetUrl(e.target.value)}
                                placeholder="https://docs.google.com/spreadsheets/d/..."
                            />
                        </div>
                        <Alert className="bg-blue-50 border-blue-200">
                            <Info className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-blue-800 text-xs">
                                Ensure your sheet is shared with the Service Account email.
                            </AlertDescription>
                        </Alert>
                        <Button onClick={validateUrl} disabled={isValidating || !sheetUrl.trim()} className="w-full">
                            {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Next: Select Tab"}
                        </Button>
                    </div>
                )}

                {step === 'sheets' && (
                    <div className="space-y-6">
                        <Label>Select Sheet Tab in "{googleTitle}"</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {availableSheets.map(s => (
                                <Button
                                    key={s.name}
                                    variant={selectedSheetName === s.name ? "default" : "outline"}
                                    onClick={() => setSelectedSheetName(s.name)}
                                    className="justify-start truncate"
                                >
                                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                                    {s.name}
                                </Button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setStep('url')} className="flex-1">Back</Button>
                            <Button onClick={() => setStep('mapping')} className="flex-1">Next: Map Columns</Button>
                        </div>
                    </div>
                )}

                {step === 'mapping' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/50">
                            <div className="space-y-1">
                                <Label className="flex items-center gap-2">
                                    <Settings2 className="h-4 w-4 text-blue-600" />
                                    Realtime Background Sync
                                </Label>
                                <p className="text-[10px] text-muted-foreground">Automatically update the sheet whenever leads change.</p>
                            </div>
                            <Switch checked={realtimeSync} onCheckedChange={setRealtimeSync} />
                        </div>

                        <div className="space-y-3">
                            <Label>Select Columns to Export</Label>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-3 max-h-[250px] overflow-y-auto p-1">
                                {standardFields.map(f => (
                                    <div key={f.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={f.id}
                                            checked={!!columnMapping[f.id]}
                                            onCheckedChange={() => toggleField(f.id, f.label)}
                                        />
                                        <Label htmlFor={f.id} className="text-sm cursor-pointer font-medium">{f.label}</Label>
                                    </div>
                                ))}

                                {metaHeaders.map(h => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={h}
                                            checked={!!columnMapping[h]}
                                            onCheckedChange={() => toggleField(h, h)}
                                        />
                                        <Label htmlFor={h} className="text-sm cursor-pointer text-blue-600 font-medium">{h}</Label>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[10px] text-blue-600 bg-blue-50 p-2 rounded border border-blue-100 italic">
                                <b>Tip:</b> Standard fields (like Name and Phone) now automatically pull data from your Meta lead fields to match your styled Sheet template.
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setStep('sheets')} className="flex-1">Back</Button>
                            <Button onClick={handleExport} className="flex-1 bg-green-600 hover:bg-green-700">Start Sync</Button>
                        </div>
                    </div>
                )}

                {step === 'exporting' && (
                    <div className="flex flex-col items-center py-10 space-y-4">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                        <p className="font-medium">Syncing your data...</p>
                    </div>
                )}

                {step === 'success' && (
                    <div className="flex flex-col items-center py-10 space-y-4 text-center">
                        <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="h-10 w-10 text-green-600" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-xl font-bold">Successfully Linked!</p>
                            {realtimeSync && <p className="text-sm text-green-600 font-medium">Realtime sync is now ACTIVE.</p>}
                        </div>
                        <Button onClick={handleClose} className="w-full max-w-[200px]">Done</Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default GoogleSheetsExportDialog;
