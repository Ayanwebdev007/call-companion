import { useState, useMemo, useRef, useEffect, memo, Fragment } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutoResizeTextarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trash2, CalendarIcon, MessageCircle, Phone, GripVertical, Square, CheckSquare, ArrowLeft, Share2, User, Users, Plus, Download, Search, FileSpreadsheet } from "lucide-react";
import { format, isToday, parseISO, isPast } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCustomers, addCustomer, updateCustomer, deleteCustomer, Customer, bulkDeleteCustomers, reorderCustomers, fetchSharedUsers, SharedUser, exportCustomers, fetchSpreadsheet } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { useAuth } from "@/context/AuthContext";
import { LogOut } from "lucide-react";
import { BulkImportDialog } from "@/components/BulkImportDialog";
import { ResizableTable, ResizableTableHeader, ResizableTableBody, ResizableTableHead, ResizableTableRow, ResizableTableCell } from "@/components/ui/resizable-table";
import { Skeleton } from "@/components/ui/skeleton";

import { SpreadsheetWhatsAppDialog } from "@/components/SpreadsheetWhatsAppDialog";
import GoogleSheetsDialog from "@/components/GoogleSheetsDialog";

const Index = () => {
  const { id: spreadsheetId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // State for WhatsApp Dialog
  const [selectedWhatsAppCustomer, setSelectedWhatsAppCustomer] = useState<Customer | null>(null);
  const [isWhatsAppDialogOpen, setIsWhatsAppDialogOpen] = useState(false);
  const [isGoogleSheetsDialogOpen, setIsGoogleSheetsDialogOpen] = useState(false);

  // Redirect if no valid spreadsheetId
  useEffect(() => {
    if (!spreadsheetId || spreadsheetId === "undefined" || spreadsheetId === "null") {
      navigate("/");
    }
  }, [spreadsheetId, navigate]);
  const [viewMode, setViewMode] = useState<"date" | "all">("date");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logout, user } = useAuth();

  // Fetch shared users for this spreadsheet
  const { data: sharedUsers = [], isLoading: sharedUsersLoading } = useQuery({
    queryKey: ["sharedUsers", spreadsheetId],
    queryFn: async () => {
      if (!spreadsheetId || spreadsheetId === "undefined" || spreadsheetId === "null") {
        return [];
      }
      try {
        return await fetchSharedUsers(spreadsheetId);
      } catch (error) {
        return [];
      }
    },
    enabled: !!spreadsheetId && spreadsheetId !== "undefined" && spreadsheetId !== "null",
  });

  // Bulk selection state
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [showCheckboxes, setShowCheckboxes] = useState(false);

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  // Row height state
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});

  // Focused cell state (format: "rowId-fieldName" or "new-fieldName" for new row)
  const [focusedCell, setFocusedCell] = useState<string | null>(null);

  // New row state
  const [newRow, setNewRow] = useState({
    customer_name: "",
    company_name: "",
    phone_number: "",
    next_call_date: format(new Date(), "yyyy-MM-dd"),
    last_call_date: "",
    next_call_time: "",
    remark: "",
    meta_data: {} as Record<string, string>,
    color: null as 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | null,
  });

  // Search query state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchClosing, setSearchClosing] = useState<boolean>(false);
  const searchRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!showSearch) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchClosing(true);
        setTimeout(() => {
          setShowSearch(false);
          setSearchClosing(false);
        }, 200);
      }
    };
    const onDocKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchClosing(true);
        setTimeout(() => {
          setShowSearch(false);
          setSearchClosing(false);
        }, 200);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onDocKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onDocKeyDown);
    };
  }, [showSearch]);
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Fetch customers
  const { data: customers = [], isLoading, error } = useQuery({
    queryKey: ["customers", spreadsheetId, debouncedQuery],
    queryFn: async () => {
      try {
        console.log("Fetching customers for spreadsheet:", spreadsheetId);
        // Validate spreadsheetId before making the request
        if (!spreadsheetId) {
          throw new Error("No spreadsheet ID provided");
        }
        if (spreadsheetId === "undefined" || spreadsheetId === "null") {
          throw new Error(`Invalid spreadsheet ID: ${spreadsheetId}`);
        }
        const data = await fetchCustomers(spreadsheetId, debouncedQuery || undefined);
        console.log("Customers fetched:", data);
        if (!Array.isArray(data)) {
          throw new Error("API response is not an array");
        }
        return data;
      } catch (err) {
        console.error("Fetch error:", err);
        throw err;
      }
    },
    enabled: !!user && !!spreadsheetId && spreadsheetId !== "undefined" && spreadsheetId !== "null", // Only fetch when user and spreadsheetId are available
  });

  // Fetch spreadsheet details
  const { data: spreadsheet } = useQuery({
    queryKey: ["spreadsheet", spreadsheetId],
    queryFn: async () => {
      if (!spreadsheetId || spreadsheetId === "undefined" || spreadsheetId === "null") {
        return null;
      }
      return await fetchSpreadsheet(spreadsheetId);
    },
    enabled: !!spreadsheetId && spreadsheetId !== "undefined" && spreadsheetId !== "null",
  });

  // Add customer mutation
  const addMutation = useMutation({
    mutationFn: (customerData: Omit<Customer, 'id'>) => addCustomer({ ...customerData, spreadsheet_id: spreadsheetId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", spreadsheetId] });
      toast({ title: "Customer added successfully!" });
      // Reset new row
      setNewRow({
        customer_name: "",
        company_name: "",
        phone_number: "",
        next_call_date: format(new Date(), "yyyy-MM-dd"),
        last_call_date: "",
        next_call_time: "",
        remark: "",
        meta_data: {},
        color: null,
      });
    },
    onError: (error: unknown) => {
      let errorMessage = "Failed to add customer";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      toast({ title: "Error adding customer", description: errorMessage, variant: "destructive" });
    },
  });

  // Update customer mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: string }) => {
      await updateCustomer(id, { [field]: value });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers", spreadsheetId] }),
  });

  // Delete customer mutation
  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", spreadsheetId] });
      toast({ title: "Customer deleted" });
    },
    onError: (error: unknown) => {
      let errorMessage = "Failed to delete customer";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      toast({ title: "Error deleting customer", description: errorMessage, variant: "destructive" });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: bulkDeleteCustomers,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["customers", spreadsheetId] });
      setSelectedCustomers(new Set()); // Clear selection
      toast({ title: `${data.deletedCount} customers deleted successfully` });
    },
    onError: (error: unknown) => {
      let errorMessage = "Failed to delete customers";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      toast({ title: "Error deleting customers", description: errorMessage, variant: "destructive" });
    },
  });

  // Reorder customers mutation
  const reorderMutation = useMutation({
    mutationFn: reorderCustomers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers", spreadsheetId] });
    },
    onError: (error: unknown) => {
      let errorMessage = "Failed to reorder customers";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      toast({ title: "Error reordering customers", description: errorMessage, variant: "destructive" });
    },
  });

  const displayedCustomers = useMemo(() => {
    if (!customers) return [];
    if (!Array.isArray(customers)) {
      console.error("Customers is not an array:", customers);
      return [];
    }
    if (viewMode === "all") return customers;
    const targetDateStr = format(selectedDate, "yyyy-MM-dd");
    return customers.filter((c) => c.next_call_date === targetDateStr);
  }, [customers, viewMode, selectedDate]);

  // Toggle customer selection
  const toggleCustomerSelection = (customerId: string) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  // Select all customers
  const selectAllCustomers = () => {
    if (selectedCustomers.size === displayedCustomers.length && displayedCustomers.length > 0) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(displayedCustomers.map(c => c.id)));
    }
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedCustomers.size === 0) return;

    if (window.confirm(`Are you sure you want to delete ${selectedCustomers.size} customer(s)?`)) {
      bulkDeleteMutation.mutate(Array.from(selectedCustomers));
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    setDraggedItem(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDropTarget(targetId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drop target if we're leaving the table
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain");

    if (draggedId !== targetId) {
      // Optimistically update the UI immediately
      const newOrder = [...displayedCustomers];
      const draggedIndex = newOrder.findIndex(c => c.id === draggedId);
      const targetIndex = newOrder.findIndex(c => c.id === targetId);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        // Remove the dragged item
        const [removed] = newOrder.splice(draggedIndex, 1);
        // Insert it at the new position
        newOrder.splice(targetIndex, 0, removed);

        // Update UI immediately
        queryClient.setQueryData(["customers"], newOrder);

        // Get the IDs in the new order
        const reorderedIds = newOrder.map(c => c.id);
        reorderMutation.mutate(reorderedIds, {
          onError: () => {
            // Rollback on error
            queryClient.setQueryData(["customers"], displayedCustomers);
            toast({ title: "Failed to reorder customers", variant: "destructive" });
          }
        });
      }
    }

    setDraggedItem(null);
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTarget(null);
  };

  // Render different states based on conditions
  if (!user) {
    return <div className="p-4 text-center">Redirecting to login...</div>;
  }

  if (error) {
    console.error("Query Error:", error);
    const errResp = (error as { response?: { status?: number; data?: unknown } }).response;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-xl font-bold text-red-600">Error loading customers</h2>
        <p className="text-gray-600">{error instanceof Error ? error.message : "Unknown error"}</p>
        {errResp && (
          <p className="text-gray-600 mt-2">Status: {errResp.status} - {JSON.stringify(errResp.data)}</p>
        )}
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  const handleAddRow = () => {
    const isMeta = spreadsheet?.is_meta;

    if (!isMeta) {
      if (!newRow.customer_name.trim() || !newRow.company_name.trim() || !newRow.phone_number.trim()) {
        toast({ title: "Please fill Customer Name, Company Name, and Phone No.", variant: "destructive" });
        return;
      }
    } else {
      // For Meta sheets, we need at least one field filled in meta_data or the standard fields
      const hasMetaData = Object.values(newRow.meta_data).some(v => v.trim().length > 0);
      if (!hasMetaData && !newRow.customer_name.trim()) {
        toast({ title: "Please fill at least one field", variant: "destructive" });
        return;
      }
    }

    // Prepare data
    const rowData: any = {
      ...newRow,
      spreadsheet_id: spreadsheetId!
    };

    // If meta, we must still satisfy the backend's required fields
    if (isMeta) {
      // Use the first few meta fields as defaults for the required fields if they are empty
      const metaValues = Object.values(newRow.meta_data);
      if (!rowData.customer_name) rowData.customer_name = metaValues[0] || 'Meta Lead';
      if (!rowData.company_name) rowData.company_name = metaValues[1] || 'Meta Ads';
      if (!rowData.phone_number) rowData.phone_number = metaValues[2] || 'N/A';
    }

    // Remove color field if it's null to avoid sending unnecessary data
    if (!rowData.color) delete rowData.color;

    addMutation.mutate(rowData as Omit<Customer, 'id'>);
  };

  const handleCellChange = (id: string, field: string, value: string) => {
    updateMutation.mutate({ id, field, value });
  };

  const handleNewRowKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddRow();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 z-50 relative">
        {/* Main Header */}
        <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/50 px-6 py-4 shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-accent/50" onClick={() => window.history.back()}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  {spreadsheet ? spreadsheet.name : 'Calling CRM'}
                </h1>
                <span className="text-xs text-muted-foreground font-medium">Welcome back, {user?.username}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end mr-4 border-r border-border/50 pr-4">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Today</span>
                <span className="text-sm font-semibold text-foreground">
                  {format(new Date(), "MMM do, yyyy")}
                </span>
              </div>

              {sharedUsers.length > 0 && (
                <div className="flex items-center -space-x-2 mr-2">
                  {sharedUsers.slice(0, 3).map((sharedUser, index) => (
                    <div
                      key={sharedUser.username}
                      className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium ring-offset-background"
                      title={`${sharedUser.username} (${sharedUser.permission_level})`}
                    >
                      {sharedUser.username.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {sharedUsers.length > 3 && (
                    <div className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium">
                      +{sharedUsers.length - 3}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-lg border border-border/50">
                <BulkImportDialog onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ["customers", spreadsheetId] })} />
                <Button variant="ghost" size="sm" className="h-8 group relative overflow-hidden transition-all duration-300 hover:w-auto hover:px-3 px-0 w-8" onClick={() => setIsGoogleSheetsDialogOpen(true)} title="Import from Google Sheets">
                  <div className="flex items-center justify-center gap-2 w-full">
                    <FileSpreadsheet className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400" />
                    <span className="max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 transition-all duration-300 whitespace-nowrap">
                      Google Sheets
                    </span>
                  </div>
                </Button>
                <Button variant="ghost" size="sm" className="h-8 group relative overflow-hidden transition-all duration-300 hover:w-auto hover:px-3 px-0 w-8" onClick={async () => {
                  if (!spreadsheetId) return;
                  try {
                    const blob = await exportCustomers(spreadsheetId);
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `customers_export.xlsx`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                  } catch (error) {
                    console.error('Export failed:', error);
                    toast({
                      title: "Export failed",
                      description: "Failed to export customer data. Please try again.",
                      variant: "destructive",
                    });
                  }
                }}>
                  <div className="flex items-center justify-center gap-2 w-full">
                    <Download className="h-4 w-4 flex-shrink-0" />
                    <span className="max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 transition-all duration-300 whitespace-nowrap">
                      Export
                    </span>
                  </div>
                </Button>
              </div>

              <Button variant="ghost" size="sm" onClick={logout} className="ml-2 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 group relative overflow-hidden transition-all duration-300 hover:w-auto hover:px-3 px-0 w-8">
                <div className="flex items-center justify-center gap-2 w-full">
                  <LogOut className="h-4 w-4 flex-shrink-0" />
                  <span className="max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 transition-all duration-300 whitespace-nowrap">
                    Logout
                  </span>
                </div>
              </Button>
            </div>
          </div>
        </header>

        {/* Sheet Tabs */}
        <div className="bg-background/95 border-b border-border/50 px-6 py-2 flex items-center gap-4 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "date" && isToday(selectedDate) ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                setViewMode("date");
                setSelectedDate(new Date());
              }}
            >
              Today
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={viewMode === "date" ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-2",
                    viewMode === "date" && !isToday(selectedDate) && "bg-secondary"
                  )}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {format(selectedDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setViewMode("date");
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="h-6 w-px bg-border/50" />

          <Button
            variant={viewMode === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("all")}
          >
            All Customers ({customers.length})
          </Button>

          <div className="ml-auto flex items-center gap-3">
            {!showSearch && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowSearch(true)}
                aria-label="Open search"
              >
                <Search className="h-4 w-4" />
              </Button>
            )}
            {showSearch && (
              <div
                ref={searchRef}
                className={cn(
                  "relative w-[280px] duration-200",
                  searchClosing
                    ? "animate-out slide-out-to-right-2 fade-out"
                    : "animate-in slide-in-from-right-2 fade-in"
                )}
              >
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, company, or phone"
                  className="pl-8 h-8"
                  autoFocus
                />
              </div>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowCheckboxes(true)}
              className="h-7 w-7 border-border/50"
              aria-label="Select rows to delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {showCheckboxes && (
          <div className="bg-primary/5 border-b border-border/50 px-4 py-2 flex items-center gap-4 backdrop-blur-sm animate-in slide-in-from-top-2">
            <div className="flex items-center gap-4 flex-1">
              <span className="text-sm font-medium text-primary">
                {selectedCustomers.size} selected
              </span>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="h-7 px-3 text-xs gap-2">
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Selected
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete {selectedCustomers.size} customer(s) from the database.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => {
                        bulkDeleteMutation.mutate(Array.from(selectedCustomers));
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={selectAllCustomers}
              className="h-7 px-3 text-xs ml-auto"
            >
              {selectedCustomers.size === displayedCustomers.length ? "Deselect All" : "Select All"}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCheckboxes(false);
                setSelectedCustomers(new Set());
              }}
              className="h-7 w-7 p-0 ml-2 text-muted-foreground hover:text-foreground"
              title="Close Selection Mode"
            >
              <span className="text-lg leading-none">&times;</span>
            </Button>
          </div>
        )}

      </div>



      {/* Spreadsheet - Only this section should scroll */}
      <div className="flex-1 overflow-auto bg-muted/10">
        <ResizableTable className="w-full border-separate border-spacing-0">
          <ResizableTableHeader className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm shadow-sm supports-[backdrop-filter]:bg-background/60">
            <ResizableTableRow className="bg-muted/50 hover:bg-muted/60 transition-colors border-b border-border/50">
              <ResizableTableHead
                className="border-b border-border/50 px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-10 sticky top-0 bg-muted/50"
                resizable={false}
              >
                {/* Row numbers header */}
              </ResizableTableHead>
              {spreadsheet?.is_meta && spreadsheet.meta_headers && spreadsheet.meta_headers.length > 0 ? (
                spreadsheet.meta_headers.map((header) => (
                  <ResizableTableHead key={header} className="border-b border-border/50 border-r border-border/50 px-3 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[150px] sticky top-0 bg-muted/50">
                    {header.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </ResizableTableHead>
                ))
              ) : (
                <>
                  <ResizableTableHead className="border-b border-border/50 border-r border-border/50 px-3 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[150px] sticky top-0 bg-muted/50">
                    Customer Name
                  </ResizableTableHead>
                  <ResizableTableHead className="border-b border-border/50 border-r border-border/50 px-3 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[150px] sticky top-0 bg-muted/50">
                    Company Name
                  </ResizableTableHead>
                  <ResizableTableHead className="border-b border-border/50 border-r border-border/50 px-3 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[120px] sticky top-0 bg-muted/50">
                    Phone No.
                  </ResizableTableHead>
                </>
              )}
              <ResizableTableHead className="border-b border-border/50 border-r border-border/50 px-3 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[130px] sticky top-0 bg-muted/50">
                Last Call Date
              </ResizableTableHead>
              <ResizableTableHead className="border-b border-border/50 border-r border-border/50 px-3 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[130px] sticky top-0 bg-muted/50">
                Next Call Date
              </ResizableTableHead>
              <ResizableTableHead className="border-b border-border/50 border-r border-border/50 px-3 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[100px] sticky top-0 bg-muted/50">
                Time
              </ResizableTableHead>
              <ResizableTableHead className="border-b border-border/50 border-r border-border/50 px-3 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[200px] sticky top-0 bg-muted/50">
                Remark
              </ResizableTableHead>
              <ResizableTableHead
                className="border-b border-border/50 px-2 py-1 text-center text-xs font-semibold text-muted-foreground w-12 sticky top-0 bg-muted/50"
                resizable={false}
              >
                Actions
              </ResizableTableHead>
              {showCheckboxes && (
                <ResizableTableHead
                  className="border-b border-border/50 px-3 py-2 text-center text-xs font-semibold text-muted-foreground w-8 sticky top-0 bg-muted/50"
                  resizable={false}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-primary/10"
                    onClick={selectAllCustomers}
                  >
                    {selectedCustomers.size === displayedCustomers.length && displayedCustomers.length > 0 ? (
                      <CheckSquare className="h-3 w-3 text-primary" />
                    ) : (
                      <Square className="h-3 w-3 text-muted-foreground" />
                    )}
                  </Button>
                </ResizableTableHead>
              )}
            </ResizableTableRow>
            {/* New Row Input */}
            <ResizableTableRow className="bg-background shadow-md z-30 relative group border-b-2 border-primary/20">
              <ResizableTableCell className="border-b border-primary/20 px-1 py-0.5 text-xs text-primary font-bold text-center bg-primary/5 sticky left-0 h-6">
                <Plus className="h-3 w-3 mx-auto" />
              </ResizableTableCell>
              {spreadsheet?.is_meta && spreadsheet.meta_headers && spreadsheet.meta_headers.length > 0 ? (
                spreadsheet.meta_headers.map((header, idx) => (
                  <ResizableTableCell key={header} className="border-b border-primary/20 p-0 h-6">
                    <div className="flex items-center h-full bg-background group-hover:bg-accent/5 transition-colors">
                      {idx === 0 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="ml-1 w-3 h-3 rounded-full border border-muted-foreground/50 flex-shrink-0 shadow-sm hover:scale-110 transition-transform"
                              style={{ backgroundColor: newRow.color || 'white' }} />
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2 bg-background/95 backdrop-blur shadow-xl border-border" align="start">
                            <div className="grid grid-cols-4 gap-1">
                              {[null, 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'].map((color) => (
                                <Button
                                  key={color || 'none'}
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 rounded-full hover:scale-110 transition-transform"
                                  onClick={() => setNewRow({ ...newRow, color: color as 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | null })}
                                >
                                  <div
                                    className={`w-4 h-4 rounded-full border-2 ${color ? 'border-background shadow-sm' : 'border-dashed border-muted-foreground/50'}`}
                                    style={{ backgroundColor: color || 'transparent' }}
                                  />
                                </Button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                      <div className="flex items-center h-full flex-1">
                        <AutoResizeTextarea
                          value={newRow.meta_data[header] || ""}
                          onChange={(e) => setNewRow({
                            ...newRow,
                            meta_data: { ...newRow.meta_data, [header]: e.target.value }
                          })}
                          onKeyDown={handleNewRowKeyDown}
                          className="!border-0 !ring-0 !ring-offset-0 !shadow-none rounded-none text-xs bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/50 font-medium px-3 leading-none h-full min-h-0"
                          placeholder={header.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          style={{ height: '100%' }}
                          rows={1}
                        />
                      </div>
                    </div>
                  </ResizableTableCell>
                ))
              ) : (
                <>
                  <ResizableTableCell className="border-b border-primary/20 p-0 h-6">
                    <div className="flex items-center h-full bg-background group-hover:bg-accent/5 transition-colors">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="ml-1 w-3 h-3 rounded-full border border-muted-foreground/50 flex-shrink-0 shadow-sm hover:scale-110 transition-transform"
                            style={{ backgroundColor: newRow.color || 'white' }} />
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2 bg-background/95 backdrop-blur shadow-xl border-border" align="start">
                          <div className="grid grid-cols-4 gap-1">
                            {[null, 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'].map((color) => (
                              <Button
                                key={color || 'none'}
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 rounded-full hover:scale-110 transition-transform"
                                onClick={() => setNewRow({ ...newRow, color: color as 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | null })}
                              >
                                <div
                                  className={`w-4 h-4 rounded-full border-2 ${color ? 'border-background shadow-sm' : 'border-dashed border-muted-foreground/50'}`}
                                  style={{ backgroundColor: color || 'transparent' }}
                                />
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <div className="flex items-center h-full flex-1">
                        <AutoResizeTextarea
                          value={newRow.customer_name}
                          onChange={(e) => setNewRow({ ...newRow, customer_name: e.target.value })}
                          onKeyDown={handleNewRowKeyDown}
                          className="!border-0 !ring-0 !ring-offset-0 !shadow-none rounded-none text-xs bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/50 font-medium px-3 leading-none h-full min-h-0"
                          placeholder="Add New "
                          style={{ height: '100%' }}
                          rows={1}
                        />
                      </div>
                    </div>
                  </ResizableTableCell>
                  <ResizableTableCell className="border-b border-primary/20 p-0 h-6">
                    <div className="flex items-center h-full bg-background group-hover:bg-accent/5 transition-colors">
                      <AutoResizeTextarea
                        value={newRow.company_name}
                        onChange={(e) => setNewRow({ ...newRow, company_name: e.target.value })}
                        onKeyDown={handleNewRowKeyDown}
                        className="!border-0 !ring-0 !ring-offset-0 !shadow-none rounded-none text-xs bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/50 px-3 leading-none h-full min-h-0"
                        placeholder="Company"
                        style={{ height: '100%' }}
                        rows={1}
                      />
                    </div>
                  </ResizableTableCell>
                  <ResizableTableCell className="border-b border-primary/20 p-0 h-6">
                    <div className="flex items-center h-full bg-background group-hover:bg-accent/5 transition-colors">
                      <AutoResizeTextarea
                        value={newRow.phone_number}
                        onChange={(e) => setNewRow({ ...newRow, phone_number: e.target.value })}
                        onKeyDown={handleNewRowKeyDown}
                        className="!border-0 !ring-0 !ring-offset-0 !shadow-none rounded-none text-xs bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/50 px-3 leading-none h-full min-h-0"
                        placeholder="Phone"
                        style={{ height: '100%' }}
                        rows={1}
                      />
                    </div>
                  </ResizableTableCell>
                </>
              )}
              <ResizableTableCell className="border-b border-primary/20 p-0 h-6">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full h-full px-3 text-left text-xs flex items-center gap-1 hover:bg-accent/10 transition-colors text-muted-foreground hover:text-foreground">
                      <CalendarIcon className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{newRow.last_call_date ? format(parseISO(newRow.last_call_date), "dd/MM/yyyy") : "Select"}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newRow.last_call_date ? parseISO(newRow.last_call_date) : undefined}
                      onSelect={(date) => date && setNewRow({ ...newRow, last_call_date: format(date, "yyyy-MM-dd") })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </ResizableTableCell>
              <ResizableTableCell className="border-b border-primary/20 p-0 h-6">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full h-full px-3 text-left text-xs flex items-center gap-1 hover:bg-accent/10 transition-colors text-muted-foreground hover:text-foreground">
                      <CalendarIcon className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{newRow.next_call_date ? format(parseISO(newRow.next_call_date), "dd/MM/yyyy") : "Select"}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newRow.next_call_date ? parseISO(newRow.next_call_date) : undefined}
                      onSelect={(date) => date && setNewRow({ ...newRow, next_call_date: format(date, "yyyy-MM-dd") })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </ResizableTableCell>
              <ResizableTableCell className="border-b border-primary/20 p-0 h-6">
                <Input
                  type="time"
                  value={newRow.next_call_time}
                  onChange={(e) => setNewRow({ ...newRow, next_call_time: e.target.value })}
                  onKeyDown={handleNewRowKeyDown}
                  className="border-0 rounded-none text-xs bg-transparent focus-visible:ring-0 w-full text-muted-foreground hover:text-foreground px-3 h-full"
                  style={{ height: '100%' }}
                />
              </ResizableTableCell>
              <ResizableTableCell className="border-b border-primary/20 p-0">
                <div className="flex items-center h-full bg-background group-hover:bg-accent/5 transition-colors">
                  <AutoResizeTextarea
                    value={newRow.remark}
                    onChange={(e) => setNewRow({ ...newRow, remark: e.target.value })}
                    onKeyDown={handleNewRowKeyDown}
                    className="!border-0 !ring-0 !ring-offset-0 !shadow-none rounded-none text-xs bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/50 px-3 leading-none h-full min-h-0"
                    placeholder="Remark"
                    style={{ height: '100%' }}
                    rows={1}
                  />
                </div>
              </ResizableTableCell>
              <ResizableTableCell className="border-b border-primary/20 p-0.5 text-center bg-background group-hover:bg-accent/5 transition-colors h-6">
                <Button
                  size="sm"
                  onClick={handleAddRow}
                  disabled={addMutation.isPending}
                  className="h-6 px-2 text-xs bg-primary hover:bg-primary/90 shadow-sm"
                >
                  {addMutation.isPending ? "..." : "Add"}
                </Button>
              </ResizableTableCell>
              {showCheckboxes && (
                <ResizableTableCell className="border-b border-primary/20 bg-background group-hover:bg-accent/5 transition-colors" />
              )}
            </ResizableTableRow>
          </ResizableTableHeader>
          <ResizableTableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <ResizableTableRow key={i} className="animate-pulse">
                  <ResizableTableCell colSpan={showCheckboxes ? 10 : 9} className="border-b border-border/50 px-3 py-2">
                    <Skeleton className="h-8 w-full bg-muted/50" />
                  </ResizableTableCell>
                </ResizableTableRow>
              ))
            ) : (
              <>
                {displayedCustomers.length === 0 && (
                  <ResizableTableRow>
                    <ResizableTableCell colSpan={showCheckboxes ? 10 : 9} className="border-b border-border/50 px-3 py-12 text-center text-muted-foreground text-sm">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <Users className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                        <p>No customers yet. Start adding above!</p>
                      </div>
                    </ResizableTableCell>
                  </ResizableTableRow>
                )}
                {displayedCustomers.map((customer, index) => (
                  <Fragment key={customer.id}>
                    {/* Drop zone before row */}
                    <tr
                      className={`h-2 ${dropTarget === `before-${customer.id}` ? 'bg-primary/20 border-t-2 border-dashed border-primary' : 'bg-transparent'}`}
                      onDragOver={handleDragOver}
                      onDragEnter={(e) => handleDragEnter(e, `before-${customer.id}`)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => {
                        e.preventDefault();
                        const draggedId = e.dataTransfer.getData("text/plain");
                        if (draggedId !== customer.id) {
                          // Move dragged item to before this item
                          const newOrder = [...displayedCustomers];
                          const draggedIndex = newOrder.findIndex(c => c.id === draggedId);
                          const targetIndex = newOrder.findIndex(c => c.id === customer.id);

                          if (draggedIndex !== -1 && targetIndex !== -1) {
                            const [removed] = newOrder.splice(draggedIndex, 1);
                            newOrder.splice(targetIndex, 0, removed);

                            const reorderedIds = newOrder.map(c => c.id);
                            reorderMutation.mutate(reorderedIds);
                          }
                        }
                        setDraggedItem(null);
                        setDropTarget(null);
                      }}
                    />

                    <MemoizedSpreadsheetRow
                      customer={customer}
                      index={index + 1}
                      isSelected={selectedCustomers.has(customer.id)}
                      isDragging={draggedItem === customer.id}
                      dropTarget={dropTarget}
                      selectedCustomers={selectedCustomers}
                      onToggleSelect={toggleCustomerSelection}
                      onCellChange={handleCellChange}
                      onDelete={() => deleteMutation.mutate(customer.id)}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                      showCheckboxes={showCheckboxes}
                      rowHeights={rowHeights}
                      setRowHeights={setRowHeights}
                      focusedCell={focusedCell}
                      setFocusedCell={setFocusedCell}
                      onWhatsAppClick={(c) => {
                        setSelectedWhatsAppCustomer(c);
                        setIsWhatsAppDialogOpen(true);
                      }}
                      is_meta={spreadsheet?.is_meta}
                      meta_headers={spreadsheet?.meta_headers}
                    />

                    {/* Drop zone after last row */}
                    {index === displayedCustomers.length - 1 && (
                      <tr
                        className={`h-2 ${dropTarget === `after-${customer.id}` ? 'bg-primary/20 border-b-2 border-dashed border-primary' : 'bg-transparent'}`}
                        onDragOver={handleDragOver}
                        onDragEnter={(e) => handleDragEnter(e, `after-${customer.id}`)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => {
                          e.preventDefault();
                          const draggedId = e.dataTransfer.getData("text/plain");
                          if (draggedId !== customer.id) {
                            // Move dragged item to after this item
                            const newOrder = [...displayedCustomers];
                            const draggedIndex = newOrder.findIndex(c => c.id === draggedId);
                            const targetIndex = newOrder.findIndex(c => c.id === customer.id);

                            if (draggedIndex !== -1 && targetIndex !== -1) {
                              const [removed] = newOrder.splice(draggedIndex, 1);
                              newOrder.splice(targetIndex + 1, 0, removed);

                              const reorderedIds = newOrder.map(c => c.id);
                              reorderMutation.mutate(reorderedIds);
                            }
                          }
                          setDraggedItem(null);
                          setDropTarget(null);
                        }}
                      />
                    )}
                  </Fragment>
                ))}

              </>
            )}
          </ResizableTableBody>
        </ResizableTable>
      </div >
      {/* WhatsApp Message Dialog */}
      <SpreadsheetWhatsAppDialog
        isOpen={isWhatsAppDialogOpen}
        onClose={() => setIsWhatsAppDialogOpen(false)}
        customer={selectedWhatsAppCustomer}
      />

      {/* Google Sheets Import Dialog */}
      <GoogleSheetsDialog
        open={isGoogleSheetsDialogOpen}
        onOpenChange={setIsGoogleSheetsDialogOpen}
        spreadsheetId={spreadsheetId || ""}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["customers", spreadsheetId] });
          toast({ title: "Data imported from Google Sheets!" });
        }}
      />
    </div >
  );
};

function SpreadsheetRow({
  customer,
  index,
  isSelected,
  isDragging,
  dropTarget,
  selectedCustomers,
  onToggleSelect,
  onCellChange,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onDragEnd,
  showCheckboxes,
  rowHeights,
  setRowHeights,
  focusedCell,
  setFocusedCell,
  onWhatsAppClick,
  is_meta,
  meta_headers
}: {
  customer: Customer;
  index: number;
  isSelected: boolean;
  isDragging: boolean;
  dropTarget: string | null;
  selectedCustomers: Set<string>;
  onToggleSelect: (id: string) => void;
  onCellChange: (id: string, field: string, value: string) => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent, targetId: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
  onDragEnd: () => void;
  showCheckboxes: boolean;
  rowHeights: Record<string, number>;
  setRowHeights: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  focusedCell: string | null;
  setFocusedCell: React.Dispatch<React.SetStateAction<string | null>>;
  onWhatsAppClick: (customer: Customer) => void;
  is_meta?: boolean;
  meta_headers?: string[];
}) {
  const [date, setDate] = useState<Date | undefined>(
    customer.next_call_date ? parseISO(customer.next_call_date) : undefined
  );

  // Set initial row height
  useEffect(() => {
    // This will be handled by the parent component setting the style directly
  }, []);
  const [lastCallDate, setLastCallDate] = useState<Date | undefined>(
    customer.last_call_date ? parseISO(customer.last_call_date) : undefined
  );
  const [localColor, setLocalColor] = useState(customer.color);

  // Sync localColor with customer.color when it changes from outside (e.g. after refetch)
  useEffect(() => {
    setLocalColor(customer.color);
  }, [customer.color]);

  // Sync lastCallDate with customer.last_call_date when it changes from outside (e.g. after refetch)
  useEffect(() => {
    setLastCallDate(customer.last_call_date ? parseISO(customer.last_call_date) : undefined);
  }, [customer.last_call_date]);

  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
      onCellChange(customer.id, "next_call_date", format(newDate, "yyyy-MM-dd"));
    }
  };

  const handleLastCallDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      setLastCallDate(newDate);
      onCellChange(customer.id, "last_call_date", format(newDate, "yyyy-MM-dd"));
    }
  };

  // Handle color change
  const handleColorChange = (color: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | null) => {
    // Update local state immediately for instant feedback
    setLocalColor(color);
    // Update database
    onCellChange(customer.id, "color", color || "");
  };

  return (
    <ResizableTableRow
      className={`animate-fade-in hover:bg-accent/5 transition-all duration-200 group bg-background ${isSelected ? "bg-primary/10 hover:bg-primary/20" : ""
        } ${isDragging ? "opacity-50 scale-95 shadow-lg" : ""
        } ${dropTarget === customer.id ? "border-2 border-dashed border-primary" : "border-b border-border/50"
        }`}
      onDragOver={onDragOver}
      onDragEnter={(e) => onDragEnter(e, customer.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, customer.id)}
      onDragEnd={onDragEnd}
    >
      <ResizableTableCell
        className="border-b border-border/50 border-r border-border/50 px-1 py-0.5 text-xs text-muted-foreground text-center bg-muted/20"
        style={{ height: '24px' }}
        title="Drag to reorder"
        draggable
        onDragStart={(e) => onDragStart(e, customer.id)}
      >
        <div className="absolute inset-0 flex items-center justify-center font-medium cursor-move hover:text-foreground">
          {index}
        </div>
      </ResizableTableCell>
      {is_meta && meta_headers && meta_headers.length > 0 ? (
        meta_headers.map((header) => (
          <ResizableTableCell key={header} className="border-b border-border/50 border-r border-border/50 p-0 h-6">
            <div
              className={cn(
                "flex items-center h-full transition-all duration-200",
                focusedCell === `${customer.id}-${header}` && "ring-2 ring-primary ring-inset shadow-[0_0_20px_hsl(var(--primary)/0.4)] bg-primary/[0.05] z-20 border-[1px] border-primary"
              )}
              onClick={() => setFocusedCell(`${customer.id}-${header}`)}
            >
              <AutoResizeTextarea
                defaultValue={customer.meta_data?.[header] || ""}
                onBlur={(e) => onCellChange(customer.id, `meta_data.${header}`, e.target.value)}
                onFocus={() => setFocusedCell(`${customer.id}-${header}`)}
                className="!border-0 !ring-0 !ring-offset-0 !shadow-none rounded-none text-sm focus-visible:ring-0 focus-visible:ring-inset w-full hover:bg-muted/30 transition-colors px-1.5 py-1 leading-tight h-full min-h-0"
                style={{ height: '100%' }}
              />
            </div>
          </ResizableTableCell>
        ))
      ) : (
        <>
          <ResizableTableCell className="border-b border-border/50 border-r border-border/50 p-0 h-6">
            <div className="flex items-center h-full">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="ml-1 w-4 h-4 rounded-full border border-muted-foreground/50 flex-shrink-0 shadow-sm hover:scale-110 transition-transform"
                    style={{ backgroundColor: localColor || 'white' }} />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2 bg-background/95 backdrop-blur shadow-xl border-border" align="start">
                  <div className="grid grid-cols-4 gap-1">
                    {[null, 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'].map((color) => (
                      <Button
                        key={color || 'none'}
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 rounded-full hover:scale-110 transition-transform"
                        onClick={() => handleColorChange(color as Customer['color'])}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border-2 ${color ? 'border-background shadow-sm' : 'border-dashed border-muted-foreground/50'}`}
                          style={{ backgroundColor: color || 'transparent' }}
                        />
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <div
                className={cn(
                  "flex items-center h-full flex-1 transition-all duration-200",
                  focusedCell === `${customer.id}-customer_name` && "ring-2 ring-primary ring-inset shadow-[0_0_20px_hsl(var(--primary)/0.4)] bg-primary/[0.05] z-20 border-[1px] border-primary"
                )}
                onClick={() => setFocusedCell(`${customer.id}-customer_name`)}
              >
                <AutoResizeTextarea
                  defaultValue={customer.customer_name}
                  onBlur={(e) => onCellChange(customer.id, "customer_name", e.target.value)}
                  onFocus={() => setFocusedCell(`${customer.id}-customer_name`)}
                  className="!border-0 !ring-0 !ring-offset-0 !shadow-none rounded-none text-sm focus-visible:ring-0 focus-visible:ring-inset w-full hover:bg-muted/30 transition-colors px-1.5 py-1 leading-tight h-full min-h-0"
                  style={{ height: '100%' }}
                />
              </div>
            </div>
          </ResizableTableCell>
          <ResizableTableCell className="border-b border-border/50 border-r border-border/50 p-0 h-6">
            <div
              className={cn(
                "flex items-center h-full transition-all duration-200",
                focusedCell === `${customer.id}-company_name` && "ring-2 ring-primary ring-inset shadow-[0_0_20px_hsl(var(--primary)/0.4)] bg-primary/[0.05] z-20 border-[1px] border-primary"
              )}
              onClick={() => setFocusedCell(`${customer.id}-company_name`)}
            >
              <AutoResizeTextarea
                defaultValue={customer.company_name}
                onBlur={(e) => onCellChange(customer.id, "company_name", e.target.value)}
                onFocus={() => setFocusedCell(`${customer.id}-company_name`)}
                className="!border-0 !ring-0 !ring-offset-0 !shadow-none rounded-none text-sm focus-visible:ring-0 focus-visible:ring-inset w-full hover:bg-muted/30 transition-colors px-1.5 py-1 leading-tight h-full min-h-0"
                style={{ height: '100%' }}
              />
            </div>
          </ResizableTableCell>
          <ResizableTableCell className="border-b border-border/50 border-r border-border/50 p-0 h-6">
            <div
              className={cn(
                "flex items-center h-full transition-all duration-200",
                focusedCell === `${customer.id}-phone_number` && "ring-2 ring-primary ring-inset shadow-[0_0_20px_hsl(var(--primary)/0.4)] bg-primary/[0.05] z-20 border-[1px] border-primary"
              )}
              onClick={() => setFocusedCell(`${customer.id}-phone_number`)}
            >
              <AutoResizeTextarea
                defaultValue={customer.phone_number}
                onBlur={(e) => onCellChange(customer.id, "phone_number", e.target.value)}
                onFocus={() => setFocusedCell(`${customer.id}-phone_number`)}
                className="!border-0 !ring-0 !ring-offset-0 !shadow-none rounded-none text-sm focus-visible:ring-0 focus-visible:ring-inset w-full hover:bg-muted/30 transition-colors px-1.5 py-1 leading-tight h-full min-h-0"
                style={{ height: '100%' }}
              />
            </div>
          </ResizableTableCell>
        </>
      )}
      <ResizableTableCell className="border-b border-border/50 border-r border-border/50 p-0 h-6">
        <Popover>
          <PopoverTrigger asChild>
            <button className="w-full h-full px-2 text-left text-sm flex items-center gap-1 hover:bg-accent/10 transition-colors">
              <CalendarIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{lastCallDate ? format(lastCallDate, "dd/MM/yyyy") : "Pick"}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={lastCallDate}
              onSelect={handleLastCallDateChange}
              initialFocus
              className="pointer-events-auto scale-90 origin-top-left"
            />
          </PopoverContent>
        </Popover>
      </ResizableTableCell>
      <ResizableTableCell className="border-b border-border/50 border-r border-border/50 p-0 h-8">
        <Popover>
          <PopoverTrigger asChild>
            <button className="w-full h-full px-2 text-left text-sm flex items-center gap-1 hover:bg-accent/10 transition-colors">
              <CalendarIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{date ? format(date, "dd/MM/yyyy") : "Pick"}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateChange}
              initialFocus
              className="pointer-events-auto scale-90 origin-top-left"
            />
          </PopoverContent>
        </Popover>
      </ResizableTableCell>
      <ResizableTableCell className="border-b border-border/50 border-r border-border/50 p-0 h-8">
        <div
          className={cn(
            "flex items-center h-full transition-all duration-200",
            focusedCell === `${customer.id}-next_call_time` && "ring-2 ring-primary ring-inset shadow-[0_0_20px_hsl(var(--primary)/0.4)] bg-primary/[0.05] z-20 border-[1px] border-primary"
          )}
          onClick={() => setFocusedCell(`${customer.id}-next_call_time`)}
        >
          <Input
            type="time"
            defaultValue={customer.next_call_time || ""}
            onBlur={(e) => onCellChange(customer.id, "next_call_time", e.target.value)}
            onFocus={() => setFocusedCell(`${customer.id}-next_call_time`)}
            className="!border-0 !ring-0 !ring-offset-0 !shadow-none rounded-none text-sm focus-visible:ring-0 focus-visible:ring-inset w-full hover:bg-muted/30 transition-colors px-1.5 h-full min-h-0"
            style={{ height: '100%' }}
          />
        </div>
      </ResizableTableCell>
      <ResizableTableCell className="border-b border-border/50 border-r border-border/50 p-0 h-6">
        <div
          className={cn(
            "flex items-center h-full transition-all duration-200",
            focusedCell === `${customer.id}-remark` && "ring-2 ring-primary ring-inset shadow-[0_0_20px_hsl(var(--primary)/0.4)] bg-primary/[0.05] z-20 border-[1px] border-primary"
          )}
          onClick={() => setFocusedCell(`${customer.id}-remark`)}
        >
          <AutoResizeTextarea
            defaultValue={customer.remark || ""}
            onBlur={(e) => onCellChange(customer.id, "remark", e.target.value)}
            onFocus={() => setFocusedCell(`${customer.id}-remark`)}
            className="!border-0 !ring-0 !ring-offset-0 !shadow-none rounded-none text-sm focus-visible:ring-0 focus-visible:ring-inset w-full resize-none hover:bg-muted/30 transition-colors px-1.5 py-1 leading-tight h-full min-h-0"
            style={{ height: '100%', minHeight: 'auto' }}
          />
        </div>
      </ResizableTableCell>
      <ResizableTableCell className="border-b border-border/50 border-r border-border/50 p-0.5 text-center h-6">
        <div className="flex items-center justify-center gap-1 h-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onWhatsAppClick(customer)}
            className="h-6 w-6 p-0 rounded-full text-muted-foreground hover:text-green-600 hover:bg-green-50 transition-colors"
          >
            <MessageCircle className="h-3 w-3" />
          </Button>
        </div>
      </ResizableTableCell>
      {
        showCheckboxes && (
          <ResizableTableCell className="border-b border-border/50 px-1 py-1 text-center">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-primary/10 transition-colors"
              onClick={() => onToggleSelect(customer.id)}
            >
              {isSelected ? (
                <CheckSquare className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Square className="h-3.5 w-3.5" />
              )}
            </Button>
          </ResizableTableCell>
        )
      }
    </ResizableTableRow >
  );
}

const MemoizedSpreadsheetRow = memo(SpreadsheetRow);

export default Index;
