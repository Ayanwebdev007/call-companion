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
import { Loader2, Link, CheckCircle, AlertCircle, ArrowRight, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface GoogleSheetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spreadsheetId: string;
  onImportComplete?: () => void;
}

interface SheetData {
  spreadsheetId: string;
  sheetName: string;
  headers: string[];
  data: string[][];
  totalRows: number;
}

interface ColumnMapping {
  customerName: string;
  companyName: string;
  phoneNumber: string;
  remarks: string;
  nextCallDate: string;
  nextCallTime: string;
  lastCallDate: string;
}

const GoogleSheetsDialog = ({ open, onOpenChange, spreadsheetId, onImportComplete }: GoogleSheetsDialogProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'url' | 'mapping' | 'importing'>('url');
  const [sheetUrl, setSheetUrl] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    customerName: '',
    companyName: '',
    phoneNumber: '',
    remarks: '',
    nextCallDate: '',
    nextCallTime: '',
    lastCallDate: ''
  });

  const customerFields = [
    { key: 'customerName', label: 'Customer Name', required: true },
    { key: 'companyName', label: 'Company Name', required: true },
    { key: 'phoneNumber', label: 'Phone Number', required: true },
    { key: 'remarks', label: 'Remarks', required: false },
    { key: 'nextCallDate', label: 'Next Call Date', required: false },
    { key: 'nextCallTime', label: 'Next Call Time', required: false },
    { key: 'lastCallDate', label: 'Last Call Date', required: false }
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
        toast({ title: "Sheet access validated successfully!" });
        await fetchSheetData();
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

  const fetchSheetData = async () => {
    setIsFetching(true);
    try {
      const response = await api.post('/api/googlesheets/fetch', { sheetUrl });
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
    // Validate required mappings
    const requiredFields = ['customerName', 'companyName', 'phoneNumber'];
    const missingFields = requiredFields.filter(field => !columnMapping[field as keyof ColumnMapping]);

    if (missingFields.length > 0) {
      toast({
        title: "Missing required mappings",
        description: "Please map Customer Name, Company Name, and Phone Number",
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
        sheetData
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

                <Separator className="my-4" />

                <div className="space-y-4">
                  {customerFields.map((field) => (
                    <div key={field.key} className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-sm font-medium">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      <Select
                        value={columnMapping[field.key as keyof ColumnMapping]}
                        onValueChange={(value) =>
                          setColumnMapping(prev => ({ ...prev, [field.key]: value }))
                        }
                      >
                        <SelectTrigger className="col-span-3">
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
    </Dialog>
  );
};

export default GoogleSheetsDialog;