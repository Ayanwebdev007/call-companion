import { useState } from "react";
import { useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload, FileSpreadsheet } from "lucide-react";
import { bulkImportCustomers, downloadTemplate, BulkImportResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

interface BulkImportDialogProps {
  onImportSuccess: () => void;
}

export function BulkImportDialog({ onImportSuccess }: BulkImportDialogProps) {
  const { id: spreadsheetId } = useParams<{ id: string }>();
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadTemplate(spreadsheetId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customers_template_${spreadsheetId || 'default'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "Template downloaded successfully!" });
    } catch (error) {
      console.error("Error downloading template:", error);
      toast({
        title: "Error downloading template",
        description: "Failed to download the Excel template",
        variant: "destructive"
      });
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select an Excel file to import",
        variant: "destructive"
      });
      return;
    }

    if (!spreadsheetId) {
      toast({
        title: "No spreadsheet selected",
        description: "Please select a spreadsheet before importing",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const result = await bulkImportCustomers(file, spreadsheetId, overwrite);
      toast({
        title: "Import successful!",
        description: `${result.importedCount || 0} customers imported successfully`
      });
      setFile(null);
      setOverwrite(false);
      setIsOpen(false);
      onImportSuccess();
    } catch (error: unknown) {
      console.error("Import error:", error);
      let errorMessage = "Failed to import customers";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      toast({
        title: "Import failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="group relative overflow-hidden transition-all duration-300 hover:w-auto hover:px-3 px-0 w-8 border-border/50">
          <div className="flex items-center gap-2 justify-center w-full">
            <Upload className="h-4 w-4 flex-shrink-0" />
            <span className="max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 transition-all duration-300 whitespace-nowrap overflow-hidden">
              Bulk Import
            </span>
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-500" />
            Bulk Import Customers
          </DialogTitle>
          <DialogDescription>
            Import customers from an Excel file. Download the template to see the required format.
          </DialogDescription>
        </DialogHeader>

        <Card className="border-dashed border-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Excel File
            </CardTitle>
            <CardDescription>
              Select your Excel file with customer data to import
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="space-y-4">
                <div>
                  <Input
                    id="excel-file"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    <span className="font-medium">Required columns:</span> customer_name, company_name, phone_number
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="font-medium">Optional columns:</span> next_call_date, next_call_time, remark
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Overwrite Existing Data</Label>
                    <p className="text-[10px] text-muted-foreground italic">
                      If enabled, previous manual leads will be replaced.
                      <span className="text-blue-500 font-semibold ml-1">Meta webhook leads are preserved.</span>
                    </p>
                  </div>
                  <div
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      overwrite ? "bg-red-500" : "bg-slate-200 dark:bg-slate-700"
                    )}
                    onClick={() => setOverwrite(!overwrite)}
                  >
                    <span
                      className={cn(
                        "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                        overwrite ? "translate-x-4" : "translate-x-0"
                      )}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button
                  variant="outline"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={isUploading || !file}
                  className="flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Import Customers
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-xs text-muted-foreground mt-2">
          <p>💡 Tip: Make sure your Excel file has headers in the first row</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}