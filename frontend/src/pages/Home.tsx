import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger, SidebarSeparator, SidebarFooter } from "@/components/ui/sidebar";
import { Phone, User, LayoutDashboard, LogOut, Home as HomeIcon, ShieldCheck, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-border/40 bg-card/50 backdrop-blur-xl">
        <SidebarHeader className="h-16 flex items-center justify-between border-b border-border/40 px-4">
          <div className="flex items-center gap-2 font-bold text-lg text-primary">
            <div className="bg-primary/10 p-1.5 rounded-lg">
              <Phone className="h-5 w-5" />
            </div>
            <span className="group-data-[collapsible=icon]:hidden">Call Companion</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/")}
                  isActive={location.pathname === "/"}
                  tooltip="Overview"
                >
                  <HomeIcon />
                  <span>Overview</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/calling")}
                  isActive={location.pathname === "/calling"}
                  tooltip="Calling Dashboard"
                >
                  <LayoutDashboard />
                  <span>Calling Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/profile")}
                  isActive={location.pathname === "/profile"}
                  tooltip="Profile"
                >
                  <User />
                  <span>Profile</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-border/40 p-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={logout} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                <LogOut />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Quick Action: Calling */}
            <Card
              className="col-span-1 lg:col-span-2 group relative overflow-hidden transition-all hover:shadow-lg border-border/50 bg-card/60 backdrop-blur-md cursor-pointer hover:border-primary/50"
              onClick={() => navigate("/calling")}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutDashboard className="h-5 w-5 text-primary" />
                  Calling Dashboard
                </CardTitle>
                <CardDescription>Manage spreadsheets and start calling customers.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-sm text-muted-foreground">Go to dashboard</div>
                  <Button variant="ghost" size="icon" className="group-hover:translate-x-1 transition-transform">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Action: Profile */}
            <Card
              className="col-span-1 group relative overflow-hidden transition-all hover:shadow-lg border-border/50 bg-card/60 backdrop-blur-md cursor-pointer hover:border-blue-500/50"
              onClick={() => navigate("/profile")}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-500" />
                  Profile Settings
                </CardTitle>
                <CardDescription>Update your password and account info.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-sm text-muted-foreground">Manage profile</div>
                  <Button variant="ghost" size="icon" className="group-hover:translate-x-1 transition-transform">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Stats / Info Card */}
            <Card className="col-span-1 group relative overflow-hidden border-border/50 bg-card/60 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  System Status
                </CardTitle>
                <CardDescription>All systems operational.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-emerald-500 font-medium">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Online
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
