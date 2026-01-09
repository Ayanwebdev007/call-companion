import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Link, CheckCircle, AlertCircle, ArrowRight, Download, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchSpreadsheet, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface GoogleSheetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spreadsheetId: string;
  onImportComplete?: () => void;
}

interface Sheet {
  name: string;
  rowCount: number;
}

interface SheetData {
  spreadsheetId: string;
  sheetName: string;
  headers: string[];
  data: string[][];
  totalRows: number;
}

interface ColumnMapping {
  [key: string]: string;
}

const GoogleSheetsDialog = ({ open, onOpenChange, spreadsheetId, onImportComplete }: GoogleSheetsDialogProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'url' | 'sheets' | 'mapping' | 'importing'>('url');
  const [sheetUrl, setSheetUrl] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<Sheet[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState("");
  const [spreadsheetTitle, setSpreadsheetTitle] = useState("");
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [metaHeaders, setMetaHeaders] = useState<string[]>([]);
  const [isMeta, setIsMeta] = useState(false);

  // Row range selection
  const [importMode, setImportMode] = useState<'all' | 'range'>('all');
  const [startRow, setStartRow] = useState<string>("2");
  const [endRow, setEndRow] = useState<string>("100");
  const [totalRowsInSheet, setTotalRowsInSheet] = useState<number>(0);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});

  // Fetch spreadsheet details to get meta headers
  useEffect(() => {
    if (open && spreadsheetId) {
      fetchSpreadsheet(spreadsheetId)
        .then(data => {
          setIsMeta(!!data.is_meta);
          setMetaHeaders(data.meta_headers || []);

          // Reset mapping with default empty values for standard fields
          const initialMapping: ColumnMapping = {
            customerName: '',
            companyName: '',
            phoneNumber: '',
            remarks: '',
            nextCallDate: '',
            nextCallTime: '',
            lastCallDate: ''
          };

          // Also add entries for meta headers
          if (data.meta_headers) {
            data.meta_headers.forEach(header => {
              initialMapping[header] = '';
            });
          }

          setColumnMapping(initialMapping);
        })
        .catch(err => {
          console.error("Error fetching spreadsheet details:", err);
        });
    }
  }, [open, spreadsheetId]);

  const customerFields = [
    // Core fields - only show as separate if NOT in Meta headers to avoid confusion
    ...(!metaHeaders.some(h => {
      const lh = h.toLowerCase();
      return lh.includes('name') || lh.includes('customer');
    }) ? [{ key: 'customerName', label: 'Customer Name', required: true }] : []),

    ...(!metaHeaders.some(h => {
      const lh = h.toLowerCase();
      return lh.includes('company') || lh.includes('business');
    }) ? [{ key: 'companyName', label: 'Company Name', required: true }] : []),

    ...(!metaHeaders.some(h => {
      const lh = h.toLowerCase();
      return lh.includes('phone') || lh.includes('mobile');
    }) ? [{ key: 'phoneNumber', label: 'Phone Number', required: true }] : []),

    { key: 'remarks', label: 'Remarks', required: false },
    { key: 'nextCallDate', label: 'Next Call Date', required: false },
    { key: 'nextCallTime', label: 'Next Call Time', required: false },
    { key: 'lastCallDate', label: 'Last Call Date', required: false },
    // Add meta headers dynamically
    ...metaHeaders.map(header => ({
      key: header,
      label: header,
      required: false,
      isMeta: true
    }))
  ];

  const validateUrl = async () => {
    if (!sheetUrl.trim()) {
      toast({ title: "Please enter a Google Sheets URL", variant: "destructive" });
      return;
    }

    setIsValidating(true);
    try {
      const response = await api.post('/api/googlesheets/validate', { sheetUrl });

      if (response.data.valid) {
        setSpreadsheetTitle(response.data.title || "Spreadsheet");
        const sheets = response.data.sheets || [];
        setAvailableSheets(sheets);

        if (sheets.length > 1) {
          toast({ title: `Found ${sheets.length} sheets in ${response.data.title}` });
          setStep('sheets');
        } else {
          toast({ title: "Sheet access validated successfully!" });
          const firstSheet = sheets[0]?.name || "";
          const firstSheetRows = sheets[0]?.rowCount || 0;
          setSelectedSheetName(firstSheet);
          setTotalRowsInSheet(firstSheetRows);
          setEndRow(Math.min(firstSheetRows, 100).toString());
          await fetchSheetData(firstSheet);
        }
      } else {
        toast({
          title: "Cannot access sheet",
          description: response.data.error,
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

  const fetchSheetData = async (sheetName?: string) => {
    setIsFetching(true);
    try {
      const targetSheet = sheetName || selectedSheetName;
      const response = await api.post('/api/googlesheets/fetch', {
        sheetUrl,
        sheetName: targetSheet
      });
      setSheetData(response.data);
      setStep('mapping');

      // Auto-map common column names
      const headers = response.data.headers;
      const autoMapping = { ...columnMapping };

      headers.forEach(header => {
        const lowerHeader = header.toLowerCase();

        if (lowerHeader.includes('customer') || lowerHeader.includes('name') || lowerHeader.includes('contact')) {
          if (!autoMapping.customerName) autoMapping.customerName = header;
        }
        if (lowerHeader.includes('company') || lowerHeader.includes('organization') || lowerHeader.includes('business')) {
          if (!autoMapping.companyName) autoMapping.companyName = header;
        }
        if (lowerHeader.includes('phone') || lowerHeader.includes('mobile') || lowerHeader.includes('tel')) {
          if (!autoMapping.phoneNumber) autoMapping.phoneNumber = header;
        }
        if (lowerHeader.includes('remark') || lowerHeader.includes('note') || lowerHeader.includes('comment')) {
          if (!autoMapping.remarks) autoMapping.remarks = header;
        }
        if (lowerHeader.includes('next') && lowerHeader.includes('call') && lowerHeader.includes('date')) {
          if (!autoMapping.nextCallDate) autoMapping.nextCallDate = header;
        }
        if (lowerHeader.includes('next') && lowerHeader.includes('call') && lowerHeader.includes('time')) {
          if (!autoMapping.nextCallTime) autoMapping.nextCallTime = header;
        }
        if (lowerHeader.includes('last') && lowerHeader.includes('call') && lowerHeader.includes('date')) {
          if (!autoMapping.lastCallDate) autoMapping.lastCallDate = header;
        }

        // Auto-map Meta headers by exact (non-case sensitive) name or close match
        metaHeaders.forEach(metaHeader => {
          const lh = header.toLowerCase();
          const lm = metaHeader.toLowerCase();
          if (lh === lm || (lm.length > 3 && lh.includes(lm))) {
            if (!autoMapping[metaHeader]) autoMapping[metaHeader] = header;
          }
        });
      });

      setColumnMapping(autoMapping);
    } catch (error: any) {
      toast({
        title: "Failed to fetch sheet data",
        description: error.response?.data?.message || error.message,
        variant: "destructive"
      });
    } finally {
      setIsFetching(false);
    }
  };

  const importData = async () => {
    // Validate required mappings - only check core ones if they were displayed
    const requiredFields = [];
    if (!metaHeaders.some(h => h.toLowerCase().includes('name') || h.toLowerCase().includes('customer'))) requiredFields.push('customerName');
    if (!metaHeaders.some(h => h.toLowerCase().includes('company') || h.toLowerCase().includes('business'))) requiredFields.push('companyName');
    if (!metaHeaders.some(h => h.toLowerCase().includes('phone') || h.toLowerCase().includes('mobile'))) requiredFields.push('phoneNumber');

    const missingFields = requiredFields.filter(field => !columnMapping[field]);

    if (missingFields.length > 0) {
      toast({
        title: "Missing required mappings",
        description: "Please map all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);
    try {
      const response = await api.post('/api/googlesheets/import', {
        spreadsheetId,
        sheetUrl,
        columnMapping,
        sheetData: importMode === 'all' ? sheetData : null,
        importRange: importMode === 'range' ? {
          startRow: parseInt(startRow),
          endRow: parseInt(endRow),
          sheetName: selectedSheetName
        } : null
      });

      toast({
        title: "Import successful!",
        description: response.data.message
      });

      onImportComplete?.();
      handleClose();
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.response?.data?.message || error.message,
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setStep('url');
    setSheetUrl("");
    setSheetData(null);
    setAvailableSheets([]);
    setSelectedSheetName("");
    setSpreadsheetTitle("");
    setColumnMapping({
      customerName: '',
      companyName: '',
      phoneNumber: '',
      remarks: '',
      nextCallDate: '',
      nextCallTime: '',
      lastCallDate: ''
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Download className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            Import from Google Sheets
          </DialogTitle>
          <DialogDescription>
            Connect your Google Sheet to import customer data
          </DialogDescription>
        </DialogHeader>

        {step === 'url' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Step 1: Connect Google Sheet</CardTitle>
                <CardDescription>
                  Paste the URL of your publicly accessible Google Sheet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="sheetUrl">Google Sheet URL</Label>
                  <Input
                    id="sheetUrl"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="mt-2"
                  />
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Make sure your Google Sheet is publicly accessible or shared with "Anyone with the link can view"
                  </AlertDescription>
                </Alert>

                <Button
                  onClick={validateUrl}
                  disabled={isValidating || !sheetUrl.trim()}
                  className="w-full"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <Link className="h-4 w-4 mr-2" />
                      Connect & Fetch Data
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'sheets' && (
          <div className="space-y-6 animate-fade-in text-left">
            <Card className="border-green-100 dark:border-green-900/30">
              <CardHeader>
                <CardTitle className="text-lg">Step 2: Select a Sheet</CardTitle>
                <CardDescription>
                  Found multiple sheets in "{spreadsheetTitle}". Please select one to import data from.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                  {availableSheets.map((sheet) => (
                    <Button
                      key={sheet.name}
                      variant={selectedSheetName === sheet.name ? "default" : "outline"}
                      className={cn(
                        "h-auto py-4 px-6 justify-start text-left font-medium transition-all hover:scale-[1.02]",
                        selectedSheetName === sheet.name ? "ring-2 ring-primary ring-offset-2" : ""
                      )}
                      onClick={() => {
                        setSelectedSheetName(sheet.name);
                        setTotalRowsInSheet(sheet.rowCount);
                        setEndRow(Math.min(sheet.rowCount, 100).toString());
                      }}
                    >
                      <FileSpreadsheet className="h-5 w-5 mr-3 shrink-0 opacity-70" />
                      <div className="flex flex-col">
                        <span className="truncate">{sheet.name}</span>
                        <span className="text-[10px] opacity-60 font-normal">{sheet.rowCount} rows</span>
                      </div>
                    </Button>
                  ))}
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep('url')}>
                    Back
                  </Button>
                  <Button
                    onClick={() => fetchSheetData(selectedSheetName)}
                    disabled={isFetching || !selectedSheetName}
                  >
                    {isFetching ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Fetching Data...
                      </>
                    ) : (
                      <>
                        Next: Map Columns
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'mapping' && sheetData && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Step 2: Map Columns</CardTitle>
                <CardDescription>
                  Match your sheet columns to customer fields
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Found {sheetData.totalRows} rows in "{sheetData.sheetName}"
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {sheetData.headers.map((header, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {header}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Rows to Import</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={importMode === 'all' ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setImportMode('all')}
                      >
                        All Rows
                      </Button>
                      <Button
                        variant={importMode === 'range' ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setImportMode('range')}
                      >
                        Custom Range
                      </Button>
                    </div>
                  </div>

                  {importMode === 'range' && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div>
                        <Label htmlFor="startRow" className="text-xs text-muted-foreground">Start Row</Label>
                        <Input
                          id="startRow"
                          type="number"
                          min="2"
                          max={totalRowsInSheet}
                          value={startRow}
                          onChange={(e) => setStartRow(e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label htmlFor="endRow" className="text-xs text-muted-foreground">End Row</Label>
                        <Input
                          id="endRow"
                          type="number"
                          min={startRow}
                          max={totalRowsInSheet}
                          value={endRow}
                          onChange={(e) => setEndRow(e.target.value)}
                          className="h-8"
                        />
                      </div>
                      <p className="col-span-2 text-[10px] text-muted-foreground italic">
                        Note: Headers are assumed to be on Row 1. Start Row should be at least 2.
                      </p>
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                <div className="space-y-4">
                  {customerFields.map((field: any) => (
                    <div key={field.key} className="grid grid-cols-4 items-start gap-4 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <div className="flex flex-col">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          {field.label}
                          {field.required && <span className="text-red-500">*</span>}
                          {field.isMeta && <Badge variant="outline" className="text-[10px] h-4 bg-blue-50 text-blue-600 border-blue-200">Meta</Badge>}
                        </Label>
                        {field.isMeta && <span className="text-[10px] text-muted-foreground">Dynamic Meta field</span>}
                      </div>
                      <div className="col-span-3">
                        <Select
                          value={columnMapping[field.key] || ""}
                          onValueChange={(value) =>
                            setColumnMapping(prev => ({ ...prev, [field.key]: value }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select column..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no-import">-- Do not import --</SelectItem>
                            {sheetData.headers.map((header) => (
                              <SelectItem key={header} value={header}>
                                {header}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('url')}>
                Back
              </Button>
              <Button onClick={importData} disabled={isImporting}>
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Import Data
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p className="text-lg font-medium">Importing customer data...</p>
            <p className="text-sm text-muted-foreground">This may take a moment</p>
          </div>
        )}
      </DialogContent>
    </Dialog >
  );
};

export default GoogleSheetsDialog;