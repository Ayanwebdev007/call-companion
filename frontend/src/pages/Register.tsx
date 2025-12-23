import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Phone } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/register`, { username, password });
      login(res.data.token, res.data.user);
      toast({
        title: "Success",
        description: "Account created successfully",
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
        <div className="absolute inset-0 bg-gradient-to-bl from-primary via-purple-900 to-background opacity-90" />
        <div className="relative z-10 flex flex-col items-center justify-center p-16 text-center max-w-2xl animate-fade-in">
          <div className="w-24 h-24 bg-white/10 backdrop-blur-2xl rounded-3xl flex items-center justify-center mb-8 shadow-2xl ring-1 ring-white/20">
            <Phone className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-5xl font-bold mb-6 text-white tracking-tight leading-tight">Join the<br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200">community</span></h2>
          <p className="text-xl text-blue-100/80 leading-relaxed">
            Create an account today and start organizing your customer calls like a pro.
          </p>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/40 rounded-full blur-[120px] mix-blend-screen animate-pulse-soft" />
      </div>

      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="mx-auto grid w-full max-w-[400px] gap-6 animate-fade-in-up relative z-10">
          <div className="flex flex-col items-center gap-2 text-center mb-6">
            <div className="p-4 bg-primary/10 rounded-2xl ring-1 ring-white/10 shadow-xl backdrop-blur-3xl mb-4 animate-pulse-soft">
              <Phone className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white">Create an account</h1>
            <p className="text-muted-foreground text-lg">
              Enter your information to get started
            </p>
          </div>
          <Card className="border border-white/10 shadow-2xl bg-black/40 backdrop-blur-xl">
            <CardContent className="pt-8 px-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid w-full items-center gap-4">
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="username" className="text-base text-gray-300">Username</Label>
                    <Input
                      id="username"
                      placeholder="Choose a username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-primary/50 transition-all"
                    />
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="password" className="text-base text-gray-300">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Choose a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-primary/50 transition-all"
                    />
                  </div>
                  <Button className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/25 mt-2" type="submit" disabled={loading}>
                    {loading ? "Creating account..." : "Sign Up"}
                  </Button>
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center border-t border-white/5 p-6 bg-white/5">
              <p className="text-sm text-gray-400">
                Already have an account? <Link to="/login" className="text-primary hover:text-primary/80 hover:underline font-semibold transition-colors">Login</Link>
              </p>
            </CardFooter>
          </Card>
        </div>

        {/* Abstract Background Shapes for Form Side */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-0 pointer-events-none opacity-20">
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/30 rounded-full blur-[100px]" />
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px]" />
        </div>
      </div>
    </div>
  );
};

export default Register;