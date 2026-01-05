import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { fetchMetaAnalytics } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Phone, User, LayoutDashboard, LogOut, Home as HomeIcon, ArrowRight, Palette, Webhook, Facebook, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["meta-analytics"],
    queryFn: fetchMetaAnalytics,
  });

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset className="bg-background relative overflow-hidden">
        {/* Background gradients for the main area */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-soft-light pointer-events-none"></div>

        <header className="sticky top-0 z-50 flex h-16 w-full items-center gap-4 border-b border-border/40 bg-background/60 backdrop-blur-xl px-4 shadow-sm">
          <SidebarTrigger />
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Overview</h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-full border border-border/50">
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium hidden md:block">{user?.username}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 pt-6 relative z-10 animate-fade-in text-left">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">{getTimeGreeting()}, {user?.username}</h2>
              <p className="text-muted-foreground mt-1 text-base">Here's what's happening with your projects today.</p>
            </div>
          </div>

          <div className="space-y-6 mb-8">
            <Card className="border-primary/20 bg-primary/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles className="h-12 w-12 text-primary" />
              </div>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <LayoutDashboard className="h-5 w-5 text-primary" />
                    Detailed Lead Activity Log
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    Real-time Meta Lead Updates
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/calling/meta")}
                  className="bg-background/50 hover:bg-background"
                >
                  View Full Insights
                </Button>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-border/50 overflow-hidden bg-card/50 backdrop-blur-sm">
                  <div className="overflow-x-auto">
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
                        {analyticsLoading ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground animate-pulse">
                              Fetching latest leads...
                            </td>
                          </tr>
                        ) : analytics?.recentLeads.slice(0, 10).map((lead) => (
                          <tr key={lead.id} className="hover:bg-accent/5 transition-colors group/row">
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
                                <span className="text-primary font-medium truncate" title={lead.meta_data?.meta_campaign || lead.spreadsheet_id.campaign_name}>
                                  {lead.meta_data?.meta_campaign || lead.spreadsheet_id.campaign_name || 'N/A'}
                                </span>
                                <span className="text-[10px] text-muted-foreground truncate" title={lead.meta_data?.meta_ad || lead.spreadsheet_id.ad_name}>
                                  {lead.meta_data?.meta_ad || lead.spreadsheet_id.ad_name || 'N/A'}
                                </span>
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
                        {!analyticsLoading && (!analytics?.recentLeads || analytics.recentLeads.length === 0) && (
                          <tr>
                            <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground italic">No recent leads found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Action: Calling */}
            <Card
              className="group relative overflow-hidden transition-all hover:shadow-2xl border-border/50 bg-card/60 backdrop-blur-md cursor-pointer hover:border-primary/50"
              onClick={() => navigate("/calling")}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-primary/10 rounded-2xl ring-1 ring-primary/20 shadow-lg group-hover:scale-110 transition-transform">
                    <Phone className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground mb-2">Start Calling</h3>
                    <Button className="w-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                      Launch Dashboard
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Action: Poster Generator */}
            <Card
              className="group relative overflow-hidden transition-all hover:shadow-2xl border-border/50 bg-card/60 backdrop-blur-md cursor-pointer hover:border-blue-500/50"
              onClick={() => navigate("/poster-generator")}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-blue-500/10 rounded-2xl ring-1 ring-blue-500/20 shadow-lg group-hover:scale-110 transition-transform">
                    <Palette className="h-8 w-8 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground mb-2">Poster Generator</h3>
                    <Button className="w-full bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all border-0">
                      Launch Generator
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>


          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Home;
