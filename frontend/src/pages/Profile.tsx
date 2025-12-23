import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { changePassword } from "@/lib/api";
import { User, ArrowLeft, Shield, KeyRound, Check, LogOut, Mail } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-soft-light pointer-events-none"></div>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 dark:bg-black/20 backdrop-blur-xl px-4 py-3 shadow-sm transition-all duration-300">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="hover:bg-accent/10 dark:hover:bg-white/10 text-foreground/80 hover:text-foreground dark:text-white/80 dark:hover:text-white rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="bg-gradient-to-br from-primary to-blue-600 p-2 rounded-xl shadow-lg shadow-primary/20">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground dark:text-white">Profile</h1>
              <p className="text-xs text-muted-foreground">Manage your account</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-destructive transition-colors">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 relative z-10">
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">

          {/* Profile Header Card */}
          <Card className="border-border/50 dark:border-white/10 bg-card/60 dark:bg-card/40 backdrop-blur-md overflow-hidden animate-fade-in-up">
            <div className="h-32 bg-gradient-to-r from-primary/20 via-blue-500/20 to-purple-500/20 dark:from-primary/10 dark:to-blue-500/10" />
            <CardContent className="relative px-8 pb-8">
              <div className="absolute -top-16 left-8">
                <div className="h-32 w-32 rounded-full border-4 border-background dark:border-[#09090b] shadow-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-5xl font-bold">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="ml-40 pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground dark:text-white">{user?.username}</h2>
                  <p className="text-muted-foreground flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4" />
                    username@{user?.username}.com {/* Mock email if not available */}
                  </p>
                </div>
                <Button variant="outline" className="border-primary/20 hover:bg-primary/5 text-primary">
                  Edit Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Settings Sidebar (Visual only for now) */}
            <div className="space-y-4">
              <Card className="border-border/50 dark:border-white/10 bg-card/60 dark:bg-card/40 backdrop-blur-md p-4 space-y-1">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">Settings</h3>
                <Button variant="ghost" className="w-full justify-start text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary font-medium">
                  <Shield className="h-4 w-4 mr-2" />
                  Security
                </Button>
                <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground">
                  <User className="h-4 w-4 mr-2" />
                  Personal Info
                </Button>
                {/* Add more interactive tabs later */}
              </Card>
            </div>

            {/* Main Settings Content */}
            <div className="md:col-span-2 space-y-6">
              <Card className="border-border/50 dark:border-white/10 bg-card/60 dark:bg-card/40 backdrop-blur-md shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <KeyRound className="h-5 w-5 text-primary" />
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
                      className="bg-secondary/50 dark:bg-white/5 border-border/50 dark:border-white/10"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground/80">New Password</label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="bg-secondary/50 dark:bg-white/5 border-border/50 dark:border-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground/80">Confirm New Password</label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="bg-secondary/50 dark:bg-white/5 border-border/50 dark:border-white/10"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end pt-4 border-t border-border/10 dark:border-white/5">
                  <Button onClick={handleChangePassword} disabled={loading} className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[140px]">
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Updating...</span>
                      </div>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" /> update Password
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Profile;
