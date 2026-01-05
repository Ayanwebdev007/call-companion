import { useQuery } from "@tanstack/react-query";
import { fetchSpreadsheets, fetchMetaAnalytics, Spreadsheet } from "@/lib/api";
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
    Cell
} from "recharts";
import { Facebook, Info, AlertCircle, CheckCircle2, Clock, MapPin, Hash, ArrowRight } from "lucide-react";

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
                        <CardTitle className="text-sm font-bold flex items-center justify-between">
                            Leads per Page
                            <span className="text-[10px] uppercase text-muted-foreground font-normal">Actionable</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={pageData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} hide />
                                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                    itemStyle={{ color: 'hsl(var(--primary))' }}
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
                    <CardHeader>
                        <CardTitle className="text-sm font-bold flex items-center justify-between">
                            Leads per Form
                            <span className="text-[10px] uppercase text-muted-foreground font-normal">Actionable</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px]">
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

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-bold">CRM Status Distrib.</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={statusData} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" fontSize={10} tickLine={false} axisLine={false} width={80} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                                />
                                <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">Recent Lead Activity</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {analytics?.recentLeads.length === 0 ? (
                                <p className="text-center py-8 text-muted-foreground text-sm">No recent leads found.</p>
                            ) : (
                                analytics?.recentLeads.map((lead) => (
                                    <div key={lead.id} className="group relative flex items-start gap-3 p-3 rounded-xl border border-border/40 hover:border-primary/30 transition-all bg-card/50">
                                        <div className="mt-1 p-2 rounded-full bg-primary/5 text-primary">
                                            <MapPin className="h-3 w-3" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className="font-bold text-sm truncate">{lead.customer_name}</h4>
                                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                    {new Date(lead.created_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground font-medium truncate">
                                                    {lead.spreadsheet_id.name}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground truncate">
                                                    {lead.spreadsheet_id.form_name}
                                                </span>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => navigate(`/spreadsheet/${(lead.spreadsheet_id as any)._id || lead.spreadsheet_id.id}`)}
                                        >
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Sheets Created</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {metaSheets.slice(0, 5).map((sheet) => (
                                <div key={sheet.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border/50">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-full bg-blue-500/10 text-blue-600">
                                            <Facebook className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-sm">{sheet.name}</h4>
                                            <p className="text-xs text-muted-foreground">{sheet.page_name} • {sheet.form_name}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Active
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">
                                            {new Date(sheet.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
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
