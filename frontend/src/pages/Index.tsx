import { useState, useMemo, useRef, useEffect, memo, Fragment } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trash2, CalendarIcon, MessageCircle, GripVertical, Square, CheckSquare, Star, Zap, Globe, Moon, Sun } from "lucide-react";
import { format, isToday, parseISO, isPast, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCustomers, addCustomer, updateCustomer, deleteCustomer, Customer, bulkDeleteCustomers, reorderCustomers } from "@/lib/api";

import { useAuth } from "@/context/AuthContext";
import { LogOut } from "lucide-react";
import { BulkImportDialog } from "@/components/BulkImportDialog";
import { ResizableTable, ResizableTableHeader, ResizableTableBody, ResizableTableHead, ResizableTableRow, ResizableTableCell } from "@/components/ui/resizable-table";

const Index = () => {
  console.log("Index component rendering");
  const [viewMode, setViewMode] = useState<"date" | "all">("date");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logout, user } = useAuth();
  
  // Bulk selection state
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [showCheckboxes, setShowCheckboxes] = useState(false);

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  // New row state
  const [newRow, setNewRow] = useState({
    customer_name: "",
    company_name: "",
    phone_number: "",
    next_call_date: format(new Date(), "yyyy-MM-dd"),
    last_call_date: "",
    next_call_time: "",
    remark: "",
    color: null as 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | null,
  });

  // Fetch customers
  const { data: customers = [], isLoading, error } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      try {
        console.log("Fetching customers...");
        const data = await fetchCustomers();
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
    enabled: !!user, // Only fetch when user is available
  });

  // Add customer mutation
  const addMutation = useMutation({
    mutationFn: addCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Customer added successfully!" });
      // Reset new row
      setNewRow({
        customer_name: "",
        company_name: "",
        phone_number: "",
        next_call_date: format(new Date(), "yyyy-MM-dd"),
        next_call_time: "",
        remark: "",
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });

  // Delete customer mutation
  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
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
      queryClient.invalidateQueries({ queryKey: ["customers"] });
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
      queryClient.invalidateQueries({ queryKey: ["customers"] });
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
    // Type guard to check if error has response property (e.g., Axios errors)
    const hasResponse = (error as any).response;
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-xl font-bold text-red-600">Error loading customers</h2>
        <p className="text-gray-600">{error.message}</p>
        {hasResponse && (
          <p className="text-gray-600 mt-2">Status: {hasResponse.status} - {JSON.stringify(hasResponse.data)}</p>
        )}
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  const handleAddRow = () => {
    if (!newRow.customer_name.trim() || !newRow.company_name.trim() || !newRow.phone_number.trim()) {
      toast({ title: "Please fill Customer Name, Company Name, and Phone No.", variant: "destructive" });
      return;
    }
    // Remove color field if it's null to avoid sending unnecessary data
    const { color, ...newRowWithoutNullColor } = newRow;
    const rowData = color ? newRow : newRowWithoutNullColor;
    addMutation.mutate(rowData as any);
  };

  // Helper function to determine customer priority level
  const getCustomerPriority = (customer: Customer) => {
    const today = new Date();
    const nextCallDate = customer.next_call_date ? parseISO(customer.next_call_date) : null;
    const lastCallDate = customer.last_call_date ? parseISO(customer.last_call_date) : null;
    
    // High priority: overdue calls
    if (nextCallDate && isPast(nextCallDate) && !isToday(nextCallDate)) {
      return 'high';
    }
    
    // Medium priority: calls due today or tomorrow
    if (nextCallDate && (isToday(nextCallDate) || 
        differenceInDays(nextCallDate, today) === 1)) {
      return 'medium';
    }
    
    // Low priority: calls in distant future or no recent activity
    if ((!lastCallDate && !nextCallDate) || 
        (lastCallDate && differenceInDays(today, lastCallDate) > 30)) {
      return 'low';
    }
    
    return 'normal';
  };

  const handleCellChange = (id: string, field: string, value: string) => {
    updateMutation.mutate({ id, field, value });
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Fixed Header Section */}
      <div className="flex-shrink-0">
        {/* Cosmic Header with Nebula Effects */}
        <header className="bg-gradient-to-r from-indigo-900/30 via-purple-900/20 to-pink-900/30 border-b border-border px-4 py-3 relative overflow-hidden">
          {/* Animated cosmic background */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-indigo-300 rounded-full animate-ping" style={{animationDuration: '3s'}}></div>
            <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-purple-300 rounded-full animate-ping" style={{animationDelay: '1s', animationDuration: '4s'}}></div>
            <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-pink-300 rounded-full animate-ping" style={{animationDelay: '2s', animationDuration: '5s'}}></div>
          </div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-indigo-400 animate-spin" style={{animationDuration: '20s'}} />
                <h1 className="text-xl font-bold text-foreground bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                  Cosmic Calling CRM
                </h1>
              </div>
              <div className="px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs flex items-center gap-1">
                <Star className="h-3 w-3" />
                Welcome, {user?.username}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-sm flex items-center gap-2">
                <Sun className="h-4 w-4" />
                {format(new Date(), "EEEE, MMMM do, yyyy")}
              </div>
              <BulkImportDialog onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ["customers"] })} />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={logout}
                className="border-indigo-500/50 hover:bg-indigo-500/20 transition-all duration-300 group"
              >
                <LogOut className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                <span className="text-indigo-300">Logout</span>
              </Button>
            </div>
          </div>
          
          {/* Decorative nebula effect */}
          <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-indigo-500/10 to-transparent"></div>
        </header>

        {/* Quantum Navigation Tabs */}
        <div className="bg-gradient-to-r from-indigo-900/20 via-purple-900/10 to-pink-900/20 border-b border-border px-4 py-2 flex items-center gap-4 relative overflow-hidden">
          {/* Subtle animated background */}
          <div className="absolute inset-0 opacity-10 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent animate-pulse"></div>
          
          <div className="flex items-center gap-2 relative z-10">
            <Button
              variant={viewMode === "date" && isToday(selectedDate) ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                setViewMode("date");
                setSelectedDate(new Date());
              }}
              className="group hover:bg-indigo-500/20 transition-all duration-300 border-indigo-500/30"
            >
              <Zap className="h-4 w-4 mr-1 text-yellow-400 group-hover:animate-pulse" />
              Today
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={viewMode === "date" ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-2 hover:bg-indigo-500/20 transition-all duration-300 border-indigo-500/30",
                    viewMode === "date" && !isToday(selectedDate) && "bg-indigo-500/30 border-indigo-500/50"
                  )}
                >
                  <CalendarIcon className="h-4 w-4 text-indigo-400" />
                  <span className="text-indigo-200">{format(selectedDate, "PPP")}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card/90 backdrop-blur-sm border-indigo-500/30" align="start">
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
                  className="rounded-lg"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="h-6 w-px bg-indigo-500/30" />

          <Button
            variant={viewMode === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("all")}
            className="group hover:bg-purple-500/20 transition-all duration-300 border-purple-500/30"
          >
            <Globe className="h-4 w-4 mr-1 text-purple-400 group-hover:rotate-180 transition-transform duration-500" />
            <span className="text-purple-200">All Customers ({customers.length})</span>
          </Button>
          
          <div className="h-6 w-px bg-purple-500/30" />
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCheckboxes(true)}
            className="h-7 px-2 text-xs flex items-center gap-1 hover:bg-red-500/20 border-red-500/30 transition-all duration-300 group"
          >
            <Trash2 className="h-3 w-3 text-red-400 group-hover:animate-bounce" />
            <span className="text-red-300">Delete</span>
          </Button>
          
          {/* Decorative constellation */}
          <div className="ml-auto flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-indigo-400/50 animate-pulse"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400/50 animate-pulse" style={{animationDelay: '0.5s'}}></div>
            <div className="w-1 h-1 rounded-full bg-pink-400/50 animate-pulse" style={{animationDelay: '1s'}}></div>
          </div>
        </div>

        {/* Quantum Bulk Actions Bar */}
        {showCheckboxes && (
          <div className="bg-gradient-to-r from-red-900/30 via-purple-900/20 to-indigo-900/30 border-b border-red-500/30 px-4 py-2 flex items-center gap-4 relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-transparent via-red-500/10 to-transparent animate-pulse"></div>
            
            <div className="flex items-center gap-2 relative z-10">
              <div className="px-2 py-1 rounded-full bg-red-500/20 text-red-300 text-xs flex items-center gap-1">
                <Star className="h-3 w-3" />
                <span className="font-medium">{selectedCustomers.size} selected</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={selectAllCustomers}
                className="h-7 px-2 text-xs border-indigo-500/50 hover:bg-indigo-500/20 text-indigo-300 transition-all duration-300"
              >
                {selectedCustomers.size === displayedCustomers.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <div className="h-4 w-px bg-red-500/30" />
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete ${selectedCustomers.size} customer(s)?`)) {
                  bulkDeleteMutation.mutate(Array.from(selectedCustomers), {
                    onSuccess: () => {
                      setShowCheckboxes(false);
                      setSelectedCustomers(new Set());
                    }
                  });
                }
              }}
              disabled={bulkDeleteMutation.isPending}
              className="h-7 px-2 text-xs bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 border-0 transition-all duration-300 shadow-lg hover:shadow-red-500/20"
            >
              {bulkDeleteMutation.isPending ? (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-white animate-bounce"></div>
                  <span>Deleting...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Trash2 className="h-3 w-3" />
                  <span>Delete Selected</span>
                </div>
              )}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setShowCheckboxes(false);
                setSelectedCustomers(new Set());
              }}
              className="h-7 px-2 text-xs ml-auto hover:bg-indigo-500/20 text-indigo-300 transition-all duration-300"
            >
              <span>Cancel</span>
            </Button>
          </div>
        )}
      </div>



      {/* Cosmic Spreadsheet - Infinite Scrolling Universe */}
      <div className="flex-1 overflow-auto relative">
        {/* Subtle starfield background */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute top-10 left-10 w-1 h-1 bg-white rounded-full animate-pulse"></div>
          <div className="absolute top-20 right-20 w-1 h-1 bg-white rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
          <div className="absolute bottom-32 left-1/4 w-1 h-1 bg-white rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-white rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
        </div>
        <ResizableTable className="w-full border-collapse">
          <ResizableTableHeader className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-pink-900/40 sticky top-0 shadow-lg z-10 border-b-2 border-indigo-500/30 backdrop-blur-sm">
            <ResizableTableRow>
              <ResizableTableHead 
                className="border border-border px-3 py-2 text-left text-xs font-bold text-indigo-300 w-10 backdrop-blur-sm"
                resizable={false}
              >
                {/* Row numbers header */}
              </ResizableTableHead>
              {/* Removed drag handle column header */}
              <ResizableTableHead className="border border-border px-3 py-2 text-left text-xs font-bold text-indigo-300 min-w-[150px] backdrop-blur-sm">
                Customer Name
              </ResizableTableHead>
              <ResizableTableHead className="border border-border px-3 py-2 text-left text-xs font-bold text-indigo-300 min-w-[150px] backdrop-blur-sm">
                Company Name
              </ResizableTableHead>
              <ResizableTableHead className="border border-border px-3 py-2 text-left text-xs font-bold text-indigo-300 min-w-[120px] backdrop-blur-sm">
                Phone No.
              </ResizableTableHead>
              <ResizableTableHead className="border border-border px-3 py-2 text-left text-xs font-bold text-indigo-300 min-w-[130px] backdrop-blur-sm">
                Last Call Date
              </ResizableTableHead>
              <ResizableTableHead className="border border-border px-3 py-2 text-left text-xs font-bold text-indigo-300 min-w-[130px] backdrop-blur-sm">
                Next Call Date
              </ResizableTableHead>
              <ResizableTableHead className="border border-border px-3 py-2 text-left text-xs font-bold text-indigo-300 min-w-[100px] backdrop-blur-sm">
                Time
              </ResizableTableHead>
              <ResizableTableHead className="border border-border px-3 py-2 text-left text-xs font-bold text-indigo-300 min-w-[200px] backdrop-blur-sm">
                Remark
              </ResizableTableHead>
              <ResizableTableHead 
                className="border border-border px-3 py-2 text-center text-xs font-bold text-indigo-300 w-12 backdrop-blur-sm"
                resizable={false}
              >
                WP
              </ResizableTableHead>
              {showCheckboxes && (
                <ResizableTableHead 
                  className="border border-border px-3 py-2 text-center text-xs font-bold text-red-300 w-8 backdrop-blur-sm"
                  resizable={false}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-red-500/20 transition-colors duration-300"
                    onClick={selectAllCustomers}
                  >
                    {selectedCustomers.size === displayedCustomers.length && displayedCustomers.length > 0 ? (
                      <CheckSquare className="h-3 w-3 text-red-400 animate-pulse" />
                    ) : (
                      <Square className="h-3 w-3 text-red-300/70" />
                    )}
                  </Button>
                </ResizableTableHead>
              )}
            </ResizableTableRow>
          </ResizableTableHeader>
          <ResizableTableBody>
            {isLoading ? (
              <ResizableTableRow>
                <ResizableTableCell colSpan={showCheckboxes ? 10 : 9} className="border border-border px-3 py-8 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                    </div>
                    <span className="text-indigo-300">Loading cosmic data...</span>
                  </div>
                </ResizableTableCell>
              </ResizableTableRow>
            ) : (
              <>
                {displayedCustomers.length === 0 && (
                  <ResizableTableRow>
                    <ResizableTableCell colSpan={showCheckboxes ? 10 : 9} className="border border-border px-3 py-8 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                          <Globe className="h-6 w-6 text-indigo-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-indigo-200">
                            {viewMode === "date" 
                              ? `No calls scheduled for ${format(selectedDate, "MMM do")}` 
                              : "No customers in orbit"}
                          </h3>
                          <p className="text-sm text-indigo-400/70 mt-1">
                            {viewMode === "date" 
                              ? "Select another date or add a new customer" 
                              : "Add your first customer to begin your cosmic journey"}
                          </p>
                        </div>
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
                {/* New Row Input */}
                <ResizableTableRow className="bg-gradient-to-r from-indigo-900/30 via-purple-900/20 to-pink-900/30 border-t-2 border-indigo-500/30">
                  <ResizableTableCell className="border border-border px-3 py-1 text-xs font-medium text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 animate-pulse"></div>
                    <div className="relative flex items-center justify-center gap-1">
                      <Star className="h-3 w-3 text-yellow-400 animate-pulse" />
                      <span className="text-indigo-200 font-bold">ADD NEW</span>
                    </div>
                  </ResizableTableCell>
                  <ResizableTableCell className="border border-border p-0">
                    <div className="flex items-center h-9">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="ml-2 w-4 h-4 rounded-full border-2 border-white/30 flex-shrink-0 shadow-md hover:scale-110 transition-transform duration-200" 
                            style={{ backgroundColor: newRow.color && newRow.color !== "" ? newRow.color : '#f1f5f9' }} />
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2 bg-card/90 backdrop-blur-sm border-indigo-500/30" align="start">
                          <div className="grid grid-cols-4 gap-1">
                            {[null, 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'].map((color) => (
                              <Button
                                key={color || 'none'}
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-indigo-500/20 transition-colors duration-200"
                                onClick={() => setNewRow({ ...newRow, color: color as any })}
                              >
                                <div 
                                  className={`w-4 h-4 rounded-full border-2 ${color ? 'border-white/30' : 'border-dashed border-white/50'}`} 
                                  style={{ backgroundColor: color || 'transparent' }} 
                                />
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Input
                        value={newRow.customer_name}
                        onChange={(e) => setNewRow({ ...newRow, customer_name: e.target.value })}
                        className="border-0 rounded-none h-9 text-sm bg-transparent focus-visible:ring-0 focus-visible:ring-inset flex-grow placeholder-indigo-300/50"
                        placeholder="Customer Name"
                      />
                    </div>
                  </ResizableTableCell>
                  <ResizableTableCell className="border border-border p-0">
                    <Input
                      value={newRow.company_name}
                      onChange={(e) => setNewRow({ ...newRow, company_name: e.target.value })}
                      className="border-0 rounded-none h-9 text-sm bg-transparent focus-visible:ring-0 focus-visible:ring-inset placeholder-indigo-300/50"
                      placeholder="Company Name"
                    />
                  </ResizableTableCell>
                  <ResizableTableCell className="border border-border p-0">
                    <Input
                      value={newRow.phone_number}
                      onChange={(e) => setNewRow({ ...newRow, phone_number: e.target.value })}
                      className="border-0 rounded-none h-9 text-sm bg-transparent focus-visible:ring-0 focus-visible:ring-inset placeholder-indigo-300/50"
                      placeholder="Phone Number"
                    />
                  </ResizableTableCell>
                  <ResizableTableCell className="border border-border p-0">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-full h-9 px-3 text-left text-sm flex items-center gap-2 hover:bg-indigo-500/20 rounded transition-colors duration-200">
                          <Moon className="h-3 w-3 text-indigo-400" />
                          <span className={newRow.last_call_date ? "text-indigo-200" : "text-indigo-300/70"}>
                            {newRow.last_call_date ? format(parseISO(newRow.last_call_date), "dd/MM/yyyy") : "Last call..."}
                          </span>
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
                  <ResizableTableCell className="border border-border p-0">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full h-9 px-3 text-left text-sm flex items-center gap-2 hover:bg-indigo-500/20 rounded transition-colors duration-200">
                      <Sun className="h-3 w-3 text-yellow-400" />
                      <span className="text-yellow-200">
                        {format(parseISO(newRow.next_call_date), "dd/MM/yyyy")}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={parseISO(newRow.next_call_date)}
                      onSelect={(date) => date && setNewRow({ ...newRow, next_call_date: format(date, "yyyy-MM-dd") })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </ResizableTableCell>
              <ResizableTableCell className="border border-border p-0">
                <Input
                  type="time"
                  value={newRow.next_call_time}
                  onChange={(e) => setNewRow({ ...newRow, next_call_time: e.target.value })}
                  className="border-0 rounded-none h-9 text-sm bg-transparent focus-visible:ring-0 focus-visible:ring-inset text-yellow-200"
                />
              </ResizableTableCell>
              <ResizableTableCell className="border border-border p-0">
                <Input
                  value={newRow.remark}
                      onChange={(e) => setNewRow({ ...newRow, remark: e.target.value })}
                      className="border-0 rounded-none h-9 text-sm bg-transparent focus-visible:ring-0 focus-visible:ring-inset placeholder-indigo-300/50"
                      placeholder="Remark"
                    />
                  </ResizableTableCell>
                  <ResizableTableCell className="border border-border p-1 text-center">
                    <Button
                      size="sm"
                      onClick={handleAddRow}
                      disabled={addMutation.isPending}
                      className="h-7 px-3 text-xs bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-0 transition-all duration-300 shadow-lg hover:shadow-indigo-500/20"
                    >
                      {addMutation.isPending ? (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-white animate-bounce"></div>
                          <span>Adding...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          <span>Add Customer</span>
                        </div>
                      )}
                    </Button>
                  </ResizableTableCell>
                </ResizableTableRow>
              </>
            )}
          </ResizableTableBody>
        </ResizableTable>
      </div>
    </div>
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
}) {
  const [date, setDate] = useState<Date | undefined>(
    customer.next_call_date ? parseISO(customer.next_call_date) : undefined
  );
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
    onCellChange(customer.id, "color", color === null ? "" : color);
  };

  return (
    <ResizableTableRow 
      className={`transition-all duration-300 group relative overflow-hidden ${
        isSelected ? "bg-indigo-500/20 border-l-4 border-indigo-500" : ""
      } ${
        isDragging ? "opacity-70 scale-98 shadow-xl ring-2 ring-indigo-500/50" : ""
      } ${
        dropTarget === customer.id ? "border-2 border-dashed border-indigo-400 bg-indigo-500/10" : ""
      }`}
      onDragOver={onDragOver}
      onDragEnter={(e) => onDragEnter(e, customer.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, customer.id)}
      onDragEnd={onDragEnd}
    >
      {/* Priority indicator */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
        getCustomerPriority(customer) === 'high' ? 'bg-red-500' : 
        getCustomerPriority(customer) === 'medium' ? 'bg-yellow-500' : 
        getCustomerPriority(customer) === 'low' ? 'bg-gray-500' : 'bg-indigo-500'
      }`}></div>
      <ResizableTableCell 
        className="border border-border px-3 py-1 text-xs text-muted-foreground text-center cursor-move"
        title="Drag to reorder"
        draggable
        onDragStart={(e) => onDragStart(e, customer.id)}
      >
        {index}
      </ResizableTableCell>
      <ResizableTableCell className="border border-border p-0 relative">
        <div className="flex items-center h-8 pl-2">
          {/* Color marker with enhanced styling */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="w-4 h-4 rounded-full border-2 border-white/30 flex-shrink-0 shadow-md hover:scale-110 transition-transform duration-200" 
                style={{ backgroundColor: localColor && localColor !== "" ? localColor : '#f1f5f9' }} />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2 bg-card/90 backdrop-blur-sm border-indigo-500/30" align="start">
              <div className="grid grid-cols-4 gap-1">
                {[null, 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'].map((color) => (
                  <Button
                    key={color || 'none'}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-indigo-500/20 transition-colors duration-200"
                    onClick={() => handleColorChange(color as any)}
                  >
                    <div 
                      className={`w-4 h-4 rounded-full border-2 ${color ? 'border-white/30' : 'border-dashed border-white/50'}`} 
                      style={{ backgroundColor: color || 'transparent' }} 
                    />
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Customer name with enhanced styling */}
          <Input
            defaultValue={customer.customer_name}
            onBlur={(e) => onCellChange(customer.id, "customer_name", e.target.value)}
            className="border-0 rounded-none h-8 text-sm focus-visible:ring-0 focus-visible:ring-inset flex-grow bg-transparent placeholder-indigo-300/50"
            placeholder="Customer name..."
          />
          
          {/* Priority badge */}
          <div className={`mr-2 px-1.5 py-0.5 rounded-full text-xs font-medium ${
            getCustomerPriority(customer) === 'high' ? 'bg-red-500/20 text-red-300' : 
            getCustomerPriority(customer) === 'medium' ? 'bg-yellow-500/20 text-yellow-300' : 
            getCustomerPriority(customer) === 'low' ? 'bg-gray-500/20 text-gray-300' : 'bg-indigo-500/20 text-indigo-300'
          }`}>
            {getCustomerPriority(customer) === 'high' ? 'Urgent' : 
             getCustomerPriority(customer) === 'medium' ? 'Soon' : 
             getCustomerPriority(customer) === 'low' ? 'Later' : 'Active'}
          </div>
        </div>
      </ResizableTableCell>
      <ResizableTableCell className="border border-border p-0">
        <Input
          defaultValue={customer.company_name}
          onBlur={(e) => onCellChange(customer.id, "company_name", e.target.value)}
          className="border-0 rounded-none h-8 text-sm focus-visible:ring-1 focus-visible:ring-inset"
        />
      </ResizableTableCell>
      <ResizableTableCell className="border border-border p-0">
        <Input
          defaultValue={customer.phone_number}
          onBlur={(e) => onCellChange(customer.id, "phone_number", e.target.value)}
          className="border-0 rounded-none h-8 text-sm focus-visible:ring-1 focus-visible:ring-inset"
        />
      </ResizableTableCell>
      <ResizableTableCell className="border border-border p-0">
        <Popover>
          <PopoverTrigger asChild>
            <button className="w-full h-8 px-3 text-left text-sm flex items-center gap-2 hover:bg-indigo-500/20 rounded transition-colors duration-200">
              <Moon className="h-3 w-3 text-indigo-400" />
              <span className={lastCallDate ? "text-indigo-200" : "text-indigo-300/70"}>
                {lastCallDate ? format(lastCallDate, "dd/MM/yyyy") : "Last call..."}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={lastCallDate}
              onSelect={handleLastCallDateChange}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </ResizableTableCell>
      <ResizableTableCell className="border border-border p-0">
        <Popover>
          <PopoverTrigger asChild>
            <button className="w-full h-8 px-3 text-left text-sm flex items-center gap-2 hover:bg-indigo-500/20 rounded transition-colors duration-200">
              <Sun className="h-3 w-3 text-yellow-400" />
              <span className={date ? "text-yellow-200" : "text-yellow-300/70"}>
                {date ? format(date, "dd/MM/yyyy") : "Next call..."}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateChange}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </ResizableTableCell>
      <ResizableTableCell className="border border-border p-0">
        <Input
          type="time"
          defaultValue={customer.next_call_time || ""}
          onBlur={(e) => onCellChange(customer.id, "next_call_time", e.target.value)}
          className="border-0 rounded-none h-8 text-sm focus-visible:ring-1 focus-visible:ring-inset"
        />
      </ResizableTableCell>
      <ResizableTableCell className="border border-border p-0">
        <Input
          defaultValue={customer.remark || ""}
          onBlur={(e) => onCellChange(customer.id, "remark", e.target.value)}
          className="border-0 rounded-none h-8 text-sm focus-visible:ring-1 focus-visible:ring-inset"
        />
      </ResizableTableCell>
      <ResizableTableCell className="border border-border p-1 text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const phoneNumber = customer.phone_number.replace(/[^0-9]/g, '');
            const whatsappUrl = `https://wa.me/${phoneNumber}`;
            window.open(whatsappUrl, '_blank');
          }}
          className="h-6 w-6 p-0 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20 transition-all duration-300 rounded-full"
        >
          <MessageCircle className="h-3 w-3 animate-pulse hover:animate-none" />
        </Button>
      </ResizableTableCell>
      {showCheckboxes && (
        <ResizableTableCell className="border border-border px-1 py-1 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 hover:bg-indigo-500/20 rounded transition-all duration-300"
            onClick={() => onToggleSelect(customer.id)}
          >
            {isSelected ? (
              <CheckSquare className="h-4 w-4 text-indigo-400 animate-pulse" />
            ) : (
              <Square className="h-4 w-4 text-indigo-300/70" />
            )}
          </Button>
        </ResizableTableCell>
      )}
    </ResizableTableRow>
  );
}

const MemoizedSpreadsheetRow = memo(SpreadsheetRow);

export default Index;
