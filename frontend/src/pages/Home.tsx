import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, User, ArrowRight, LayoutDashboard, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const Home = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-soft-light pointer-events-none"></div>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 dark:bg-black/20 backdrop-blur-xl px-4 py-3 shadow-sm transition-all duration-300">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary to-blue-600 p-2 rounded-xl shadow-lg shadow-primary/20">
              <Phone className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground dark:text-white">Call Companion</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="hidden md:flex items-center gap-2 mr-2 px-3 py-1.5 bg-secondary/50 dark:bg-white/5 rounded-full border border-border/50 dark:border-white/10 backdrop-blur-md">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground/90 dark:text-white/90">{user?.username}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-destructive transition-colors">
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 relative z-10">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center justify-center px-4 py-1.5 mb-6 rounded-full bg-primary/10 text-primary text-sm font-medium ring-1 ring-primary/20 shadow-[0_0_20px_-5px_var(--primary)]">
            Welcome to your dashboard
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground dark:text-white mb-6">
            {getTimeGreeting()}, <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">{user?.username}</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Streamline your customer interactions, manage your spreadsheets, and track your progress all in one place.
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto animate-fade-in-up">

          {/* Calling Module Card */}
          <Card
            className="group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 border-border/50 dark:border-white/10 bg-card/60 dark:bg-card/40 backdrop-blur-md cursor-pointer hover:-translate-y-1 lg:col-span-2"
            onClick={() => navigate("/calling")}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="bg-primary/10 p-3 rounded-2xl group-hover:bg-primary/20 transition-colors">
                  <LayoutDashboard className="h-6 w-6 text-primary" />
                </div>
                <div className="p-2 rounded-full bg-background/50 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <CardTitle className="mt-4 text-2xl">Calling Dashboard</CardTitle>
              <CardDescription className="text-base">
                Access your spreadsheets, manage customer lists, and start your calling sessions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-32 rounded-xl bg-gradient-to-br from-background/50 to-background/20 dark:from-black/20 dark:to-black/5 border border-border/10 dark:border-white/5 flex items-center justify-center relative overflow-hidden group-hover:border-primary/20 transition-colors">
                {/* Abstract visual for dashboard preview */}
                <div className="absolute inset-x-4 top-4 bottom-0 bg-background dark:bg-card rounded-t-lg shadow-lg opacity-80 translate-y-2 group-hover:translate-y-0 transition-transform duration-500 flex flex-col gap-2 p-3">
                  <div className="h-4 w-1/3 bg-muted rounded-md" />
                  <div className="h-2 w-full bg-muted/50 rounded-md" />
                  <div className="h-2 w-2/3 bg-muted/50 rounded-md" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Card */}
          <Card
            className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 border-border/50 dark:border-white/10 bg-card/60 dark:bg-card/40 backdrop-blur-md cursor-pointer hover:-translate-y-1"
            onClick={() => navigate("/profile")}
          >
            <CardHeader>
              <div className="bg-blue-500/10 p-3 rounded-2xl w-fit mb-4 group-hover:bg-blue-500/20 transition-colors">
                <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle>My Profile</CardTitle>
              <CardDescription>
                Manage your account settings and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-3 mt-4">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-none">{user?.username}</span>
                  <span className="text-xs text-muted-foreground mt-1">View details &rarr;</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security / Extra Card */}
          <Card
            className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-green-500/10 border-border/50 dark:border-white/10 bg-card/60 dark:bg-card/40 backdrop-blur-md cursor-pointer hover:-translate-y-1 md:col-span-2 lg:col-span-3"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/10 p-2 rounded-xl group-hover:bg-emerald-500/20 transition-colors">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Security & Privacy</CardTitle>
                  <CardDescription>Your data is encrypted and secure.</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

        </div>
      </main>
    </div>
  );
};

export default Home;
