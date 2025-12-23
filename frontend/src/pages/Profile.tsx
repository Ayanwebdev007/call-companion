
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { changePassword } from "@/lib/api";
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger, SidebarSeparator, SidebarFooter } from "@/components/ui/sidebar";
import { User, ArrowLeft, Shield, KeyRound, Check, LogOut, Mail, Phone, LayoutDashboard, Home as HomeIcon } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: "Fill all fields", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await changePassword(currentPassword, newPassword);
      toast({ title: res.message });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      toast({ title: "Failed to change password", variant: "destructive" });
    } finally {
      setLoading(false);
    }
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
        {/* Background gradients */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-soft-light pointer-events-none"></div>

        <header className="sticky top-0 z-50 flex h-16 w-full items-center gap-4 border-b border-border/40 bg-background/60 backdrop-blur-xl px-4 shadow-sm">
          <SidebarTrigger />
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Profile Settings</h1>
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
          <div className="max-w-4xl mx-auto space-y-8">

            {/* Profile Header Card */}
            <Card className="border-border/50 bg-card/60 backdrop-blur-md overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-primary/20 via-blue-500/20 to-cyan-500/20" />
              <CardContent className="relative px-8 pb-8">
                <div className="absolute -top-16 left-8">
                  <div className="h-32 w-32 rounded-full border-4 border-background shadow-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-5xl font-bold">
                    {user?.username?.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="ml-40 pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{user?.username}</h2>
                    <p className="text-muted-foreground flex items-center gap-2 mt-1">
                      <Mail className="h-4 w-4" />
                      username@{user?.username}.com
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Settings Sidebar (Visual only for now) */}
              <div className="space-y-4">
                <Card className="border-border/50 bg-card/60 backdrop-blur-md p-4 space-y-1">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">Settings</h3>
                  <Button variant="ghost" className="w-full justify-start text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary font-medium">
                    <KeyRound className="h-4 w-4 mr-2" />
                    Security
                  </Button>
                  <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground">
                    <User className="h-4 w-4 mr-2" />
                    Personal Info
                  </Button>
                </Card>
              </div>

              {/* Main Settings Content */}
              <div className="md:col-span-2 space-y-6">
                <Card className="border-border/50 bg-card/60 backdrop-blur-md shadow-lg">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle>Password & Security</CardTitle>
                    </div>
                    <CardDescription>
                      Update your password to keep your account secure.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground/80">Current Password</label>
                      <Input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="bg-secondary/50 border-input"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground/80">New Password</label>
                        <Input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="bg-secondary/50 border-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground/80">Confirm New Password</label>
                        <Input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="bg-secondary/50 border-input"
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end pt-4 border-t border-border/10">
                    <Button onClick={handleChangePassword} disabled={loading} className="bg-primary hover:bg-primary/90 min-w-[140px]">
                      {loading ? "Updating..." : (
                        <>
                          <Check className="h-4 w-4 mr-2" /> Update Password
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>

          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Profile;

