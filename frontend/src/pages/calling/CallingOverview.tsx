import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { fetchSpreadsheets } from "@/lib/api";
import { FileSpreadsheet, Users, Activity, PhoneCall } from "lucide-react";

export default function CallingOverview() {
    const { data: spreadsheets = [] } = useQuery({
        queryKey: ["spreadsheets"],
        queryFn: fetchSpreadsheets,
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

            {/* Placeholder for future charts or detailed stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                            Activity chart coming soon...
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
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
        </div>
    );
}
