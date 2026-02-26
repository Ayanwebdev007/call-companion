import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { fetchSpreadsheets, fetchMetaAnalytics } from "@/lib/api";
import { FileSpreadsheet, Users, Activity, PhoneCall, ArrowRight, Sparkles, Facebook } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LinkSheetsDialog } from "@/components/LinkSheetsDialog";
import { UnifiedSheetDialog } from "@/components/UnifiedSheetDialog";
import { useState } from "react";
import { Link2, Layers, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Spreadsheet } from "@/lib/api";

export default function CallingOverview() {
    const navigate = useNavigate();
    const { data: spreadsheets = [] } = useQuery({
        queryKey: ["spreadsheets"],
        queryFn: fetchSpreadsheets,
    });

    const { data: analytics, isLoading: analyticsLoading } = useQuery({
        queryKey: ["meta-analytics"],
        queryFn: fetchMetaAnalytics,
    });

    const totalSpreadsheets = spreadsheets.length;
    const sharedSpreadsheets = spreadsheets.filter(s => s.is_shared).length;
    const metaSpreadsheets = spreadsheets.filter(s => s.is_meta).length;

    const unifiedSpreadsheets = spreadsheets.filter(s => s.is_unified).length;
    const manualSpreadsheets = totalSpreadsheets - metaSpreadsheets - unifiedSpreadsheets;
    const unifiedSheets = spreadsheets.filter(s => s.is_unified);

    const [isUnifiedDialogOpen, setIsUnifiedDialogOpen] = useState(false);
    const [linkingSheet, setLinkingSheet] = useState<Spreadsheet | null>(null);

    const recentMetaLeads = (analytics?.recentLeads || []).filter(lead => {
        const metaId = lead.meta_data instanceof Map
            ? lead.meta_data.get('meta_lead_id')
            : (lead.meta_data as any)?.meta_lead_id;
        return !!metaId;
    });

    return (
        <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Calling Overview</h1>
                    <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">Welcome to your calling command center.</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/calling/insights")}
                    className="w-full md:w-auto bg-background/50 hover:bg-background border-primary/20 text-primary hover:text-primary-foreground hover:bg-primary transition-all shadow-sm"
                >
                    Full Analytics Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>

            {/* Real-time Lead Activity Log at the Top */}
            <div className="animate-fade-in">
                <Card className="border-primary/20 bg-primary/5 relative overflow-hidden group shadow-xl shadow-primary/5 hover:border-primary/40 transition-all duration-300">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity hidden md:block">
                        <Sparkles className="h-12 w-12 text-primary" />
                    </div>
                    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 pb-4">
                        <div>
                            <CardTitle className="text-lg md:text-xl flex items-center gap-2 font-bold tracking-tight">
                                <Facebook className="h-5 w-5 md:h-6 md:w-6 text-[#1877F2]" />
                                Lead Activity Log
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse ring-2 ring-green-500/20" />
                                <span className="text-xs md:text-sm font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">Real-time Meta Leads</span>
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="px-2 sm:px-6">
                        <div className="rounded-xl md:rounded-2xl border border-border/50 overflow-hidden bg-card/50 backdrop-blur-md shadow-inner">
                            {/* Mobile View: Card List */}
                            <div className="block md:hidden divide-y divide-border/30">
                                {analyticsLoading ? (
                                    <div className="py-12 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                            <span className="animate-pulse text-xs font-medium">Fetching Meta leads...</span>
                                        </div>
                                    </div>
                                ) : recentMetaLeads.length === 0 ? (
                                    <div className="py-12 text-center text-muted-foreground italic text-xs px-4">
                                        No recent leads. Connect Meta webhook to start!
                                    </div>
                                ) : (
                                    recentMetaLeads.slice(0, 5).map((lead) => (
                                        <div key={lead.id} className="p-4 flex flex-col gap-3 hover:bg-primary/5 transition-colors">
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-foreground">{lead.customer_name}</span>
                                                    <span className="text-[11px] text-muted-foreground font-medium">{lead.phone_number}</span>
                                                </div>
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ring-1",
                                                    lead.status === 'new' ? "bg-red-500/10 text-red-600 ring-red-500/20" : "bg-green-500/10 text-green-600 ring-green-500/20"
                                                )}>
                                                    {lead.status}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 text-[10px] bg-secondary/30 p-2 rounded-lg border border-border/10">
                                                <div className="flex flex-col">
                                                    <span className="text-muted-foreground uppercase text-[8px] font-bold">Source</span>
                                                    <span className="truncate font-medium" title={lead.spreadsheet_id.page_name}>{lead.spreadsheet_id.page_name || 'N/A'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-muted-foreground uppercase text-[8px] font-bold">Arrived</span>
                                                    <span className="font-medium">{new Date(lead.created_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </div>

                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="w-full h-8 text-[11px] font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white border-none"
                                                onClick={() => navigate(`/spreadsheet/${(lead.spreadsheet_id as any)._id || lead.spreadsheet_id.id}`)}
                                            >
                                                Open Sheet <ArrowRight className="ml-2 h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Desktop View: Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-secondary/50 text-muted-foreground font-bold border-b border-border/50">
                                        <tr>
                                            <th className="px-6 py-4">Lead Details</th>
                                            <th className="px-6 py-4">Source Channel</th>
                                            <th className="px-6 py-4">Campaign Context</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Arrival Timestamp</th>
                                            <th className="px-6 py-4 text-right">View Sheet</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {analyticsLoading ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                        <span className="animate-pulse font-medium">Fetching the latest leads from Meta...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : recentMetaLeads.slice(0, 5).map((lead) => (
                                            <tr key={lead.id} className="hover:bg-primary/5 transition-colors group/row">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm text-foreground">{lead.customer_name}</span>
                                                        <span className="text-[11px] text-muted-foreground font-medium">{lead.phone_number}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col max-w-[150px]">
                                                        <span className="truncate font-medium text-foreground/80" title={lead.spreadsheet_id.page_name}>{lead.spreadsheet_id.page_name || 'N/A'}</span>
                                                        <span className="text-[10px] text-muted-foreground truncate" title={lead.spreadsheet_id.form_name}>{lead.spreadsheet_id.form_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col max-w-[200px]">
                                                        <span className="text-primary font-bold truncate" title={lead.meta_data?.meta_campaign || lead.spreadsheet_id.campaign_name}>
                                                            {lead.meta_data?.meta_campaign || lead.spreadsheet_id.campaign_name || 'N/A'}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground font-medium truncate" title={lead.meta_data?.meta_ad || lead.spreadsheet_id.ad_name}>
                                                            {lead.meta_data?.meta_ad || lead.spreadsheet_id.ad_name || 'N/A'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={cn(
                                                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ring-1",
                                                        lead.status === 'new' ? "bg-red-500/10 text-red-600 ring-red-500/20" : "bg-green-500/10 text-green-600 ring-green-500/20"
                                                    )}>
                                                        {lead.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-foreground/80">{new Date(lead.created_at!).toLocaleDateString()}</span>
                                                        <span className="text-[10px] text-muted-foreground">{new Date(lead.created_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 p-0 rounded-full hover:bg-primary hover:text-white transition-all shadow-sm flex items-center justify-center"
                                                        onClick={() => navigate(`/spreadsheet/${(lead.spreadsheet_id as any)._id || lead.spreadsheet_id.id}`)}
                                                    >
                                                        <ArrowRight className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
                        <CardTitle className="text-[10px] md:text-sm font-bold uppercase tracking-wider text-muted-foreground">Total Sheets</CardTitle>
                        <FileSpreadsheet className="h-3.5 w-3.5 text-primary/70" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl md:text-2xl font-bold">{totalSpreadsheets}</div>
                        <p className="text-[9px] md:text-xs text-muted-foreground">Active data sheets</p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
                        <CardTitle className="text-[10px] md:text-sm font-bold uppercase tracking-wider text-muted-foreground">Manual</CardTitle>
                        <PhoneCall className="h-3.5 w-3.5 text-orange-500/70" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl md:text-2xl font-bold">{manualSpreadsheets}</div>
                        <p className="text-[9px] md:text-xs text-muted-foreground">Manual lists</p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
                        <CardTitle className="text-[10px] md:text-sm font-bold uppercase tracking-wider text-muted-foreground">Meta Ads</CardTitle>
                        <Activity className="h-3.5 w-3.5 text-blue-500/70" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl md:text-2xl font-bold">{metaSpreadsheets}</div>
                        <p className="text-[9px] md:text-xs text-muted-foreground">Direct from ads</p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2">
                        <CardTitle className="text-[10px] md:text-sm font-bold uppercase tracking-wider text-muted-foreground">Shared</CardTitle>
                        <Users className="h-3.5 w-3.5 text-green-500/70" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl md:text-2xl font-bold">{sharedSpreadsheets}</div>
                        <p className="text-[9px] md:text-xs text-muted-foreground">Collaborations</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="hover:border-primary/50 transition-all cursor-pointer group shadow-sm hover:shadow-md" onClick={() => navigate("/calling/manual")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg md:text-xl font-bold">Manual Sheets</CardTitle>
                        <PhoneCall className="h-5 w-5 md:h-6 md:w-6 text-primary group-hover:scale-110 transition-transform" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-[11px] md:text-sm text-muted-foreground mb-3 md:mb-4 line-clamp-2 md:line-clamp-none">Manage manually created lead lists, import from Google Sheets, and start calling.</p>
                        <div className="flex items-center text-xs md:text-sm font-bold text-primary">
                            Open Dashboard <ArrowRight className="h-3 w-3 md:h-4 md:w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="hover:border-blue-500/50 transition-all cursor-pointer group shadow-sm hover:shadow-md" onClick={() => navigate("/calling/meta")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg md:text-xl font-bold">Meta Ads</CardTitle>
                        <Activity className="h-5 w-5 md:h-6 md:w-6 text-blue-500 group-hover:scale-110 transition-transform" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-[11px] md:text-sm text-muted-foreground mb-3 md:mb-4 line-clamp-2 md:line-clamp-none">Monitor leads flowing from Facebook & Instagram. View master and ad-specific sheets.</p>
                        <div className="flex items-center text-xs md:text-sm font-bold text-blue-500">
                            Open Dashboard <ArrowRight className="h-3 w-3 md:h-4 md:w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="hover:border-purple-500/50 transition-all cursor-pointer group relative overflow-hidden bg-gradient-to-br from-card to-purple-500/5 shadow-sm hover:shadow-md" onClick={() => setIsUnifiedDialogOpen(true)}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-lg md:text-xl font-bold">Smart Lists</CardTitle>
                        <Layers className="h-5 w-5 md:h-6 md:w-6 text-purple-500 group-hover:scale-110 transition-transform" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-[11px] md:text-sm text-muted-foreground mb-3 md:mb-4 line-clamp-2 md:line-clamp-none">Create master lists that aggregate leads from multiple Meta campaigns automatically.</p>
                        <div className="flex items-center text-xs md:text-sm font-bold text-purple-500">
                            Create List <Plus className="h-3 w-3 md:h-4 md:w-4 ml-2 group-hover:rotate-90 transition-transform" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Unified Sheets List Section */}
            {unifiedSheets.length > 0 && (
                <div className="animate-fade-in space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Layers className="h-5 w-5 text-purple-500" />
                        Your Smart Lists
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {unifiedSheets.map(sheet => (
                            <Card key={sheet.id} className="border-purple-200/20 bg-purple-500/5 hover:bg-purple-500/10 transition-colors">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-base font-bold truncate pr-4">{sheet.name}</CardTitle>
                                        {((sheet.user_id as any)?.name || (sheet.user_id as any)?.username) && (
                                            <Badge variant="outline" className="text-[10px] bg-background">
                                                By {(sheet.user_id as any).name || (sheet.user_id as any).username}
                                            </Badge>
                                        )}
                                    </div>
                                    <CardDescription className="line-clamp-1">{sheet.description || 'No description'}</CardDescription>
                                </CardHeader>
                                <CardContent className="pb-3">
                                    <div className="flex flex-wrap gap-1 mb-4">
                                        <Badge variant="secondary" className="text-xs">
                                            {Array.isArray(sheet.linked_meta_sheets) ? sheet.linked_meta_sheets.length : 0} Linked Sources
                                        </Badge>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full text-xs"
                                            onClick={(e) => { e.stopPropagation(); navigate(`/spreadsheet/${sheet.id}`); }}
                                        >
                                            <ArrowRight className="w-3 h-3 mr-1" /> View Leads
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="w-full text-xs"
                                            onClick={(e) => { e.stopPropagation(); setLinkingSheet(sheet); }}
                                        >
                                            <Link2 className="w-3 h-3 mr-1" /> Link Sources
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            <UnifiedSheetDialog
                isOpen={isUnifiedDialogOpen}
                onClose={() => setIsUnifiedDialogOpen(false)}
            />

            {linkingSheet && (
                <LinkSheetsDialog
                    isOpen={!!linkingSheet}
                    onClose={() => setLinkingSheet(null)}
                    unifiedSheet={linkingSheet}
                />
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Recent Sheets</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {spreadsheets.slice(0, 5).map((sheet) => (
                            <div key={sheet.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={`p-2 rounded-lg ${sheet.is_meta ? 'bg-blue-500/10 text-blue-600' : 'bg-primary/10 text-primary'}`}>
                                        <FileSpreadsheet className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-semibold text-sm truncate">{sheet.name}</h4>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                            {sheet.is_meta ? 'Meta Ads' : 'Manual'}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                                    {new Date(sheet.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        ))}
                        {spreadsheets.length === 0 && (
                            <p className="text-center py-8 text-muted-foreground text-sm">No spreadsheets yet.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
