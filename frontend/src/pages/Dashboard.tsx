import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchSpreadsheets, fetchSharedSpreadsheets, createSpreadsheet, deleteSpreadsheet, shareSpreadsheet, Spreadsheet } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { LogOut, Plus, Trash2, Share2, User, Users, FileSpreadsheet, ArrowLeft, ArrowRight, Download, Webhook, LayoutDashboard, Filter, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import GoogleSheetsDialog from "@/components/GoogleSheetsDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MergeDialog } from "@/components/MergeDialog";

interface DashboardProps {
  filterType?: "manual" | "meta";
}

const Dashboard = ({ filterType }: DashboardProps) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialPage = searchParams.get("page") || "all";
  const initialForm = searchParams.get("form") || "all";

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState("");
  const [shareUsername, setShareUsername] = useState("");
  const [sharePermission, setSharePermission] = useState<"read-only" | "read-write">("read-only");
  const [newSpreadsheetName, setNewSpreadsheetName] = useState("");
  const [newSpreadsheetDescription, setNewSpreadsheetDescription] = useState("");
  const [isGoogleSheetsDialogOpen, setIsGoogleSheetsDialogOpen] = useState(false);
  const [selectedSpreadsheetForImport, setSelectedSpreadsheetForImport] = useState("");
  const [filterMode, setFilterMode] = useState<"manual" | "meta">(initialPage !== "all" || initialForm !== "all" ? "meta" : (filterType || "manual"));
  const [metaViewMode, setMetaViewMode] = useState<"ad" | "form">("ad"); // Segment state
  const [selectedMetaPage, setSelectedMetaPage] = useState<string>(initialPage);
  const [selectedMetaForm, setSelectedMetaForm] = useState<string>(initialForm);

  useEffect(() => {
    const page = searchParams.get("page");
    const form = searchParams.get("form");
    if (page) setSelectedMetaPage(page);
    if (form) setSelectedMetaForm(form);

    // Sync filterMode with prop or URL
    if (page || form) {
      setFilterMode("meta");
    } else if (filterType) {
      setFilterMode(filterType);
    }
  }, [location.search, filterType]);
  const [selectedMetaCampaign, setSelectedMetaCampaign] = useState<string>("all");
  const [selectedMetaAdSet, setSelectedMetaAdSet] = useState<string>("all");
  const [selectedMetaAd, setSelectedMetaAd] = useState<string>("all");
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
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

  const metaPages = useMemo(() => {
    const items = spreadsheets.filter((s: Spreadsheet) => s.is_meta && s.page_name).map((s: Spreadsheet) => s.page_name as string);
    return Array.from(new Set(items)).sort();
  }, [spreadsheets]);

  const metaForms = useMemo(() => {
    const items = spreadsheets.filter((s: Spreadsheet) => s.is_meta && s.form_name).map((s: Spreadsheet) => s.form_name as string);
    return Array.from(new Set(items)).sort();
  }, [spreadsheets]);

  const metaCampaigns = useMemo(() => {
    const items = spreadsheets.filter((s: Spreadsheet) => s.is_meta && s.campaign_name).map((s: Spreadsheet) => s.campaign_name as string);
    return Array.from(new Set(items)).sort();
  }, [spreadsheets]);

  const metaAdSets = useMemo(() => {
    const items = spreadsheets.filter((s: Spreadsheet) => s.is_meta && s.ad_set_name).map((s: Spreadsheet) => s.ad_set_name as string);
    return Array.from(new Set(items)).sort();
  }, [spreadsheets]);

  const metaAds = useMemo(() => {
    const items = spreadsheets.filter((s: Spreadsheet) => s.is_meta && s.ad_name).map((s: Spreadsheet) => s.ad_name as string);
    return Array.from(new Set(items)).sort();
  }, [spreadsheets]);

  // Filter spreadsheets based on filterMode and selectedMetaPage
  const filteredSpreadsheets = useMemo(() => {
    if (filterMode === "manual") {
      return spreadsheets.filter((s: Spreadsheet) => !s.is_meta);
    }

    if (filterMode === "meta") {
      let metaSheets = spreadsheets.filter((s: Spreadsheet) => s.is_meta);

      // Filter by Segment (Ad View vs Form View)
      if (metaViewMode === "ad") {
        metaSheets = metaSheets.filter((s: Spreadsheet) => !s.is_master);
      } else {
        metaSheets = metaSheets.filter((s: Spreadsheet) => s.is_master);
      }

      // Apply filters independently
      if (selectedMetaPage !== "all") {
        metaSheets = metaSheets.filter((s: Spreadsheet) => s.page_name === selectedMetaPage);
      }
      if (selectedMetaForm !== "all") {
        metaSheets = metaSheets.filter((s: Spreadsheet) => s.form_name === selectedMetaForm);
      }
      // Campaign/AdSet/Ad filters only relevant for Ad View usually, but harmless to keep
      if (selectedMetaCampaign !== "all") {
        metaSheets = metaSheets.filter((s: Spreadsheet) => s.campaign_name === selectedMetaCampaign);
      }
      if (selectedMetaAdSet !== "all") {
        metaSheets = metaSheets.filter((s: Spreadsheet) => s.ad_set_name === selectedMetaAdSet);
      }
      if (selectedMetaAd !== "all") {
        metaSheets = metaSheets.filter((s: Spreadsheet) => s.ad_name === selectedMetaAd);
      }

      return metaSheets;
    }

    return spreadsheets;
  }, [spreadsheets, filterMode, metaViewMode, selectedMetaPage, selectedMetaForm, selectedMetaCampaign, selectedMetaAdSet, selectedMetaAd]);

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
    <div className={`min-h-screen ${filterType ? 'bg-transparent' : 'bg-background relative overflow-hidden'}`}>
      {/* Background gradients */}
      {!filterType && (
        <>
          <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-soft-light pointer-events-none"></div>
        </>
      )}

      {!filterType && (
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

            <div className="hidden lg:flex items-center gap-1 bg-secondary/50 dark:bg-white/5 p-1 rounded-xl border border-border/50 dark:border-white/10 backdrop-blur-md">
              <Button
                variant={filterMode === "manual" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setFilterMode("manual")}
                className={`h-8 gap-2 rounded-lg transition-all ${filterMode === "manual" ? "shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <User className="h-4 w-4" />
                <span>Manual</span>
              </Button>
              <Button
                variant={filterMode === "meta" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => {
                  setFilterMode("meta");
                  // Reset all filters
                  setSelectedMetaPage("all");
                  setSelectedMetaForm("all");
                  setSelectedMetaCampaign("all");
                  setSelectedMetaAdSet("all");
                  setSelectedMetaAd("all");
                }}
                className={`h-8 gap-2 rounded-lg transition-all ${filterMode === "meta" ? "shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Webhook className="h-4 w-4 text-blue-500" />
                <span>Meta Ads</span>
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <div className="hidden md:flex items-center gap-2 mr-2 px-3 py-1.5 bg-secondary/50 dark:bg-white/5 rounded-full border border-border/50 dark:border-white/10 backdrop-blur-md">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground/90 dark:text-white/90">{user?.username}</span>
              </div>

              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 border-0 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Spreadsheet
              </Button>

              <Button variant="ghost" size="icon" onClick={logout} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>
      )}

      {/* Sticky Header Group */}
      <div className={`sticky ${filterType ? 'top-0' : 'top-[65px]'} z-40 w-full bg-background/80 backdrop-blur-xl border-b border-border/40 transition-all duration-300`}>
        {/* Meta Filter Sub-navigation */}
        {filterMode === "meta" && (
          <div className="border-b border-border/10 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className={`container mx-auto ${filterType ? 'px-4 py-2' : 'px-4 py-2'} flex flex-col md:flex-row items-center justify-between gap-4`}>
              {/* View Segment Tabs */}
              <div className="flex bg-secondary/50 p-1 rounded-lg border border-border/50">
                <button
                  onClick={() => setMetaViewMode("ad")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${metaViewMode === "ad" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Ad Views
                </button>
                <button
                  onClick={() => setMetaViewMode("form")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${metaViewMode === "form" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Form Views (Master)
                </button>
              </div>

              <div className="flex items-center gap-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-2 border-dashed bg-background/50 hover:bg-background/80">
                      <Filter className="h-4 w-4" />
                      Filter Sheets
                      {(selectedMetaPage !== "all" || selectedMetaForm !== "all" || selectedMetaCampaign !== "all" || selectedMetaAdSet !== "all" || selectedMetaAd !== "all") && (
                        <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          {Number(selectedMetaPage !== "all") + Number(selectedMetaForm !== "all") + Number(selectedMetaCampaign !== "all") + Number(selectedMetaAdSet !== "all") + Number(selectedMetaAd !== "all")}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4 max-h-[80vh] overflow-y-auto" align="start">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-medium leading-none text-sm">Filter Meta Sheets</h4>
                        <p className="text-xs text-muted-foreground">Filter by any combination of fields</p>
                      </div>

                      {/* Page Filter */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Page</label>
                        <Select value={selectedMetaPage} onValueChange={setSelectedMetaPage}>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="All Pages" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Pages</SelectItem>
                            {metaPages.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Form Filter */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Form</label>
                        <Select value={selectedMetaForm} onValueChange={setSelectedMetaForm}>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="All Forms" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Forms</SelectItem>
                            {metaForms.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Campaign Filter */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Campaign</label>
                        <Select value={selectedMetaCampaign} onValueChange={setSelectedMetaCampaign}>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="All Campaigns" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Campaigns</SelectItem>
                            {metaCampaigns.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Ad Set Filter */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Ad Set</label>
                        <Select value={selectedMetaAdSet} onValueChange={setSelectedMetaAdSet}>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="All Ad Sets" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Ad Sets</SelectItem>
                            {metaAdSets.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Ad Filter */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Ad Name</label>
                        <Select value={selectedMetaAd} onValueChange={setSelectedMetaAd}>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="All Ads" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Ads</SelectItem>
                            {metaAds.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-muted-foreground h-8 px-2 hover:text-foreground"
                        onClick={() => {
                          setSelectedMetaPage("all");
                          setSelectedMetaForm("all");
                          setSelectedMetaCampaign("all");
                          setSelectedMetaAdSet("all");
                          setSelectedMetaAd("all");
                        }}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Clear Filters
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  {/* Active Filter Chips */}
                  {selectedMetaPage !== "all" && (
                    <div className="flex items-center gap-1 text-xs bg-secondary/50 px-2.5 py-1 rounded-full border border-border/50 animate-in fade-in zoom-in-95">
                      <span className="opacity-60 font-medium">Page:</span>
                      <span className="font-semibold">{selectedMetaPage}</span>
                      <button onClick={() => setSelectedMetaPage("all")} className="ml-1 hover:text-destructive transition-colors p-0.5"><X className="h-3 w-3" /></button>
                    </div>
                  )}
                  {selectedMetaCampaign !== "all" && (
                    <div className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20 animate-in fade-in zoom-in-95">
                      <span className="opacity-60 font-medium">Campaign:</span>
                      <span className="font-semibold">{selectedMetaCampaign}</span>
                      <button onClick={() => setSelectedMetaCampaign("all")} className="ml-1 hover:text-destructive transition-colors p-0.5"><X className="h-3 w-3" /></button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsMergeDialogOpen(true)}
                      className="h-8 gap-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary"
                    >
                      <Filter className="h-4 w-4 rotate-90" />
                      Merge Duplicates
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Header Container */}
        <div className={`${filterType ? 'px-4 py-4 md:px-6' : 'container mx-auto px-4 py-8'}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground dark:text-white">
                {filterType === "manual" ? "Manual Spreadsheets" : filterType === "meta" ? "Meta Spreadsheets" : "Dashboard"}
              </h2>
              <p className="text-muted-foreground mt-1">
                Showing {filteredSpreadsheets.length} {filteredSpreadsheets.length === 1 ? 'spreadsheet' : 'spreadsheets'}
              </p>
            </div>

            {filterType && (
              <div className="flex items-center gap-3">
                {filterType === "manual" && (
                  <Button
                    variant="outline"
                    onClick={() => setIsGoogleSheetsDialogOpen(true)}
                    className="bg-card dark:bg-card/40 border-border/50 hover:bg-accent/10"
                  >
                    <Download className="h-4 w-4 mr-2 text-primary" />
                    Import
                  </Button>
                )}
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 border-0 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New {filterType === "manual" ? "Manual" : "Meta"} Sheet
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`${filterType ? 'p-4 md:p-6' : 'container mx-auto px-4 py-8 relative z-10'}`}>



        {metaViewMode === "form" && filterMode === "meta" && (
          <div className="mb-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl flex items-start gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-700 dark:text-blue-400 text-sm">Use Master Views for Follow-ups</h4>
              <p className="text-xs text-muted-foreground mt-1">
                These "Form Views" aggregate leads from ALL your ads in real-time. Use these sheets for your calling team to ensure no lead is missed, regardless of which ad variant they came from.
              </p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border/40 bg-card/40">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-24 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
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
          <div className="flex flex-col gap-3 animate-fade-in-up">
            {filteredSpreadsheets.map((spreadsheet: Spreadsheet) => (
              <div
                key={spreadsheet.id}
                className="group flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card/60 dark:bg-card/40 hover:bg-accent/5 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer relative overflow-hidden"
                onClick={() => handleOpenSpreadsheet(spreadsheet.id)}
              >
                {/* Left Gradient Bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${spreadsheet.is_shared ? 'bg-blue-500' : 'bg-gradient-to-b from-primary to-blue-600'} opacity-60 group-hover:opacity-100 transition-opacity`} />

                {/* Icon */}
                <div className={`ml-2 p-3 rounded-full transition-all duration-300 shrink-0 relative ${spreadsheet.is_shared
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500/20'
                  : 'bg-primary/10 text-primary group-hover:bg-primary/20'}`}>
                  {spreadsheet.is_shared ? <Users className="h-5 w-5" /> : <FileSpreadsheet className="h-5 w-5" />}

                  {/* New Leads Notification Badge */}
                  {spreadsheet.newLeadsCount !== undefined && spreadsheet.newLeadsCount > 0 && (
                    <div className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white shadow-lg ring-2 ring-background animate-pulse">
                      {spreadsheet.newLeadsCount}
                    </div>
                  )}
                </div>

                {/* Main Info */}
                <div className="flex-1 min-w-0 grid gap-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-base text-foreground/90 group-hover:text-foreground transition-colors truncate">
                      {spreadsheet.name}
                    </h3>
                    {spreadsheet.is_shared && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20">
                        Shared by {spreadsheet.owner} ({spreadsheet.permission_level === 'read-write' ? 'Edit' : 'View'})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-x-4 gap-y-1 flex-wrap">
                    {spreadsheet.description ? (
                      <p className="text-xs text-muted-foreground truncate max-w-[300px]">{spreadsheet.description}</p>
                    ) : (
                      <span className="text-xs text-muted-foreground/40 italic">No description</span>
                    )}

                    {/* Meta Chips */}
                    <div className="flex items-center gap-2">
                      {spreadsheet.page_name && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80 bg-secondary/50 px-2 py-0.5 rounded border border-border/30">
                          <span className="opacity-50 uppercase tracking-wider">Page:</span> {spreadsheet.page_name}
                        </div>
                      )}
                      {spreadsheet.form_name && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80 bg-secondary/50 px-2 py-0.5 rounded border border-border/30">
                          <span className="opacity-50 uppercase tracking-wider">Form:</span> {spreadsheet.form_name}
                        </div>
                      )}
                      {(spreadsheet.ad_name || spreadsheet.campaign_name) && (
                        <div className="flex items-center gap-1 text-[10px] text-primary/80 bg-primary/5 px-2 py-0.5 rounded border border-primary/20">
                          <span className="opacity-50 uppercase tracking-wider">{spreadsheet.ad_name ? 'Ad' : 'Campaign'}:</span> {spreadsheet.ad_name || spreadsheet.campaign_name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-6 pl-4 border-l border-border/10">
                  <div className="flex flex-col items-end gap-0 hidden lg:flex whitespace-nowrap">
                    <span className="text-[10px] font-bold text-foreground/80">{new Date(spreadsheet.created_at).toLocaleDateString()}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(spreadsheet.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 sm:translate-x-2 sm:group-hover:translate-x-0" onClick={(e) => e.stopPropagation()}>
                    {!spreadsheet.is_shared && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm"
                          onClick={(e) => { e.stopPropagation(); handleShareSpreadsheet(spreadsheet.id); }}
                          title="Share"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20 dark:hover:text-green-400 hover:shadow-sm"
                          onClick={(e) => { e.stopPropagation(); setSelectedSpreadsheetForImport(spreadsheet.id); setIsGoogleSheetsDialogOpen(true); }}
                          title="Import from Google Sheets"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 hover:shadow-sm"
                          onClick={(e) => { e.stopPropagation(); handleDeleteSpreadsheet(spreadsheet.id, spreadsheet.name); }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>

                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
        }
      </div>

      {/* Dialogs relocated to root for persistence across layouts */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
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

      <MergeDialog
        open={isMergeDialogOpen}
        onOpenChange={setIsMergeDialogOpen}
        spreadsheets={spreadsheets}
      />

      <GoogleSheetsDialog
        open={isGoogleSheetsDialogOpen}
        onOpenChange={setIsGoogleSheetsDialogOpen}
        spreadsheetId={selectedSpreadsheetForImport}
      />
    </div>
  );
};

export default Dashboard;
