import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchSpreadsheets, fetchSharedSpreadsheets, createSpreadsheet, deleteSpreadsheet, shareSpreadsheet, Spreadsheet } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { LogOut, Plus, Trash2, Share2, User, Users } from "lucide-react";

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

  // Fetch spreadsheets (owned and shared)
  const { data: ownedSpreadsheets = [], isLoading: isLoadingOwned, error: ownedError } = useQuery({
    queryKey: ["ownedSpreadsheets"],
    queryFn: fetchSpreadsheets,
    enabled: !!user, // Only fetch when user is available
  });

  const { data: sharedSpreadsheets = [], isLoading: isLoadingShared, error: sharedError } = useQuery({
    queryKey: ["sharedSpreadsheets"],
    queryFn: async () => {
      console.log('Fetching shared spreadsheets...');
      try {
        const result = await fetchSharedSpreadsheets();
        console.log('Shared spreadsheets result:', result);
        return result;
      } catch (error) {
        console.error('Error fetching shared spreadsheets:', error);
        throw error;
      }
    },
    enabled: !!user, // Only fetch when user is available
  });

  // Combine owned and shared spreadsheets
  const spreadsheets = [...ownedSpreadsheets, ...sharedSpreadsheets];
  const isLoading = isLoadingOwned || isLoadingShared;
  const error = ownedError || sharedError;
  
  // Log errors for debugging
  if (ownedError) {
    console.error('Owned spreadsheets error:', ownedError);
  }
  if (sharedError) {
    console.error('Shared spreadsheets error:', sharedError);
  }

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-foreground">Calling CRM</h1>
            <span className="text-sm text-muted-foreground">Welcome, {user?.username}</span>
          </div>
          <div className="flex items-center gap-4">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
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
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Your Spreadsheets</h2>
          <div className="flex gap-2">
            <span className="text-sm text-muted-foreground">
              {spreadsheets.length} {spreadsheets.length === 1 ? 'spreadsheet' : 'spreadsheets'}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <p>Loading spreadsheets...</p>
          </div>
        ) : spreadsheets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground mb-4">No spreadsheets yet. Create your first one!</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Spreadsheet
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {spreadsheets.map((spreadsheet: Spreadsheet) => (
              <Card 
                key={spreadsheet.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleOpenSpreadsheet(spreadsheet.id)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg truncate">{spreadsheet.name}</CardTitle>
                      {spreadsheet.is_shared && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{spreadsheet.owner}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {!spreadsheet.is_shared && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareSpreadsheet(spreadsheet.id);
                          }}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      )}
                      {!spreadsheet.is_shared && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
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
                  {spreadsheet.description && (
                    <CardDescription className="truncate">
                      {spreadsheet.description}
                    </CardDescription>
                  )}
                  {spreadsheet.is_shared && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {spreadsheet.permission_level === 'read-write' ? 'Can edit' : 'View only'}
                      </span>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    Created: {new Date(spreadsheet.created_at).toLocaleDateString()}
                  </div>
                  {spreadsheet.is_shared && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Shared by {spreadsheet.owner}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenSpreadsheet(spreadsheet.id);
                    }}
                  >
                    Open
                  </Button>
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