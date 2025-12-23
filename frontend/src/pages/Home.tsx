import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger, SidebarSeparator, SidebarFooter } from "@/components/ui/sidebar";
import { Phone, User, LayoutDashboard, LogOut, Home as HomeIcon, ArrowRight } from "lucide-react";
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

          <div className="grid grid-cols-1">
            {/* Quick Action: Calling */}
            <Card
              className="group relative overflow-hidden transition-all hover:shadow-2xl border-border/50 bg-card/60 backdrop-blur-md cursor-pointer hover:border-primary/50 max-w-md"
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
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Home;
