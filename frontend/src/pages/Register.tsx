import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Phone } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import axios from 'axios';

import { API_BASE_URL } from '../lib/api';

const Register = () => {
  const [businessName, setBusinessName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/register`, { businessName, adminName, email, password });
      login(res.data.token, res.data.user);
      toast({
        title: "Success",
        description: "Business account created successfully",
      });
      navigate('/');
    } catch (err: unknown) {
      let errorMessage = "Registration failed";
      if (axios.isAxiosError(err)) {
        errorMessage = err.response?.data?.message || err.message || "Registration failed";
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 bg-background">
      <div className="hidden lg:relative lg:flex lg:flex-col lg:items-center lg:justify-center overflow-hidden bg-muted/20">
        <div className="absolute inset-0 bg-gradient-to-bl from-primary via-slate-900 to-background opacity-90" />
        <div className="relative z-10 flex flex-col items-center justify-center p-16 text-center max-w-2xl animate-fade-in">
          <h2 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 mb-6 drop-shadow-sm">
            Start your business journey
          </h2>
          <p className="text-xl text-white/80 leading-relaxed font-light">
            Join thousands of businesses who have transformed their workflow.
          </p>
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="relative flex flex-col justify-center items-center p-6 lg:p-8 animate-fade-in z-10 w-full max-w-xl mx-auto lg:max-w-none">

        <div className="absolute top-4 right-4 z-50">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-[350px] space-y-6 animate-fade-in-up">
          <div className="flex flex-col items-center gap-2 text-center mb-4">
            <div className="p-3 bg-primary/10 rounded-2xl ring-1 ring-primary/20 shadow-xl backdrop-blur-3xl mb-2 animate-pulse-soft">
              <Phone className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Create Business Account</h1>
            <p className="text-muted-foreground text-sm">
              Set up your organization efficiently
            </p>
          </div>

          <Card className="border border-border/50 dark:border-white/10 shadow-2xl bg-card/60 dark:bg-black/40 backdrop-blur-xl">
            <CardContent className="pt-6 px-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid w-full items-center gap-3">
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="businessName" className="text-sm text-foreground/80 dark:text-gray-300">Business Name</Label>
                    <Input
                      id="businessName"
                      placeholder="My Company"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      required
                      className="h-10 bg-background/50 dark:bg-white/5 border-input dark:border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground focus-visible:ring-primary/50 transition-all font-medium"
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="adminName" className="text-sm text-foreground/80 dark:text-gray-300">Admin Name</Label>
                    <Input
                      id="adminName"
                      placeholder="Your Name"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      required
                      className="h-10 bg-background/50 dark:bg-white/5 border-input dark:border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground focus-visible:ring-primary/50 transition-all font-medium"
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="email" className="text-sm text-foreground/80 dark:text-gray-300">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-10 bg-background/50 dark:bg-white/5 border-input dark:border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground focus-visible:ring-primary/50 transition-all font-medium"
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="password" className="text-sm text-foreground/80 dark:text-gray-300">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Choose a secure password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-10 bg-background/50 dark:bg-white/5 border-input dark:border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground focus-visible:ring-primary/50 transition-all font-medium"
                    />
                  </div>
                </div>
                <Button
                  className="w-full h-10 text-sm font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all active:scale-95 bg-primary hover:bg-primary/90 text-primary-foreground"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating business...</span>
                    </div>
                  ) : "Create Account"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pb-6 pt-2">

              <p className="text-center text-xs text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-primary hover:text-primary/80 hover:underline transition-all">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Register;