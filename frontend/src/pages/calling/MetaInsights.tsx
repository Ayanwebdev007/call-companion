import { useQuery } from "@tanstack/react-query";
import { fetchSpreadsheets, fetchMetaAnalytics, Spreadsheet } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area
} from "recharts";
import { Facebook, Info, AlertCircle, CheckCircle2, Clock, MapPin, Hash, ArrowRight, LayoutDashboard, Target, Layers, PlayCircle, Calendar } from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function MetaInsights() {
    const navigate = useNavigate();
    const { data: spreadsheets = [], isLoading: sheetsLoading } = useQuery({
        queryKey: ["spreadsheets"],
        queryFn: fetchSpreadsheets,
    });

    const { data: analytics, isLoading: analyticsLoading } = useQuery({
        queryKey: ["meta-analytics"],
        queryFn: fetchMetaAnalytics,
    });

    const metaSheets = spreadsheets.filter(s => s.is_meta);

    // Calculate stats
    const masterSheets = metaSheets.filter(s => s.is_master);
    const adSpecificSheets = metaSheets.filter(s => !s.is_master);

    // Group by page
    // Group by page for local stats fallback
    const pageGroups = metaSheets.reduce((acc, sheet) => {
        const page = sheet.page_name || 'Unknown Page';
        acc[page] = (acc[page] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Group by form for local stats fallback
    const formGroups = metaSheets.reduce((acc, sheet) => {
        const form = sheet.form_name || 'Unknown Form';
        acc[form] = (acc[form] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Use real lead-level chart data if available, otherwise fallback to sheet counts
    const pageData = analytics?.charts.pageLeads
        ? Object.entries(analytics.charts.pageLeads).map(([name, value]) => ({ name, value }))
        : Object.entries(pageGroups).map(([name, value]) => ({ name, value }));

    const formData = analytics?.charts.formLeads
        ? Object.entries(analytics.charts.formLeads).map(([name, value]) => ({ name, value }))
        : Object.entries(formGroups).map(([name, value]) => ({ name, value }));

    const statusData = analytics?.charts.statusDistribution
        ? Object.entries(analytics.charts.statusDistribution).map(([name, value]) => ({ name, value }))
        : [];

    const campaignData = analytics?.charts.campaignLeads
        ? Object.entries(analytics.charts.campaignLeads).map(([name, value]) => ({ name, value }))
        : [];

    const adSetData = analytics?.charts.adSetLeads
        ? Object.entries(analytics.charts.adSetLeads).map(([name, value]) => ({ name, value }))
        : [];

    const adData = analytics?.charts.adLeads
        ? Object.entries(analytics.charts.adLeads).map(([name, value]) => ({ name, value }))
        : [];

    const trendData = analytics?.charts.dateLeads
        ? Object.entries(analytics.charts.dateLeads).map(([date, value]) => ({ date, value }))
        : [];

    if (sheetsLoading || analyticsLoading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading insights...</div>;
    }

    const handleChartClick = (type: 'page' | 'form', value: string) => {
        const param = type === 'page' ? 'page' : 'form';
        navigate(`/calling/meta?${param}=${encodeURIComponent(value)}`);
    };

    return (
        <div className="p-8 space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Facebook className="text-[#1877F2] h-8 w-8" />
                        Meta Lead Insights
                    </h1>
                    <p className="text-muted-foreground mt-2">In-depth analytics for your Facebook & Instagram lead campaigns.</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-blue-500/10 border-blue-200/20">
                    <CardHeader className="pb-2 p-4">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-2">
                            <Clock className="h-3 w-3" /> Leads Today
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-3xl font-black text-blue-700">{analytics?.stats.leadsToday || 0}</div>
                    </CardContent>
                </Card>
                <Card className="bg-indigo-500/10 border-indigo-200/20">
                    <CardHeader className="pb-2 p-4">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-2">
                            <Hash className="h-3 w-3" /> This Week
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-3xl font-black text-indigo-700">{analytics?.stats.leadsThisWeek || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2 p-4">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Capture Forms</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-3xl font-black">{Object.keys(analytics?.charts.formLeads || {}).length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2 p-4">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Leads</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-3xl font-black">{analytics?.stats.totalLeads || 0}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Target className="h-4 w-4 text-orange-500" />
                            Campaign Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={campaignData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="name" fontSize={10} hide />
                                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                />
                                <Bar dataKey="value" fill="#FFBB28" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Layers className="h-4 w-4 text-purple-500" />
                            Ad Set Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={adSetData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="name" fontSize={10} hide />
                                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                />
                                <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <PlayCircle className="h-4 w-4 text-blue-500" />
                            Ad Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={adData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="name" fontSize={10} hide />
                                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                />
                                <Bar dataKey="value" fill="#0088FE" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-green-500" />
                        Lead Arrival Trends (Last 30 Days)
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                            <XAxis
                                dataKey="date"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => new Date(val).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            />
                            <YAxis fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="hsl(var(--primary))"
                                fillOpacity={1}
                                fill="url(#colorValue)"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">Detailed Lead Activity Log</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">Full breakdown of metadata from your latest 50 leads.</p>
                    </div>
                    <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="rounded-xl border border-border/50 overflow-hidden bg-card/30">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-secondary/50 text-muted-foreground font-bold border-b border-border/50">
                                <tr>
                                    <th className="px-4 py-3">Lead Name</th>
                                    <th className="px-4 py-3">Source (Page/Form)</th>
                                    <th className="px-4 py-3">Campaign & Ad</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Arrived At</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {analytics?.recentLeads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-accent/5 transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-foreground">{lead.customer_name}</span>
                                                <span className="text-[10px] text-muted-foreground opacity-70">{lead.phone_number}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col max-w-[150px]">
                                                <span className="truncate" title={lead.spreadsheet_id.page_name}>{lead.spreadsheet_id.page_name || 'N/A'}</span>
                                                <span className="text-[10px] text-muted-foreground truncate" title={lead.spreadsheet_id.form_name}>{lead.spreadsheet_id.form_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col max-w-[200px]">
                                                <span className="text-primary font-medium truncate" title={lead.meta_data?.meta_campaign}>{lead.meta_data?.meta_campaign || 'N/A'}</span>
                                                <span className="text-[10px] text-muted-foreground truncate" title={lead.meta_data?.meta_ad}>{lead.meta_data?.meta_ad || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                lead.status === 'new' ? "bg-red-500/10 text-red-600" : "bg-green-500/10 text-green-600"
                                            )}>
                                                {lead.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span>{new Date(lead.created_at!).toLocaleDateString()}</span>
                                                <span className="text-[10px] text-muted-foreground">{new Date(lead.created_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary transition-all"
                                                onClick={() => navigate(`/spreadsheet/${(lead.spreadsheet_id as any)._id || lead.spreadsheet_id.id}`)}
                                            >
                                                <ArrowRight className="h-3 w-3" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {analytics?.recentLeads.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground italic">No leads found in this period.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold">Leads per Page</CardTitle>
                        <Facebook className="h-4 w-4 text-[#1877F2]" />
                    </CardHeader>
                    <CardContent className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={pageData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="name" fontSize={10} hide />
                                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                />
                                <Bar
                                    dataKey="value"
                                    fill="hsl(var(--primary))"
                                    radius={[4, 4, 0, 0]}
                                    onClick={(data) => handleChartClick('page', data.name)}
                                    cursor="pointer"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-bold">Leads per Form</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={formData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                    onClick={(data) => handleChartClick('form', data.name)}
                                    cursor="pointer"
                                >
                                    {formData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 text-yellow-600 dark:text-yellow-400">
                <Info className="h-5 w-5 shrink-0" />
                <p className="text-sm">
                    <strong>Pro Tip:</strong> Click on any bar or pie slice to jump directly to those filtered spreadsheets in the Meta Dashboard.
                </p>
            </div>
        </div>
    );
}
