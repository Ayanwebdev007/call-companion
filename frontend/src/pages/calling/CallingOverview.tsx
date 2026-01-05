import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { fetchSpreadsheets, fetchMetaAnalytics } from "@/lib/api";
import { FileSpreadsheet, Users, Activity, PhoneCall, ArrowRight, Sparkles, Facebook } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
    const manualSpreadsheets = totalSpreadsheets - metaSpreadsheets;

    return (
        <div className="p-8 space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Calling Overview</h1>
                <p className="text-muted-foreground mt-2">Welcome to your calling command center.</p>
            </div>

            {/* Real-time Lead Activity Log at the Top */}
            <div className="animate-fade-in">
                <Card className="border-primary/20 bg-primary/5 relative overflow-hidden group shadow-xl shadow-primary/5 hover:border-primary/40 transition-all duration-300">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Sparkles className="h-12 w-12 text-primary" />
                    </div>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2 font-bold tracking-tight">
                                <Facebook className="h-6 w-6 text-[#1877F2]" />
                                Detailed Lead Activity Log
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                                <span className="flex h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse ring-2 ring-green-500/20" />
                                <span className="font-semibold text-green-600 dark:text-green-400">Real-time Meta Lead Updates</span>
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate("/calling/insights")}
                            className="bg-background/50 hover:bg-background border-primary/20 text-primary hover:text-primary-foreground hover:bg-primary transition-all shadow-sm"
                        >
                            Full Analytics Dashboard
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-2xl border border-border/50 overflow-hidden bg-card/50 backdrop-blur-md shadow-inner">
                            <div className="overflow-x-auto">
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
                                        ) : analytics?.recentLeads.slice(0, 5).map((lead) => (
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
                                        {!analyticsLoading && (!analytics?.recentLeads || analytics.recentLeads.length === 0) && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground italic">
                                                    No recent leads found. Connect your Meta webhook to see them here!
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Spreadsheets</CardTitle>
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalSpreadsheets}</div>
                        <p className="text-xs text-muted-foreground">Active data sheets</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Manual Sheets</CardTitle>
                        <PhoneCall className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{manualSpreadsheets}</div>
                        <p className="text-xs text-muted-foreground">Manually created lists</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Meta Sheets</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metaSpreadsheets}</div>
                        <p className="text-xs text-muted-foreground">Connected to Meta Ads</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Shared With You</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{sharedSpreadsheets}</div>
                        <p className="text-xs text-muted-foreground">Collaborative sheets</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="hover:border-primary/50 transition-colors cursor-pointer group" onClick={() => navigate("/calling/manual")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xl font-bold">Manual Sheet Dashboard</CardTitle>
                        <PhoneCall className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">Manage your manually created lead lists, import from Google Sheets, and start calling.</p>
                        <div className="flex items-center text-sm font-semibold text-primary">
                            Open Dashboard <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="hover:border-blue-500/50 transition-colors cursor-pointer group" onClick={() => navigate("/calling/meta")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xl font-bold">Meta Ads Dashboard</CardTitle>
                        <Activity className="h-6 w-6 text-blue-500 group-hover:scale-110 transition-transform" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">Monitor leads flowing in from Facebook & Instagram in real-time. View master and ad-specific sheets.</p>
                        <div className="flex items-center text-sm font-semibold text-blue-500">
                            Open Dashboard <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </CardContent>
                </Card>
            </div>

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
