import { useState, useMemo, useRef, useEffect, memo, Fragment } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trash2, CalendarIcon, MessageCircle, GripVertical, Square, CheckSquare, Circle } from "lucide-react";
import { format, isToday, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCustomers, addCustomer, updateCustomer, deleteCustomer, Customer, bulkDeleteCustomers, reorderCustomers } from "@/lib/api";

import { useAuth } from "@/context/AuthContext";
import { LogOut } from "lucide-react";
import { BulkImportDialog } from "@/components/BulkImportDialog";
import { ResizableTable, ResizableTableHeader, ResizableTableBody, ResizableTableHead, ResizableTableRow, ResizableTableCell } from "@/components/ui/resizable-table";

// Define color options
const COLOR_OPTIONS = [
  { name: "Gray", value: "gray", classes: "bg-gray-400" },
  { name: "Red", value: "red", classes: "bg-red-500" },
  { name: "Orange", value: "orange", classes: "bg-orange-500" },
  { name: "Yellow", value: "yellow", classes: "bg-yellow-500" },
  { name: "Green", value: "green", classes: "bg-green-500" },
  { name: "Blue", value: "blue", classes: "bg-blue-500" },
  { name: "Purple", value: "purple", classes: "bg-purple-500" },
];

const Index = () => {
  console.log("Index component rendering");
  const [viewMode, setViewMode] = useState<"date" | "all">("date");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logout, user } = useAuth();
  
  // Bulk selection state
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  // Color picker state
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);

  // New row state
  const [newRow, setNewRow] = useState({
    customer_name: "",
    company_name: "",
    phone_number: "",
    next_call_date: format(new Date(), "yyyy-MM-dd"),
    next_call_time: "",
    remark: "",
    color: "gray",
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
        color: "gray",
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

  // Handle color change
  const handleColorChange = (customerId: string, color: string) => {
    updateMutation.mutate({ id: customerId, field: "color", value: color });
    setColorPickerOpen(null);
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
      // Reorder the customers
      const newOrder = [...displayedCustomers];
      const draggedIndex = newOrder.findIndex(c => c.id === draggedId);
      const targetIndex = newOrder.findIndex(c => c.id === targetId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        // Remove the dragged item
        const [removed] = newOrder.splice(draggedIndex, 1);
        // Insert it at the new position
        newOrder.splice(targetIndex, 0, removed);
        
        // Get the IDs in the new order
        const reorderedIds = newOrder.map(c => c.id);
        reorderMutation.mutate(reorderedIds);
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
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-xl font-bold text-red-600">Error loading customers</h2>
        <p className="text-gray-600">{error.message}</p>
        {error.response && (
          <p className="text-gray-600 mt-2">Status: {error.response.status} - {JSON.stringify(error.response.data)}</p>
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
    addMutation.mutate(newRow);
  };

  const handleCellChange = (id: string, field: string, value: string) => {
    updateMutation.mutate({ id, field, value });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-foreground">Calling CRM</h1>
            <span className="text-sm text-muted-foreground">Welcome, {user?.username}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {format(new Date(), "EEEE, MMMM do, yyyy")}
            </span>
            <BulkImportDialog onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ["customers"] })} />
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Sheet Tabs */}
      <div className="bg-card border-b border-border px-4 py-2 flex items-center gap-4">
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

        <div className="h-6 w-px bg-border" />

        <Button
          variant={viewMode === "all" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setViewMode("all")}
        >
          All Customers ({customers.length})
        </Button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedCustomers.size > 0 && (
        <div className="bg-primary/10 border-b border-border px-4 py-2 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-primary">
              {selectedCustomers.size} selected
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={selectAllCustomers}
              className="h-7 px-2 text-xs"
            >
              {selectedCustomers.size === displayedCustomers.length ? "Deselect All" : "Select All"}
            </Button>
          </div>
          <div className="h-4 w-px bg-border" />
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleBulkDelete}
            disabled={bulkDeleteMutation.isPending}
            className="h-7 px-2 text-xs"
          >
            {bulkDeleteMutation.isPending ? "Deleting..." : "Delete Selected"}
          </Button>
        </div>
      )}

      {/* Spreadsheet */}
      <div className="flex-1 overflow-auto">
        <ResizableTable className="w-full border-collapse">
          <ResizableTableHeader className="bg-muted sticky top-0 z-10">
            <ResizableTableRow>
              <ResizableTableHead 
                className="border border-border px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-10"
                resizable={false}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                  onClick={selectAllCustomers}
                >
                  {selectedCustomers.size === displayedCustomers.length && displayedCustomers.length > 0 ? (
                    <CheckSquare className="h-3 w-3" />
                  ) : (
                    <Square className="h-3 w-3" />
                  )}
                </Button>
              </ResizableTableHead>
              <ResizableTableHead 
                className="border border-border px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-8"
                resizable={false}
              >
                {/* Drag handle column header */}
              </ResizableTableHead>
              <ResizableTableHead className="border border-border px-3 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[150px]">
                Customer Name
              </ResizableTableHead>
              <ResizableTableHead className="border border-border px-3 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[150px]">
                Company Name
              </ResizableTableHead>
              <ResizableTableHead className="border border-border px-3 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[120px]">
                Phone No.
              </ResizableTableHead>
              <ResizableTableHead className="border border-border px-3 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[130px]">
                Next Call Date
              </ResizableTableHead>
              <ResizableTableHead className="border border-border px-3 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[100px]">
                Time
              </ResizableTableHead>
              <ResizableTableHead className="border border-border px-3 py-2 text-left text-xs font-semibold text-muted-foreground min-w-[200px]">
                Remark
              </ResizableTableHead>
              <ResizableTableHead 
                className="border border-border px-3 py-2 text-center text-xs font-semibold text-muted-foreground w-12"
                resizable={false}
              >
                WP
              </ResizableTableHead>
              <ResizableTableHead 
                className="border border-border px-3 py-2 text-center text-xs font-semibold text-muted-foreground w-12"
                resizable={false}
              >
                
              </ResizableTableHead>
            </ResizableTableRow>
          </ResizableTableHeader>
          <ResizableTableBody>
            {isLoading ? (
              <ResizableTableRow>
                <ResizableTableCell colSpan={10} className="border border-border px-3 py-8 text-center text-muted-foreground">
                  Loading...
                </ResizableTableCell>
              </ResizableTableRow>
            ) : (
              <>
                {displayedCustomers.length === 0 && (
                  <ResizableTableRow>
                    <ResizableTableCell colSpan={10} className="border border-border px-3 py-4 text-center text-muted-foreground text-sm">
                      {viewMode === "date" 
                        ? `No calls scheduled for ${format(selectedDate, "MMM do")}` 
                        : "No customers yet. Add one below!"}
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
                      colorPickerOpen={colorPickerOpen}
                      setColorPickerOpen={setColorPickerOpen}
                      onToggleSelect={toggleCustomerSelection}
                      onCellChange={handleCellChange}
                      onColorChange={handleColorChange}
                      onDelete={() => deleteMutation.mutate(customer.id)}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
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
                <ResizableTableRow className="bg-primary/5">
                  <ResizableTableCell className="border border-border px-3 py-1 text-xs text-primary font-medium text-center">
                    NEW
                  </ResizableTableCell>
                  <ResizableTableCell className="border border-border p-0">
                    {/* Empty cell for drag handle column */}
                  </ResizableTableCell>
                  <ResizableTableCell className="border border-border p-0">
                    <div className="flex items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 rounded-full"
                            style={{ backgroundColor: COLOR_OPTIONS.find(c => c.value === newRow.color)?.classes.split(' ')[0].replace('bg-', '') }}
                          >
                            <Circle className="h-3 w-3 text-white" fill="white" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2" align="start">
                          <div className="grid grid-cols-4 gap-1">
                            {COLOR_OPTIONS.map((color) => (
                              <Button
                                key={color.value}
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 rounded-full"
                                onClick={() => setNewRow({ ...newRow, color: color.value })}
                              >
                                <div className={`h-4 w-4 rounded-full ${color.classes}`} />
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Input
                        value={newRow.customer_name}
                        onChange={(e) => setNewRow({ ...newRow, customer_name: e.target.value })}
                        className="border-0 rounded-none h-9 text-sm bg-transparent focus-visible:ring-1 focus-visible:ring-inset flex-1"
                        placeholder="Enter customer name..."
                      />
                    </div>
                  </ResizableTableCell>
                  <ResizableTableCell className="border border-border p-0">
                    <Input
                      value={newRow.company_name}
                      onChange={(e) => setNewRow({ ...newRow, company_name: e.target.value })}
                      className="border-0 rounded-none h-9 text-sm bg-transparent focus-visible:ring-1 focus-visible:ring-inset"
                      placeholder="Enter company..."
                    />
                  </ResizableTableCell>
                  <ResizableTableCell className="border border-border p-0">
                    <Input
                      value={newRow.phone_number}
                      onChange={(e) => setNewRow({ ...newRow, phone_number: e.target.value })}
                      className="border-0 rounded-none h-9 text-sm bg-transparent focus-visible:ring-1 focus-visible:ring-inset"
                      placeholder="Enter phone..."
                    />
                  </ResizableTableCell>
                  <ResizableTableCell className="border border-border p-0">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-full h-9 px-3 text-left text-sm flex items-center gap-2 hover:bg-muted/50">
                      <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                      {format(parseISO(newRow.next_call_date), "dd/MM/yyyy")}
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
                  className="border-0 rounded-none h-9 text-sm bg-transparent focus-visible:ring-1 focus-visible:ring-inset"
                />
              </ResizableTableCell>
              <ResizableTableCell className="border border-border p-0">
                <Input
                  value={newRow.remark}
                      onChange={(e) => setNewRow({ ...newRow, remark: e.target.value })}
                      className="border-0 rounded-none h-9 text-sm bg-transparent focus-visible:ring-1 focus-visible:ring-inset"
                      placeholder="Enter remark..."
                    />
                  </ResizableTableCell>
                  <ResizableTableCell className="border border-border p-1 text-center">
                    {/* WhatsApp button for new row (empty) */}
                  </ResizableTableCell>
                  <ResizableTableCell className="border border-border p-1 text-center">
                    <Button
                      size="sm"
                      onClick={handleAddRow}
                      disabled={addMutation.isPending}
                      className="h-7 px-3 text-xs"
                    >
                      {addMutation.isPending ? "..." : "Add"}
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
  colorPickerOpen,
  setColorPickerOpen,
  onToggleSelect,
  onCellChange,
  onColorChange,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onDragEnd,
}: {
  customer: Customer;
  index: number;
  isSelected: boolean;
  isDragging: boolean;
  dropTarget: string | null;
  colorPickerOpen: string | null;
  setColorPickerOpen: (id: string | null) => void;
  onToggleSelect: (id: string) => void;
  onCellChange: (id: string, field: string, value: string) => void;
  onColorChange: (id: string, color: string) => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent, targetId: string) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
  onDragEnd: () => void;
}) {
  const [date, setDate] = useState<Date | undefined>(
    customer.next_call_date ? parseISO(customer.next_call_date) : undefined
  );

  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
      onCellChange(customer.id, "next_call_date", format(newDate, "yyyy-MM-dd"));
    }
  };

  // Get color classes
  const colorClass = COLOR_OPTIONS.find(c => c.value === (customer.color || "gray"))?.classes || "bg-gray-400";

  return (
    <ResizableTableRow 
      className={`hover:bg-muted/50 transition-all duration-200 ${
        isSelected ? "bg-primary/10" : ""
      } ${
        isDragging ? "opacity-50 scale-95 shadow-lg" : ""
      } ${
        dropTarget === customer.id ? "border-2 border-dashed border-primary" : ""
      }`}
      draggable
      onDragStart={(e) => onDragStart(e, customer.id)}
      onDragOver={onDragOver}
      onDragEnter={(e) => onDragEnter(e, customer.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, customer.id)}
      onDragEnd={onDragEnd}
    >
      <ResizableTableCell className="border border-border px-3 py-1 text-xs text-muted-foreground text-center">
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0"
          onClick={() => onToggleSelect(customer.id)}
        >
          {isSelected ? (
            <CheckSquare className="h-3 w-3 text-primary" />
          ) : (
            <Square className="h-3 w-3" />
          )}
        </Button>
      </ResizableTableCell>
      <ResizableTableCell 
        className="border border-border px-1 py-1 text-center cursor-move group"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </ResizableTableCell>
      <ResizableTableCell className="border border-border p-0">
        <div className="flex items-center gap-2">
          <Popover open={colorPickerOpen === customer.id} onOpenChange={(open) => setColorPickerOpen(open ? customer.id : null)}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 rounded-full"
              >
                <div className={`h-4 w-4 rounded-full ${colorClass}`} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="grid grid-cols-4 gap-1">
                {COLOR_OPTIONS.map((color) => (
                  <Button
                    key={color.value}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 rounded-full"
                    onClick={() => onColorChange(customer.id, color.value)}
                  >
                    <div className={`h-4 w-4 rounded-full ${color.classes}`} />
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Input
            defaultValue={customer.customer_name}
            onBlur={(e) => onCellChange(customer.id, "customer_name", e.target.value)}
            className="border-0 rounded-none h-8 text-sm focus-visible:ring-1 focus-visible:ring-inset flex-1"
          />
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
            <button className="w-full h-8 px-3 text-left text-sm flex items-center gap-2 hover:bg-muted/50">
              <CalendarIcon className="h-3 w-3 text-muted-foreground" />
              {date ? format(date, "dd/MM/yyyy") : "Pick date"}
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
          className="h-6 w-6 p-0 text-muted-foreground hover:text-green-600"
        >
          <MessageCircle className="h-3 w-3" />
        </Button>
      </ResizableTableCell>
      <ResizableTableCell className="border border-border p-1 text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </ResizableTableCell>
    </ResizableTableRow>
  );
}

const MemoizedSpreadsheetRow = memo(SpreadsheetRow);

export default Index;