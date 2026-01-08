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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Login = () => {
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
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, { email, password });
      login(res.data.token, res.data.user);
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
      navigate('/');
    } catch (err: unknown) {
      let errorMessage = "Login failed";
      if (axios.isAxiosError(err)) {
        errorMessage = err.response?.data?.message || err.message || "Login failed";
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
    <div className="min-h-screen grid lg:grid-cols-2 bg-background overflow-hidden">
      {/* Left Side - Login Form */}
      <div className="relative flex flex-col justify-center items-center p-8 lg:p-12 animate-fade-in z-10 w-full max-w-xl mx-auto lg:max-w-none">

        <div className="absolute top-4 right-4 z-50">
          <ThemeToggle />
        </div>

        <div className="mx-auto grid w-full max-w-[400px] gap-6 animate-fade-in-up relative z-10">
          <div className="flex flex-col items-center gap-2 text-center mb-6">
            <div className="p-4 bg-primary/10 rounded-2xl ring-1 ring-primary/20 shadow-xl backdrop-blur-3xl mb-4 animate-pulse-soft">
              <Phone className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Welcome back</h1>
            <p className="text-muted-foreground text-lg">
              Enter your credentials to access your account
            </p>
          </div>
          <Card className="border border-border/50 dark:border-white/10 shadow-2xl bg-card/60 dark:bg-black/40 backdrop-blur-xl">
            <CardContent className="pt-8 px-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid w-full items-center gap-4">
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="email" className="text-base text-foreground/80 dark:text-gray-300">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 bg-background/50 dark:bg-white/5 border-input dark:border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground focus-visible:ring-primary/50 transition-all"
                    />
                  </div>
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-base text-foreground/80 dark:text-gray-300">Password</Label>
                      <Link
                        to="/forgot-password"
                        className="text-sm font-semibold text-primary hover:text-primary/80 hover:underline transition-all"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 bg-background/50 dark:bg-white/5 border-input dark:border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground focus-visible:ring-primary/50 transition-all"
                    />
                  </div>
                </div>
                <Button
                  className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all active:scale-95 bg-primary hover:bg-primary/90 text-primary-foreground"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </div>
                  ) : "Sign in"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pb-8 pt-2">
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50 dark:border-white/10"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card dark:bg-transparent px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/register" className="font-semibold text-primary hover:text-primary/80 hover:underline transition-all">
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>

        {/* Abstract Background Shapes for Form Side */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-0 pointer-events-none opacity-20">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/30 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px]" />
        </div>
      </div>

      {/* Right Side - Hero Image/Abstract */}
      <div className="hidden lg:relative lg:flex lg:flex-col lg:items-center lg:justify-center overflow-hidden bg-muted/20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-slate-900 to-background opacity-90" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>

        {/* Abstract Shapes */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/40 rounded-full blur-[120px] mix-blend-screen animate-pulse-soft" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[100px] mix-blend-screen animate-pulse-soft animation-delay-2000" />

        <div className="relative z-10 flex flex-col items-center justify-center p-16 text-center max-w-2xl animate-fade-in">
          <h2 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60 mb-6 drop-shadow-sm">
            Manage your calls with elegance
          </h2>
          <p className="text-xl text-white/80 leading-relaxed font-light">
            Streamline your customer outreach in a beautiful, distraction-free environment designed for productivity.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;