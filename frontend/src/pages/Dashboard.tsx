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
import { LogOut, Plus, Trash2, Share2, User, Users, FileSpreadsheet, ArrowLeft, Download } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import GoogleSheetsDialog from "@/components/GoogleSheetsDialog";

const Dashboard = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState("");
  const [shareUsername, setShareUsername] = useState("");
  const [sharePermission, setSharePermission] = useState<"read-only" | "read-write">("read-only");
const [newSpreadsheetName, setNewSpreadsheetName] = useState("");
  const [newSpreadsheetDescription, setNewSpreadsheetDescription] = useState("");
  const [isGoogleSheetsDialogOpen, setIsGoogleSheetsDialogOpen] = useState(false);
  const [selectedSpreadsheetForImport, setSelectedSpreadsheetForImport] = useState("");
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
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-soft-light pointer-events-none"></div>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 dark:bg-black/20 backdrop-blur-xl px-4 py-3 shadow-lg transition-all duration-300">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="hover:bg-accent/10 dark:hover:bg-white/10 text-foreground/80 hover:text-foreground dark:text-white/80 dark:hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="bg-gradient-to-br from-primary to-blue-600 p-2 rounded-xl shadow-lg shadow-primary/20">
              <FileSpreadsheet className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground dark:text-white">Calling CRM</h1>
              <p className="text-xs text-muted-foreground">Manage your customer outreach</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="hidden md:flex items-center gap-2 mr-2 px-3 py-1.5 bg-secondary/50 dark:bg-white/5 rounded-full border border-border/50 dark:border-white/10 backdrop-blur-md">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground/90 dark:text-white/90">{user?.username}</span>
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 border-0 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  New Spreadsheet
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card dark:bg-card border-border/50 dark:border-white/10 shadow-2xl backdrop-blur-3xl">
                <DialogHeader>
                  <DialogTitle className="text-xl text-foreground">Create New Spreadsheet</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Enter a name and optional description for your new spreadsheet.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-1.5 text-foreground/80">
                      Name *
                    </label>
                    <Input
                      id="name"
                      value={newSpreadsheetName}
                      onChange={(e) => setNewSpreadsheetName(e.target.value)}
                      placeholder="My Customers"
                      className="bg-secondary/50 dark:bg-secondary/50 border-input dark:border-white/10 focus-visible:ring-primary/50 text-foreground"
                    />
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium mb-1.5 text-foreground/80">
                      Description
                    </label>
                    <Input
                      id="description"
                      value={newSpreadsheetDescription}
                      onChange={(e) => setNewSpreadsheetDescription(e.target.value)}
                      placeholder="Description (optional)"
                      className="bg-secondary/50 dark:bg-secondary/50 border-input dark:border-white/10 focus-visible:ring-primary/50 text-foreground"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setIsCreateDialogOpen(false)}
                    disabled={createMutation.isPending}
                    className="hover:bg-accent/10 dark:hover:bg-white/5 text-foreground"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateSpreadsheet}
                    disabled={createMutation.isPending || !newSpreadsheetName.trim()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {createMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
              <DialogContent className="bg-card border-white/10 shadow-2xl backdrop-blur-3xl">
                <DialogHeader>
                  <DialogTitle>Share Spreadsheet</DialogTitle>
                  <DialogDescription>
                    Share this spreadsheet with another user by entering their username.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium mb-1.5 text-foreground/80">
                      Username *
                    </label>
                    <Input
                      id="username"
                      value={shareUsername}
                      onChange={(e) => setShareUsername(e.target.value)}
                      placeholder="Enter username"
                      className="bg-secondary/50 border-white/10 focus-visible:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-foreground/80">
                      Permission
                    </label>
                    <div className="flex gap-4 p-1 bg-secondary/50 rounded-lg border border-white/5">
                      <label className="flex items-center flex-1 p-2 rounded-md hover:bg-white/5 cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name="permission"
                          value="read-only"
                          checked={sharePermission === "read-only"}
                          onChange={() => setSharePermission("read-only")}
                          className="mr-2 text-primary"
                        />
                        <span className="text-sm">Read Only</span>
                      </label>
                      <label className="flex items-center flex-1 p-2 rounded-md hover:bg-white/5 cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name="permission"
                          value="read-write"
                          checked={sharePermission === "read-write"}
                          onChange={() => setSharePermission("read-write")}
                          className="mr-2 text-primary"
                        />
                        <span className="text-sm">Read & Write</span>
                      </label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setIsShareDialogOpen(false)}
                    disabled={shareMutation.isPending}
                    className="hover:bg-white/5"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmShare}
                    disabled={shareMutation.isPending || !shareUsername.trim()}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {shareMutation.isPending ? "Sharing..." : "Share"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="icon" onClick={logout} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 animate-fade-in">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground dark:text-white">Dashboard</h2>
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
              <Card key={i} className="h-48 bg-card/50 dark:bg-card/50 border-border/10 dark:border-white/5">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2 bg-muted dark:bg-white/10" />
                  <Skeleton className="h-4 w-1/2 bg-muted dark:bg-white/5" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full bg-muted dark:bg-white/5" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : spreadsheets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] border-2 border-dashed border-border/50 dark:border-white/10 rounded-3xl bg-card/40 dark:bg-card/20 backdrop-blur-sm animate-fade-in-up">
            <div className="bg-primary/10 p-6 rounded-full mb-6 ring-1 ring-primary/20 shadow-xl shadow-primary/5">
              <FileSpreadsheet className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-foreground dark:text-white">No spreadsheets yet</h3>
            <p className="text-muted-foreground mb-8 max-w-sm text-center">
              Create your first spreadsheet to start organizing your customer data and calls.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} size="lg" className="shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-white px-8 py-6 h-auto text-lg rounded-xl transition-all hover:scale-105 active:scale-95">
              <Plus className="h-5 w-5 mr-2" />
              Create Spreadsheet
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in-up">
            {spreadsheets.map((spreadsheet: Spreadsheet) => (
              <Card
                key={spreadsheet.id}
                className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10 border-border/50 dark:border-white/5 bg-card/60 dark:bg-card/40 backdrop-blur-md cursor-pointer ring-1 ring-border/10 dark:ring-white/10 hover:ring-primary/30"
                onClick={() => handleOpenSpreadsheet(spreadsheet.id)}
              >
                <div className={`absolute top-0 left-0 w-full h-1 ${spreadsheet.is_shared ? 'bg-blue-500' : 'bg-gradient-to-r from-primary to-blue-600'} opacity-80 group-hover:opacity-100 transition-opacity`} />
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                <CardHeader className="pb-3 pt-5">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3 w-full">
                      <div className={`p-2.5 rounded-xl transition-colors ${spreadsheet.is_shared ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500/20' : 'bg-primary/10 text-primary group-hover:bg-primary/20'}`}>
                        {spreadsheet.is_shared ? <Users className="h-5 w-5" /> : <FileSpreadsheet className="h-5 w-5" />}
                      </div>
                      <div className="space-y-1 flex-1 min-w-0">
                        <CardTitle className="text-base font-semibold leading-none truncate text-foreground/90 dark:text-white/90 group-hover:text-foreground dark:group-hover:text-white transition-colors">{spreadsheet.name}</CardTitle>
                        {spreadsheet.is_shared && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>by {spreadsheet.owner}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-4">
                  {spreadsheet.description ? (
                    <CardDescription className="line-clamp-2 text-xs h-8 text-muted-foreground/80">
                      {spreadsheet.description}
                    </CardDescription>
                  ) : (
                    <p className="text-xs text-muted-foreground/50 italic h-8 flex items-center">No description</p>
                  )}

                  <div className="mt-4 space-y-2">
                    {spreadsheet.page_name && (
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70 bg-secondary/30 px-2 py-1 rounded-md border border-border/30">
                        <span className="font-bold uppercase opacity-50">Page:</span>
                        <span className="truncate">{spreadsheet.page_name}</span>
                      </div>
                    )}
                    {spreadsheet.form_name && (
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70 bg-secondary/30 px-2 py-1 rounded-md border border-border/30">
                        <span className="font-bold uppercase opacity-50">Form:</span>
                        <span className="truncate">{spreadsheet.form_name}</span>
                      </div>
                    )}
                    {spreadsheet.campaign_name && (
                      <div className="flex items-center gap-2 text-[10px] text-primary/70 bg-primary/5 px-2 py-1 rounded-md border border-primary/20">
                        <span className="font-bold uppercase opacity-50">Campaign:</span>
                        <span className="truncate font-semibold">{spreadsheet.campaign_name}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {spreadsheet.is_shared && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-300 ring-1 ring-blue-500/20">
                        {spreadsheet.permission_level === 'read-write' ? 'Can edit' : 'View only'}
                      </span>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-3 pb-3 border-t border-border/10 dark:border-white/5 bg-muted/40 dark:bg-black/20">
                  <div className="w-full flex justify-between items-center text-xs text-muted-foreground">
                    <span>{new Date(spreadsheet.created_at).toLocaleDateString()}</span>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {!spreadsheet.is_shared && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 hover:bg-accent/10 dark:hover:bg-white/10 hover:text-foreground dark:hover:text-white rounded-full transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareSpreadsheet(spreadsheet.id);
                            }}
                          >
<Share2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                             variant="ghost"
                             size="icon"
                             className="h-7 w-7 hover:bg-green-100 dark:hover:bg-green-900 hover:text-green-600 dark:hover:text-green-400 rounded-full transition-colors"
                             onClick={(e) => {
                               e.stopPropagation();
                               setSelectedSpreadsheetForImport(spreadsheet.id);
                               setIsGoogleSheetsDialogOpen(true);
                             }}
                             title="Import from Google Sheets"
                           >
                             <Download className="h-3.5 w-3.5" />
                           </Button>
                           <Button
                             variant="ghost"
                             size="icon"
                             className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive rounded-full transition-colors"
                             onClick={(e) => {
                               e.stopPropagation();
                               handleDeleteSpreadsheet(spreadsheet.id, spreadsheet.name);
                             }}
                           >
                             <Trash2 className="h-3.5 w-3.5" />
                           </Button>
                        </>
                      )}
                      <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300 text-primary group-hover:text-primary-foreground font-medium flex items-center gap-0.5">
                        Open <ArrowLeft className="h-3 w-3 rotate-180" />
                      </span>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
</main>

      {/* Google Sheets Import Dialog */}
      <GoogleSheetsDialog
        open={isGoogleSheetsDialogOpen}
        onOpenChange={setIsGoogleSheetsDialogOpen}
        spreadsheetId={selectedSpreadsheetForImport}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["spreadsheets"] });
          toast({ title: "Data imported successfully!" });
        }}
      />
    </div>
  );
};

export default Dashboard;
