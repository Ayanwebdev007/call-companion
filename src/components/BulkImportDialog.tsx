import { useState } from "react";
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

interface BulkImportDialogProps {
  onImportSuccess: () => void;
}

export function BulkImportDialog({ onImportSuccess }: BulkImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "customers_template.xlsx";
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

    setIsUploading(true);
    try {
      const result = await bulkImportCustomers(file);
      toast({ 
        title: "Import successful!", 
        description: `${result.importedCount || 0} customers imported successfully` 
      });
      setFile(null);
      setIsOpen(false);
      onImportSuccess();
    } catch (error: unknown) {
      console.error("Import error:", error);
      // Handle different types of errors
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
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Bulk Import
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