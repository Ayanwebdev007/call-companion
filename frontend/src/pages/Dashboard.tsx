import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchSpreadsheets, fetchSharedSpreadsheets, createSpreadsheet, deleteSpreadsheet, shareSpreadsheet, Spreadsheet } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { LogOut, Plus, Trash2, Share2, User, Users, FileSpreadsheet, ArrowLeft } from "lucide-react";

const Dashboard = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState("");
  const [shareUsername, setShareUsername] = useState("");
  const [sharePermission, setSharePermission] = useState<"read-only" | "read-write">("read-only");
  const [newSpreadsheetName, setNewSpreadsheetName] = useState("");
  const [newSpreadsheetDescription, setNewSpreadsheetDescription] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  // Fetch all spreadsheets (owned and shared)
  const { data: spreadsheets = [], isLoading, error } = useQuery({
    queryKey: ["spreadsheets"],
    queryFn: fetchSpreadsheets,
    enabled: !!user, // Only fetch when user is available
  });
  


  // Create spreadsheet mutation
  const createMutation = useMutation({
    mutationFn: createSpreadsheet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spreadsheets"] });
      toast({ title: "Spreadsheet created successfully!" });
      setIsCreateDialogOpen(false);
      setNewSpreadsheetName("");
      setNewSpreadsheetDescription("");
    },
    onError: (error: unknown) => {
      let errorMessage = "Failed to create spreadsheet";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      toast({ title: "Error creating spreadsheet", description: errorMessage, variant: "destructive" });
    },
  });

  // Delete spreadsheet mutation
  const deleteMutation = useMutation({
    mutationFn: deleteSpreadsheet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spreadsheets"] });
      toast({ title: "Spreadsheet deleted successfully!" });
    },
    onError: (error: unknown) => {
      let errorMessage = "Failed to delete spreadsheet";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      toast({ title: "Error deleting spreadsheet", description: errorMessage, variant: "destructive" });
    },
  });

  const handleCreateSpreadsheet = () => {
    if (!newSpreadsheetName.trim()) {
      toast({ title: "Please enter a spreadsheet name", variant: "destructive" });
      return;
    }
    
    createMutation.mutate({
      name: newSpreadsheetName,
      description: newSpreadsheetDescription
    });
  };

  const handleDeleteSpreadsheet = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the spreadsheet "${name}"? This will permanently delete all customer data in this spreadsheet.`)) {
      deleteMutation.mutate(id);
    }
  };

  // Share spreadsheet mutation
  const shareMutation = useMutation({
    mutationFn: ({ spreadsheetId, username, permission }: { spreadsheetId: string; username: string; permission: "read-only" | "read-write" }) => 
      shareSpreadsheet(spreadsheetId, username, permission),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spreadsheets"] });
      toast({ title: "Spreadsheet shared successfully!" });
      setIsShareDialogOpen(false);
      setShareUsername("");
      setSharePermission("read-only");
    },
    onError: (error: unknown) => {
      let errorMessage = "Failed to share spreadsheet";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      toast({ title: "Error sharing spreadsheet", description: errorMessage, variant: "destructive" });
    },
  });

  const handleShareSpreadsheet = (spreadsheetId: string) => {
    setSelectedSpreadsheetId(spreadsheetId);
    setIsShareDialogOpen(true);
  };

  const handleConfirmShare = () => {
    if (!shareUsername.trim()) {
      toast({ title: "Please enter a username", variant: "destructive" });
      return;
    }
    
    shareMutation.mutate({ 
      spreadsheetId: selectedSpreadsheetId, 
      username: shareUsername, 
      permission: sharePermission 
    });
  };

  const handleOpenSpreadsheet = (id: string) => {
    navigate(`/spreadsheet/${id}`);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-xl font-bold text-red-600">Error loading spreadsheets</h2>
        <p className="text-gray-600">{(error as Error).message}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/10">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md px-4 py-3 shadow-sm">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="bg-primary/10 p-2 rounded-xl">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Calling CRM</h1>
              <p className="text-xs text-muted-foreground">Manage your customer outreach</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 mr-2 px-3 py-1.5 bg-secondary/50 rounded-full border border-border/50">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{user?.username}</span>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                  <Plus className="h-4 w-4 mr-2" />
                  New Spreadsheet
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Spreadsheet</DialogTitle>
                  <DialogDescription>
                    Enter a name and optional description for your new spreadsheet.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-1">
                      Name *
                    </label>
                    <Input
                      id="name"
                      value={newSpreadsheetName}
                      onChange={(e) => setNewSpreadsheetName(e.target.value)}
                      placeholder="My Customers"
                    />
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium mb-1">
                      Description
                    </label>
                    <Input
                      id="description"
                      value={newSpreadsheetDescription}
                      onChange={(e) => setNewSpreadsheetDescription(e.target.value)}
                      placeholder="Description (optional)"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    disabled={createMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateSpreadsheet}
                    disabled={createMutation.isPending || !newSpreadsheetName.trim()}
                  >
                    {createMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share Spreadsheet</DialogTitle>
                  <DialogDescription>
                    Share this spreadsheet with another user by entering their username.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium mb-1">
                      Username *
                    </label>
                    <Input
                      id="username"
                      value={shareUsername}
                      onChange={(e) => setShareUsername(e.target.value)}
                      placeholder="Enter username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Permission
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="permission"
                          value="read-only"
                          checked={sharePermission === "read-only"}
                          onChange={() => setSharePermission("read-only")}
                          className="mr-2"
                        />
                        Read Only
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="permission"
                          value="read-write"
                          checked={sharePermission === "read-write"}
                          onChange={() => setSharePermission("read-write")}
                          className="mr-2"
                        />
                        Read & Write
                      </label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsShareDialogOpen(false)}
                    disabled={shareMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmShare}
                    disabled={shareMutation.isPending || !shareUsername.trim()}
                  >
                    {shareMutation.isPending ? "Sharing..." : "Share"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="icon" onClick={logout} className="text-muted-foreground hover:text-destructive transition-colors">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground mt-1">
              You have {spreadsheets.length} {spreadsheets.length === 1 ? 'spreadsheet' : 'spreadsheets'}
            </p>
          </div>
          
          <div className="flex gap-2">
            {/* Filter/Search placeholders could go here */}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="h-48">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : spreadsheets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] border-2 border-dashed border-border/50 rounded-xl bg-card/50">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No spreadsheets yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm text-center">
              Create your first spreadsheet to start organizing your customer data and calls.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} size="lg" className="shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4 mr-2" />
              Create Spreadsheet
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {spreadsheets.map((spreadsheet: Spreadsheet) => (
              <Card 
                key={spreadsheet.id} 
                className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm cursor-pointer"
                onClick={() => handleOpenSpreadsheet(spreadsheet.id)}
              >
                <div className={`absolute top-0 left-0 w-1 h-full ${spreadsheet.is_shared ? 'bg-blue-500' : 'bg-primary'} opacity-0 group-hover:opacity-100 transition-opacity`} />
                
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${spreadsheet.is_shared ? 'bg-blue-500/10 text-blue-600' : 'bg-primary/10 text-primary'}`}>
                        {spreadsheet.is_shared ? <Users className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}
                      </div>
                      <div className="space-y-1">
                        <CardTitle className="text-base font-semibold leading-none truncate max-w-[150px]">{spreadsheet.name}</CardTitle>
                        {spreadsheet.is_shared && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>by {spreadsheet.owner}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!spreadsheet.is_shared && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-background/80"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareSpreadsheet(spreadsheet.id);
                          }}
                        >
                          <Share2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                      {!spreadsheet.is_shared && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSpreadsheet(spreadsheet.id, spreadsheet.name);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  {spreadsheet.description ? (
                    <CardDescription className="line-clamp-2 text-xs">
                      {spreadsheet.description}
                    </CardDescription>
                  ) : (
                     <p className="text-xs text-muted-foreground italic">No description</p>
                  )}
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    {spreadsheet.is_shared && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                        {spreadsheet.permission_level === 'read-write' ? 'Can edit' : 'View only'}
                      </span>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t border-border/50 bg-muted/20">
                   <div className="w-full flex justify-between items-center text-xs text-muted-foreground">
                      <span>{new Date(spreadsheet.created_at).toLocaleDateString()}</span>
                      <span className="group-hover:text-primary transition-colors">Open &rarr;</span>
                   </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
