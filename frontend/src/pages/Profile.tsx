
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { changePassword, updateProfile, fetchBusiness, updateBusiness } from "@/lib/api";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { User, ArrowLeft, Shield, KeyRound, Check, LogOut, Mail, Phone, LayoutDashboard, Home as HomeIcon, Building2, MapPin, Globe, Smartphone } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import ConnectMobile from "@/components/ConnectMobile";
import { useEffect } from "react";

const Profile = () => {
  const { user, logout, login } = useAuth(); // Assuming login accepts user object/token to update context
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Security State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Personal Info State
  const [activeTab, setActiveTab] = useState<'security' | 'personal' | 'business' | 'mobile'>('personal');
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  // Business Info State
  const [businessInfo, setBusinessInfo] = useState({
    name: "",
    phone: "",
    address: "",
    logo: ""
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setEditName(user.username || ""); // user.username holds the Display Name because of backend key mapping
      setEditEmail(user.email || "");
      if (user.role === 'admin') {
        fetchBusinessData();
        setActiveTab('business');
      } else {
        setActiveTab('personal');
      }
    }
  }, [user]);

  const fetchBusinessData = async () => {
    try {
      const data = await fetchBusiness();
      setBusinessInfo({
        name: data.name || "",
        phone: data.contact?.phone || "",
        address: data.contact?.address || "",
        logo: data.logo || ""
      });
    } catch (e) {
      console.error("Failed to fetch business data", e);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editName || !editEmail) {
      toast({ title: "Name and email are required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await updateProfile(editName, editEmail);
      toast({ title: res.message });
      // Update local storage/context if the API returns the updated user
      // Ideally, the AuthContext should expose a method to update the user state without full login
      if (res.user) {
        // Force reload to reflect changes or assume context updates on next fetch
        // For now, simpler to alert user or rely on future re-fetch
      }
    } catch (e: any) {
      toast({
        title: "Failed to update profile",
        description: e.response?.data?.message || "An error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBusiness = async () => {
    setLoading(true);
    try {
      await updateBusiness({
        name: businessInfo.name,
        contact: {
          phone: businessInfo.phone,
          address: businessInfo.address
        },
        logo: businessInfo.logo
      });
      toast({ title: "Business settings updated successfully" });
    } catch (e: any) {
      toast({
        title: "Failed to update business profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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
    } catch (e: any) {
      toast({ title: "Failed to change password", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset className="bg-background relative overflow-hidden">
        {/* Background gradients */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-soft-light pointer-events-none"></div>

        <header className="sticky top-0 z-50 flex h-16 w-full items-center gap-4 border-b border-border/40 bg-background/60 backdrop-blur-xl px-4 shadow-sm">
          <SidebarTrigger />
          <div className="flex-1">
            <h1 className="text-lg font-semibold">{user?.role === 'admin' ? 'Business Profile' : 'Profile Settings'}</h1>
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
                    <h2 className="text-2xl font-bold text-foreground">
                      {user?.role === 'admin' ? (businessInfo.name || user?.username) : user?.username}
                    </h2>
                    <p className="text-muted-foreground flex items-center gap-2 mt-1">
                      <Mail className="h-4 w-4" />
                      {user?.email}
                    </p>
                  </div>
                  {user?.role === 'admin' && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="text-sm font-bold text-primary uppercase">Business Admin</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Settings Sidebar */}
              <div className="space-y-4">
                <Card className="border-border/50 bg-card/60 backdrop-blur-md p-4 space-y-1">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">Settings</h3>
                  {user?.role === 'admin' && (
                    <>
                      <Button
                        variant="ghost"
                        className={`w-full justify-start font-medium ${activeTab === 'business' ? 'text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setActiveTab('business')}
                      >
                        <Building2 className="h-4 w-4 mr-2" />
                        Business Info
                      </Button>
                      <Button
                        variant="ghost"
                        className={`w-full justify-start font-medium ${activeTab === 'security' ? 'text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setActiveTab('security')}
                      >
                        <KeyRound className="h-4 w-4 mr-2" />
                        Security
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    className={`w-full justify-start font-medium ${activeTab === 'personal' ? 'text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setActiveTab('personal')}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Personal Info
                  </Button>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start font-medium ${activeTab === 'mobile' ? 'text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setActiveTab('mobile')}
                  >
                    <Smartphone className="h-4 w-4 mr-2" />
                    Connect Mobile
                  </Button>
                </Card>
              </div>

              <div className="md:col-span-2 space-y-6">
                {activeTab === 'business' ? (
                  <Card className="border-border/50 bg-card/60 backdrop-blur-md shadow-lg">
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle>Business Information</CardTitle>
                      </div>
                      <CardDescription>
                        Manage your business details visible to your team.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground/80">Business Name</Label>
                        <Input
                          value={businessInfo.name}
                          onChange={(e) => setBusinessInfo({ ...businessInfo, name: e.target.value })}
                          placeholder="Enter business name"
                          className="bg-secondary/50 border-input"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground/80">Phone Number</Label>
                          <Input
                            value={businessInfo.phone}
                            onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })}
                            placeholder="+1 234 567 890"
                            className="bg-secondary/50 border-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-foreground/80">Address</Label>
                          <Input
                            value={businessInfo.address}
                            onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                            placeholder="City, Country"
                            className="bg-secondary/50 border-input"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground/80">Logo URL</Label>
                        <Input
                          value={businessInfo.logo}
                          onChange={(e) => setBusinessInfo({ ...businessInfo, logo: e.target.value })}
                          placeholder="https://example.com/logo.png"
                          className="bg-secondary/50 border-input"
                        />
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end pt-4 border-t border-border/10">
                      <Button onClick={handleUpdateBusiness} disabled={loading} className="bg-primary hover:bg-primary/90 min-w-[140px]">
                        {loading ? "Saving..." : (
                          <>
                            <Check className="h-4 w-4 mr-2" /> Save Business Profile
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                ) : activeTab === 'security' && user?.role === 'admin' ? (
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
                      <Button onClick={async () => {
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
                        } catch (e: any) {
                          toast({ title: "Failed to change password", variant: "destructive" });
                        } finally {
                          setLoading(false);
                        }
                      }} disabled={loading} className="bg-primary hover:bg-primary/90 min-w-[140px]">
                        {loading ? "Updating..." : (
                          <>
                            <Check className="h-4 w-4 mr-2" /> Update Password
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                ) : activeTab === 'mobile' ? (
                  <ConnectMobile />
                ) : (
                  <Card className="border-border/50 bg-card/60 backdrop-blur-md shadow-lg">
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle>Personal Information</CardTitle>
                      </div>
                      <CardDescription>
                        Update your personal details.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground/80">Name</label>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-secondary/50 border-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground/80">Email</label>
                        <Input
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="bg-secondary/50 border-input"
                        />
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end pt-4 border-t border-border/10">
                      <Button onClick={handleUpdateProfile} disabled={loading} className="bg-primary hover:bg-primary/90 min-w-[140px]">
                        {loading ? "Saving..." : (
                          <>
                            <Check className="h-4 w-4 mr-2" /> Save Changes
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                )}
              </div>
            </div>

          </div>
        </main>
      </SidebarInset >
    </SidebarProvider >
  );
};

export default Profile;

